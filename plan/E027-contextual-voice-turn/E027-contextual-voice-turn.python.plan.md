# E027 Python implementation contract

## Goal
Provide the bounded /turn and /tts-check server for the approved contextual voice experiment.
## Non-goals
No production changes, new scenario, provider fallback, dotenv autoload or configurable models/timeouts/caps.
## Current Context
E007/E018 lack integrated ASR/context generation/Chinese speech. Standalone experimental service, fixed contexts and typed HTTP boundary.
## Requirements
Same session_id/run_seq returned; raw audio only memory; decoded≤2MiB; fixed models; ≤30s provider pipeline; one client lifespan; single flight; 20 accepted server operations and no retries; credential only from server process.
## Decisions
- Async-planning status: triggered — HTTP external I/O, AsyncClient lifecycle, deadline and cancellation introduced by approved voice plan.
- Module/package placement: experiments/E027-contextual-voice-turn/server.
- New public API: POST /turn and POST /tts-check; see topic plan/models.py for explicit wire fields.
- Interface changes: experiment-local only, no existing caller changes.
- Breaking changes allowed: no.
- New dependencies: Python3.12, FastAPI0.141.1,httpx0.28.1,uvicorn0.53.0; exact transitive lock.
- Error handling strategy: validation422,busy/replay409,missing key/retired503,provider502,deadline504,budget429; no empty success.
- Typing strategy: Pydantic boundary models, fully annotated production methods; no unconstrained Any. JSON ledger cast justified after shape check and validated values.
### Async boundary decision
One async request owns serial ASR→generation→TTS; only tts-check skips ASR/generation. No detached jobs.
### Resource lifecycle decision
Lifespan owns one AsyncClient, always closes; no credential/body persisted. Persistent ignored budget ledger is experiment metadata, not audio.
### Concurrency model
Exactly one loopback worker, boolean single-flight acquired synchronously before first await; duplicate token remembered. No queue/group concurrency.
### Failure model
Preserve status classes without logging credential/provider body; missing key forbids provider calls. Malformed JSON is a provider failure.
### Cancellation / timeout policy
asyncio.timeout(30) encloses entire pipeline; finally releases busy on cancellation/error. Client timeout30, no retry. Aborting local request does not guarantee cloud stopped.
### Validation plan
HTTP MockTransport/ASGI in-memory tests only for pipeline order/context/response/missing key/malformed response/input/busy/cancel/timeouts/budget. No actual cloud calls. Ruff/Pyright strict; live model availability and human trials separately pending.
### Handoff notes for the implementer
Do not send expected branch to model; never hardcode semantic answer; no model substitutions. .env.example is only OPENAI_API_KEY= newline, no dotenv loading claim. Server process may receive ambient key but no secret file is read by this agent.
## Public Contract / API Changes
models.Token,TurnRequest,TtsCheckRequest,Decision,TurnResponse,TtsCheckResponse; async handlers and provider methods are experiment-only. Missing/malformed audio422; additional unknown fields forbidden. Response includes model/request IDs when returned.
## Affected Files / Modules
Likely affected files: server/app.py,models.py,contexts.py,providers.py,pyproject.toml,uv.lock,.env.example,tests/test_turn.py. Candidate sources inspected: E023 server configuration and approved topic plan. Other Python sources readonly.
## Implementation Steps
1. Add typed request/response and fixed contexts in models.py/contexts.py.
2. Add fixed model HTTP pipeline in providers.py and serial ownership/budget/lifespan in app.py.
3. Add tests/test_turn.py and config/lock/empty env template; record tooling evidence. These refine topic S1, not a second independent topic.
## Test Plan
Happy: actual mock inputs/context propagated, reply audio matched. Invalid: empty/bad base64/context/MIME and malformed provider JSON. Edge: missing key,busy,cancellation,deadline,budget/replay. Regression: failure before transport must not invoke provider. Backward compatibility N/A: isolated new API, no existing callers.
## Validation Commands
In server/: .venv/bin/python -m pytest -q; .venv/bin/ruff check .; .venv/bin/pyright. uv sync --locked creates feature-local environment. No real API call in automated tests.
## Risks
Fresh native integration and Chinese ASR/TTS remain unverified; aliases/account access may differ. TTS stops on2027-01-06; no fallback. Use one worker to preserve process admission semantics.
## Rollback Plan
Revert E027 topic paths via normal new commit; do not delete historical evidence or other topics. No production source changed.
## Open Questions
Actual account/model access and live voice acceptance require later human-run evidence. No contract-critical implementation choice remains open; dotenv loading intentionally excluded.
