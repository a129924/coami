# E010 technical specification

The browser validates a same-zone primary-pointer tap of at most 300 ms and 15 CSS px. It passes only a zone position to the patched simulator engine.

The experiment-owned `wasm-top-touch.patch` installs a WASM `TouchPanel` provider before context creation. The browser host bridge queues pressed/released three-channel samples; the existing `GestureRecognizer` constructs the resulting event. The MOD accepts only finite, increasing ticks with a valid `release/tap`, owns one run while busy, and renders completed or failed terminal state.

The patch applies only in a disposable checkout of Stack-chan SHA `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`. `stage-runtime-host.mjs` copies the patched bridge, its simulator dependencies, and the patched engine from that checkout into ignored E010 output; `preview-runtime.ts` imports only that staged engine. A contract test executes the same staging procedure and proves the host bridge exposes `TopTouchPanel`, `pushTopTouch`, and press/release samples. Generated runtime assets are ignored and must match current-patch provenance hashes after a full rebuild.
