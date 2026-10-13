# E018 auxiliary evidence

## Graphify

Pinned CLI `/Users/andrew/.local/bin/graphify`; `GRAPHIFY_NO_AUTO_REFRESH=1 ... --version` -> graphify 0.9.73 PASS. No usable Coami graph found in repo/worktree graphify-out, so bounded `rg` and source reads used. No extract/build/refresh/install/provider/stamp. Source-verified path: E018 button -> MOD say -> runtime-audio Maybe -> wasm stackchan-voice -> dynamic host AudioOut.

## Archify

One external static sequence: `/private/tmp/coami-e018-review-artifacts/archify/tts-sequence.json` and `.html`.
Commands: pinned skill `node bin/archify.mjs validate sequence <json> --quality showcase --json`, `deliver sequence <json> <html> --quality showcase --json`, `visual-check <html> --json` (external artifact, no Coami --repo-root).

Structural showcase: PASS all 9 checks, 0 errors/warnings; delivery succeeded with spec/artifact hashes in delivery.json. Visual containment: FAIL all four sizes (1440x900,1600x1000,1920x1080,2048x1320), vertical overflow; not showcase visual acceptance. Screenshots captured and visually inspected: readable top path, remainder scrolls below viewport. Artifact remains frozen and partial; no CSS hiding/shrinking workaround, no preview/server/motion. Traditional Chinese author text, fixed Viewer UI/html lang English fallback.

Allowed fallback: direct source/README walkthrough. Auxiliary delivery incomplete; TTS verdict unaffected.

## PR Lens

Pinned CLI `/Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens --version` ->0.11.0 PASS. No .github/pr-lens.yml exists. Actual staged bounded diff validate/render PASS: 2 lanes, 6 nodes, 7 edges, 3 walkthrough steps. Base and then-current HEAD were both d3eee648351837e391422e73c299cdae8d03a875; graph explicitly described the uncommitted staged diff (SHA-256 47ae6c253f101e99df968ecd8b35a720cee76311febf5ff0fb1db5d647ddb257). No invented commit. External graph will be refreshed after the topic commit with actual base/head.
External intended graph: `/private/tmp/coami-e018-review-artifacts/pr-lens/graph.json`, outputs in `rendered/`, SVG names read from manifest.
No install/npx/config change/.pr-lens/provider/upload/PR assets.

Snapshot graph SHA-256: 48d6680352438d100b57fecc098fc0e613acc2e873005bb1cfd45cf38e8543f5
Manifest (actual output paths):

```json
{
  "schemaVersion": "0.2.0",
  "kind": "render-manifest",
  "graph": {
    "headSha": "d3eee648351837e391422e73c299cdae8d03a875",
    "contentHash": "fe9d8ce366c03d4aef5175a633a1a212"
  },
  "renderer": {
    "name": "@coldtea/pr-lens-renderer",
    "version": "0.3.1"
  },
  "assets": [
    {
      "id": "tts-overview-light",
      "lens": "architecture",
      "theme": "light",
      "view": "tts-overview",
      "mediaType": "image/svg+xml",
      "contentHash": "b7179e4401c67c353fd897280abe0370",
      "bytes": 11194,
      "width": 880,
      "height": 700,
      "animated": false,
      "path": "tts-overview-light-b7179e4401c67c353fd897280abe0370.svg"
    }
  ]
}

```
