"""Run only on loopback. Ambient OPENAI_API_KEY is supported; .env is NOT auto-loaded."""

import asyncio
import base64
import json
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime
from pathlib import Path
from typing import cast

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import ValidationError

from contexts import CONTEXTS, PHRASES
from models import Token, TtsCheckRequest, TtsCheckResponse, TurnRequest, TurnResponse
from providers import OpenAIProvider, ProviderError


class Budget:
    """Live-process budget survives browser reload and server restart; tests use memory."""

    def __init__(self, path: Path | None = None) -> None:
        self.path = path
        self.count = 0
        self.started = str(datetime.now(UTC).date())
        if path and path.exists():
            value: object = json.loads(path.read_text())
            if not isinstance(value, dict):
                raise ValueError("invalid budget ledger")
            # JSON object keys are strings; the dict shape was checked above.
            ledger = cast(
                dict[str, object], value
            )  # JSON object checked above; values validated below.
            count = ledger.get("count")
            started = ledger.get("started")
            if (
                not isinstance(count, int)
                or not 0 <= count <= 20
                or not isinstance(started, str)
            ):
                raise ValueError("invalid budget ledger")
            self.count, self.started = count, started

    def accept(self) -> None:
        if self.count >= 20 or self.started != str(datetime.now(UTC).date()):
            raise HTTPException(
                429, "experiment operation/day limit reached; return to planning"
            )
        self.count += 1
        if self.path:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix(".tmp")
            temporary.write_text(
                json.dumps({"count": self.count, "started": self.started})
            )
            temporary.replace(self.path)


def create_app(
    provider: OpenAIProvider | None = None, budget: Budget | None = None
) -> FastAPI:
    current = provider
    busy = False
    seen: set[tuple[str, int]] = set()
    limits = budget or Budget()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        nonlocal current
        async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
            if current is None:
                current = OpenAIProvider(client, os.environ.get("OPENAI_API_KEY", ""))
            yield
        current = provider

    app = FastAPI(lifespan=lifespan)

    def enter(token: Token) -> OpenAIProvider:
        nonlocal busy
        if datetime.now(UTC).date() >= date(2027, 1, 6):
            raise HTTPException(503, "locked TTS retired; return to planning")
        if current is None or not current.key:
            raise HTTPException(
                503, "OPENAI_API_KEY is missing or empty in server environment"
            )
        if busy or (token.session_id, token.run_seq) in seen:
            raise HTTPException(409, "busy or duplicate operation")
        limits.accept()
        seen.add((token.session_id, token.run_seq))
        busy = True
        current.evidence = []
        return current

    @app.post("/turn", response_model=TurnResponse)
    async def turn(request: TurnRequest) -> TurnResponse:
        nonlocal busy
        upstream = enter(request)
        try:
            async with asyncio.timeout(30):
                transcript = await upstream.transcribe(
                    request.audio_filename,
                    base64.b64decode(request.audio_base64),
                    request.audio_mime,
                )
                decision = await upstream.generate(
                    CONTEXTS[request.context_id], transcript
                )
                audio = await upstream.speak(decision.text)
            return TurnResponse(
                session_id=request.session_id,
                run_seq=request.run_seq,
                transcript=transcript,
                decision=decision,
                audio_base64=base64.b64encode(audio).decode(),
                evidence=upstream.evidence.copy(),
            )
        except TimeoutError as error:
            raise HTTPException(504, "provider pipeline deadline exceeded") from error
        except (ProviderError, httpx.HTTPError, ValueError, ValidationError) as error:
            raise HTTPException(
                502, "provider pipeline failed; no retry or fallback"
            ) from error
        finally:
            busy = False

    @app.post("/tts-check", response_model=TtsCheckResponse)
    async def tts_check(request: TtsCheckRequest) -> TtsCheckResponse:
        nonlocal busy
        upstream = enter(request)
        try:
            async with asyncio.timeout(30):
                audio = await upstream.speak(PHRASES[request.phrase_id])
            return TtsCheckResponse(
                session_id=request.session_id,
                run_seq=request.run_seq,
                audio_base64=base64.b64encode(audio).decode(),
                evidence=upstream.evidence.copy(),
            )
        except TimeoutError as error:
            raise HTTPException(504, "provider pipeline deadline exceeded") from error
        except (ProviderError, httpx.HTTPError, ValueError) as error:
            raise HTTPException(502, "TTS failed; no retry or fallback") from error
        finally:
            busy = False

    return app


app = create_app(budget=Budget(Path(__file__).parent / "build" / "budget.json"))
