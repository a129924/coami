# E025 — Shared specification

This is the shared acceptance source for the canonical topic plan and the Python implementation plan. Approved dialogue scope is materialized here; experiment execution is not yet performed.

## Acceptance Criteria

R1. An established synthetic Cancel from Robot A invalidates its old generation before the receiver next awaits; every active primary/subscriber/child business task terminates and completes cleanup, queued work does not start, and only the completed barrier allows new business. Preserve A WebSocket/control and B. A bus dispatch/stop return is not completion evidence.

R2. Robot B starts and makes observable progress while A remains active and before A cancellation, and continues during A cleanup. Bus-internal business tasks and transfers are owned; do not stop shared infrastructure in a way that harms B. A and B share the same TestClient/portal/app event loop in each worker.

R3. A queue capacity is 2; admission is nonblocking with explicit rejection when full. Full queue does not prevent Cancel/Ping control processing. During cleanup new work is rejected, repeated Cancel is coalesced, and transport/control is not cancelled.

R4. Writer never begins sending an old generation result after the cancellation cutoff. Final gate check to starting send contains no await; earlier in-flight frames are outside recall guarantees. Completion-before-cancel and cancel-before-completion are both controlled by handshakes. After successful cleanup, new work succeeds. A pre-cancel bus-queued WorkEvent dispatched later must be ignored, not start old business; ownership cannot leak during handoff.

R5. Disconnect cancels old-session work. Same-Robot reconnect during old cleanup cannot admit business; after successful cleanup, a new session/generation may work without old results. Old work never resumes. Robot-owned supervisor state outlives a connection until cleanup/quarantine is resolved.

R6. Separately inject cleanup timeout, cleanup exception, unhandled child exception and unhandled subscriber exception. Mark that Robot quarantined, never report successful cancellation, deny business through reconnect until case teardown, and retain control/B operation. Supervisor contains grouped failures so they do not escape into transport/control/B scopes. No recovery policy in this experiment.

## Behavioral Scenarios

### Case 1 — Complete cancellation (R1)
- **Given** A primary and multiple subscriber handlers have started, a child is active, and two works are queued.
- **When** A sends Cancel while handshake gates hold business completion.
- **Then** audit proves each owned task reached its cleanup terminal state, queued works never started, cancellation-complete follows the barrier, and transport still handles Ping.

### Case 2 — Independent Robot progress (R2)
- **Given** A remains active behind a gate and B shares the same app event loop.
- **When** B starts work before any A Cancel, and A later enters cleanup.
- **Then** B progresses both before Cancel and during cleanup. Test does not release A to manufacture B's first progress.

### Case 3 — Full queue/control (R3)
- **Given** A is active with its queue full.
- **When** more Work, Cancel, Ping, repeated Cancel and cleanup-time Work arrive.
- **Then** extra/new Work is rejected, control progresses, one cancellation barrier is used and old queue remains unable to execute.

### Case 4 — Result and pending-event races (R4)
- **Given** parameter `complete-first`, `cancel-first`, `bus-pending` or `writer-pending`.
- **When** gates deterministically order result readiness, writer admission and Cancel; for `bus_pending`, a nonbusiness harness handler temporarily blocks bus processing while old WorkEvent is queued, Cancel arrives, then the bus gate is released.
- **Then** no post-cutoff old send starts; stale queued event cannot start business, and new work works after successful barrier. `writer-pending` holds an already-ready old result before the writer's final gate, cancels, then releases it to prove it is discarded. The bus gate is test-only infrastructure, never evidence that long business should hold the bus lock.

### Case 5 — Disconnect/reconnect (R5)
- **Given** A old session owns active/queued work and cleanup can be held.
- **When** it disconnects and the same synthetic Robot identity reconnects before then after cleanup.
- **Then** cleanup-time admission is rejected, new-generation admission is permitted only after success, and old results never reach the new session.

### Case 6 — Quarantine (R6)
- **Given** parameter `cleanup_timeout`, `cleanup_error`, `child_error` or `subscriber_error`.
- **When** the selected failure is injected using cooperative, bounded synthetic work.
- **Then** quarantine is observable, no false successful barrier is emitted, new Work is rejected on existing/reconnected sessions, control and B remain usable, and teardown stays process-bounded.

Every parameterized node in these six families repeats 20 times in independent worker processes. Expected initial matrix: 12 nodes × 20 = 240 bubus workers; an additional invalid-input smoke test is separate and cannot replace a matrix node. Any added existing candidate must use the same ownership, short dispatch handoff, inputs and criteria, within the original budget.

## Error / Edge Cases

- Cleanup/barrier maximum 2 s; case signal watchdog 10 s; parent worker watchdog 30 s including startup/teardown. Each tuple owns its own worker, not one process for the whole suite. No tight elapsed-time ranking/SLA.
- `成功`: all required branches/repetitions supported by complete evidence. `失敗`: complete evidence of a required-behavior violation. `無法判定`: prerequisite/watchdog/environment interruption leaves insufficient evidence. `未執行`: not attempted. A watchdog is not cancellation-success evidence; classify failure only when evidence establishes a violation.
- Synthetic typed Work/Cancel/Ping and work correlation are experiment-local. Validate malformed input explicitly without launching business; no production protocol or identity/auth policy is established. Exact malformed-input response shape may remain experiment-local, but must not cancel B or quarantine a healthy Robot merely for parsing failure.
- Python cancellation is cooperative. Shield only bounded cleanup; never swallow cancellation to continue business, indefinitely await an uncooperative task, or claim remote/thread termination. Outer process termination bounds the experiment only.
- Ordinary bus event completion means dispatch handoff, not business completion. Check all subscriber/child/internal-related business ownership and pending bus events across cancellation.
- No NLU, SDK, real network, playback/movement stop, production deployment or adoption guarantee. Recommendation goes to owner after independent review.
