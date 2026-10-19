"""Direct HTTP adapters; fixed models, no retries and no credentials in evidence."""

import hashlib
import json

import httpx
from pydantic import BaseModel, ValidationError

from contexts import INSTRUCTIONS
from models import Decision

ASR_MODEL = "gpt-transcribe"
GENERATION_MODEL = "gpt-6-luna"
TTS_MODEL = "gpt-4o-mini-tts-2025-12-15"


class ProviderError(Exception):
    pass


class TextContent(BaseModel):
    type: str
    text: str = ""


class OutputItem(BaseModel):
    content: list[TextContent] = []


class Generated(BaseModel):
    model: str = ""
    output: list[OutputItem] = []


class ProviderMetadata(BaseModel):
    model: str = ""


class Transcribed(BaseModel):
    text: str
    model: str = ""


class OpenAIProvider:
    def __init__(self, client: httpx.AsyncClient, key: str) -> None:
        self.client = client
        self.key = key.strip()
        self.evidence: list[dict[str, str]] = []

    async def post(
        self,
        path: str,
        model: str,
        *,
        body: dict[str, object] | None = None,
        audio: tuple[str, bytes, str] | None = None,
    ) -> httpx.Response:
        if not self.key:
            raise ProviderError("missing server credential")
        headers = {"Authorization": f"Bearer {self.key}"}
        if audio is not None:
            response = await self.client.post(
                "https://api.openai.com/v1/" + path,
                headers=headers,
                data={"model": model, "response_format": "json"},
                files={"file": audio},
            )
        else:
            response = await self.client.post(
                "https://api.openai.com/v1/" + path, headers=headers, json=body
            )
        if not response.is_success:
            raise ProviderError(f"{path}: HTTP {response.status_code}")
        returned = ""
        if "application/json" in response.headers.get("content-type", ""):
            returned = ProviderMetadata.model_validate(response.json()).model
        self.evidence.append(
            {
                "stage": path,
                "requested_model": model,
                "returned_model": returned,
                "request_id": response.headers.get("x-request-id", ""),
            }
        )
        return response

    async def transcribe(self, filename: str, audio: bytes, mime: str) -> str:
        response = await self.post(
            "audio/transcriptions", ASR_MODEL, audio=(filename, audio, mime)
        )
        value = Transcribed.model_validate(response.json()).text
        if not value.strip():
            raise ProviderError("empty transcript")
        return value

    async def generate(self, context: str, transcript: str) -> Decision:
        prompt = f"情境：{context}\n孩子說：{transcript}"
        body: dict[str, object] = {
            "model": GENERATION_MODEL,
            "instructions": INSTRUCTIONS,
            "input": prompt,
            "store": False,
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "voice_decision",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "kind": {"type": "string", "enum": ["reply", "clarify"]},
                            "text": {"type": "string"},
                        },
                        "required": ["kind", "text"],
                        "additionalProperties": False,
                    },
                }
            },
        }
        response = await self.post("responses", GENERATION_MODEL, body=body)
        outputs = Generated.model_validate(response.json())
        texts = [
            c.text
            for item in outputs.output
            for c in item.content
            if c.type == "output_text"
        ]
        if len(texts) != 1:
            raise ProviderError("missing or multiple generated outputs")
        self.evidence[-1]["prompt_sha256"] = hashlib.sha256(
            (INSTRUCTIONS + prompt).encode()
        ).hexdigest()
        try:
            return Decision.model_validate(json.loads(texts[0]))
        except (ValueError, ValidationError) as error:
            raise ProviderError("invalid structured decision") from error

    async def speak(self, text: str) -> bytes:
        response = await self.post(
            "audio/speech",
            TTS_MODEL,
            body={
                "model": TTS_MODEL,
                "voice": "coral",
                "input": text,
                "response_format": "wav",
            },
        )
        audio = response.content
        if len(audio) < 44 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
            raise ProviderError("invalid WAV response")
        return audio
