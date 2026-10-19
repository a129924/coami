# E027 behavioral specification
## Acceptance Criteria
Exactly two precheck phrases and six fixed-context real adult voice runs; same SDK record→server→MOD→SDK play path. Human hearing, natural ended and per-run associations required. Missing prerequisites leave main unexecuted, not passed.
## Behavioral Scenarios
Given a unique red toy car context and 我想要車車, when real ASR/model processes that turn, then short reply acknowledges red toy car without promising an action.
Given toy and real car ambiguity and the same utterance, then one distinguishing question, no assumed selection. Each case independent, no memory or expected label supplied to model.
Given started playback, when it is interrupted/unknown, then unconfirmed and reload lock, no timer-based success. Given old token/reload, then no late playback. Given accepted operation, count it even when recording or upload fails, preserve cap across reload.
## Error / Edge Cases
Empty/malformed/>2MiB audio rejected; wrong context rejected. Missing server key no cloud call. busy409, pipeline timeout504, provider failure502, budget429. No retries/model fallback. Unknown request IDs/model IDs recorded as absent, never fabricated. Raw audio not persisted. TTS snapshot retirement is a hard stop.
