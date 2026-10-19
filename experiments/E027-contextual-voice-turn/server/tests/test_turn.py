import asyncio
import base64
import json

import httpx
import pytest

from app import create_app
from providers import OpenAIProvider

WAV = b"RIFF" + (40).to_bytes(4, "little") + b"WAVE" + b"\0" * 40
TOKEN = {"session_id": "test-session", "run_seq": 1}


def payload():
    return {
        **TOKEN,
        "context_id": "clear",
        "audio_mime": "audio/webm",
        "audio_filename": "recording.webm",
        "audio_base64": base64.b64encode(b"voice").decode(),
    }


def test_pipeline_and_context_are_real_inputs():
    calls = []

    def respond(request):
        calls.append(request)
        if request.url.path.endswith("transcriptions"):
            return httpx.Response(
                200,
                json={"text": "我想要車車", "model": "asr-returned"},
                headers={"x-request-id": "asr-id"},
            )
        if request.url.path.endswith("responses"):
            body = json.loads(request.content)
            assert "紅色玩具車" in body["input"]
            assert "我想要車車" in body["input"]
            return httpx.Response(
                200,
                json={
                    "model": "generation-returned",
                    "output": [
                        {
                            "content": [
                                {
                                    "type": "output_text",
                                    "text": json.dumps(
                                        {
                                            "kind": "reply",
                                            "text": "一起玩紅色玩具車吧！",
                                        }
                                    ),
                                }
                            ]
                        }
                    ],
                },
            )
        return httpx.Response(200, content=WAV)

    async def run():
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(respond)
        ) as provider_client:
            provider = OpenAIProvider(provider_client, "fake-key")
            app = create_app(provider=provider)
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                response = await client.post("/turn", json=payload())
                assert response.status_code == 200, response.text
                result = response.json()
                assert result["decision"]["kind"] == "reply"
                assert result["session_id"] == TOKEN["session_id"]
                assert result["audio_mime"] == "audio/wav"
                assert [c.url.path for c in calls] == [
                    "/v1/audio/transcriptions",
                    "/v1/responses",
                    "/v1/audio/speech",
                ]
                assert (await client.post("/turn", json=payload())).status_code == 409

    asyncio.run(run())


def test_missing_key_never_calls_provider():
    async def run():
        provider = OpenAIProvider(
            httpx.AsyncClient(
                transport=httpx.MockTransport(
                    lambda _: pytest.fail("unexpected network")
                )
            ),
            "",
        )
        app = create_app(provider=provider)
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            assert (
                await client.post("/tts-check", json={**TOKEN, "phrase_id": "A"})
            ).status_code == 503
        await provider.client.aclose()

    asyncio.run(run())


@pytest.mark.parametrize(
    "change",
    [
        {"audio_base64": ""},
        {"audio_base64": "!!!"},
        {"context_id": "other"},
        {"audio_mime": "text/html"},
    ],
)
def test_invalid_input_is_not_sent_to_cloud(change):
    async def run():
        app = create_app()
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            assert (
                await client.post("/turn", json={**payload(), **change})
            ).status_code == 422

    asyncio.run(run())


def test_busy_cancel_releases_slot_and_tts_never_transcribes():
    async def run():
        started, release = asyncio.Event(), asyncio.Event()

        async def handler(request):
            assert request.url.path == "/v1/audio/speech"
            started.set()
            await release.wait()
            return httpx.Response(200, content=WAV)

        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ) as upstream:
            app = create_app(provider=OpenAIProvider(upstream, "fake"))
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                first = asyncio.create_task(
                    client.post("/tts-check", json={**TOKEN, "phrase_id": "A"})
                )
                await started.wait()
                busy = await client.post(
                    "/tts-check", json={**TOKEN, "run_seq": 2, "phrase_id": "B"}
                )
                assert busy.status_code == 409
                first.cancel()
                with pytest.raises(asyncio.CancelledError):
                    await first
                release.set()
                assert (
                    await client.post(
                        "/tts-check", json={**TOKEN, "run_seq": 2, "phrase_id": "B"}
                    )
                ).status_code == 200

    asyncio.run(run())


def test_budget_has_no_reload_reset():
    from fastapi import HTTPException

    from app import Budget

    budget = Budget()
    for _ in range(20):
        budget.accept()
    with pytest.raises(HTTPException) as failure:
        budget.accept()
    assert failure.value.status_code == 429


def test_provider_failure_and_timeout_are_distinct_and_release_busy():
    async def run():
        count = 0

        async def handler(request):
            nonlocal count
            count += 1
            if count == 1:
                raise TimeoutError("synthetic deadline")
            return httpx.Response(503, json={"error": "synthetic provider unavailable"})

        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ) as upstream:
            app = create_app(provider=OpenAIProvider(upstream, "fake"))
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                assert (
                    await client.post("/tts-check", json={**TOKEN, "phrase_id": "A"})
                ).status_code == 504
                assert (
                    await client.post(
                        "/tts-check", json={**TOKEN, "run_seq": 2, "phrase_id": "B"}
                    )
                ).status_code == 502
                assert count == 2

    asyncio.run(run())


@pytest.mark.parametrize("invalid", [[], None, {"model": 42}])
def test_malformed_provider_json_is_classified(invalid):
    async def run():
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(lambda _: httpx.Response(200, json=invalid))
        ) as upstream:
            app = create_app(provider=OpenAIProvider(upstream, "fake"))
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                result = await client.post(
                    "/tts-check", json={**TOKEN, "phrase_id": "A"}
                )
                assert result.status_code == 502

    asyncio.run(run())
