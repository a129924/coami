"""Experiment-local wire contract; no framework types cross into the MOD."""

import base64
import binascii
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Token(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    session_id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    run_seq: int = Field(ge=1)


class TurnRequest(Token):
    context_id: Literal["clear", "ambiguous"]
    audio_mime: Literal[
        "audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"
    ]
    audio_filename: str = Field(
        min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_.-]+$"
    )
    audio_base64: str = Field(min_length=1, max_length=2796204)

    @field_validator("audio_base64")
    @classmethod
    def valid_audio(cls, value: str) -> str:
        try:
            data = base64.b64decode(value, validate=True)
        except (ValueError, binascii.Error) as error:
            raise ValueError("invalid base64") from error
        if not 0 < len(data) <= 2 * 1024 * 1024:
            raise ValueError("audio must contain 1..2097152 bytes")
        return value


class TtsCheckRequest(Token):
    phrase_id: Literal["A", "B"]


class Decision(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    kind: Literal["reply", "clarify"]
    text: str = Field(min_length=1, max_length=40)

    @field_validator("text")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("blank decision")
        return value


class TurnResponse(Token):
    transcript: str
    decision: Decision
    audio_mime: Literal["audio/wav"] = "audio/wav"
    audio_base64: str
    evidence: list[dict[str, str]]


class TtsCheckResponse(Token):
    audio_mime: Literal["audio/wav"] = "audio/wav"
    audio_base64: str
    evidence: list[dict[str, str]]
