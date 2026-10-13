# E016 Technical Specification

Pinned Stack-chan: b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322. GestureRecognizer unchanged: left/center/right positions −100/0/100; delta >60 forwardSwipe, <−60 backwardSwipe, equality excluded. One swipe per contact until zero release.

q=round(100*clamp(normalizedX,0,1)); p=2q−100; raw=[max(−p,0),100−abs(p),max(p,0)]. Single primary pointer. Capture nondecreasing session-relative performance.now milliseconds at input handlers. FIFO cap4096 retains contact boundaries, including zero before the next contact. Idle retains last sample/timestamp. Cancellation drops unconsumed movement for that operation, preserves first sample and acknowledged events, appends zero.

Scratch patch adds raw native bridge beginSample/completeSample/meta/read/ticks. TouchPanel poll locks tuple, calls original recognizer and synchronous MOD subscribers, acknowledges in finally. MOD imports experimental metadata; SDK Event shape unchanged. UI counts only MOD records. Failure/ack timeout is visible; stop accepting, reset entire runtime/bridge/recognizer with a new session, retain archived events and ignore old-session traces.

Runtime built from pinned source + E016-only patch. E015 toolchain may be read or isolated into E016 generated storage, never use camera runtime. Record source/patch/toolchain/host-module/runtime/served hashes. Full build once, one bounded fix retry, engineering feasibility cap90 minutes. Human evidence is not fabricated.

Auxiliary tools: external sequence diagram via Archify; actual diff map via pinned local PR Lens; existing Graphify graph query only with GRAPHIFY_NO_AUTO_REFRESH=1, budget1500, revision/source verification. No usable graph means targeted rg fallback; no graph extraction. These are not correctness or E2E gates.
