# E006 — Browser simulator audio output

This TypeScript-only experiment checks the Stack-chan simulator's tone and WAV-buffer playback paths. It has no Server or Python component.

## Run

Use Node 24–26. From the repository root, initialize the pinned `vendor/stack-chan` submodule. Then, from `experiments/E006-audio-output/web/`:

```sh
npm ci
npm run prepare:poc
npm test
npm run build
npm run dev -- --port 5176
```

Open `http://127.0.0.1:5176/`. The asset script verifies SHA-256 hashes of the pinned simulator WASM files. The MOD build bundles `mod/mod.ts` and the same `mod/wav.ts` source checked by `mod/wav.test.ts`, then creates `coami-mod.xsa`.

## Audible evidence procedure

1. Set a known Mac output device and audible volume. Click **錄製目前分頁與音訊**, select the tab whose preview visibly shows this E006 page at `127.0.0.1:5176` (not another tab), and enable tab audio. The page must say recording includes an audio track. Pause audio in other tabs before starting.
2. Click **播放提示音 A**, wait for the terminal trace, then click **播放固定 WAV C** and wait again. Listen for both sounds; the WAV is longer and higher pitched.
3. Click **停止並下載 WebM**. Move the downloaded `output-capture.webm` into this experiment's `evidence/` directory. Replay it and confirm the audio track contains both sounds.
4. Ask an independent Tester to replay the file and record an audible PASS/FAIL in `EXPERIMENT.md`. A MOD completion message alone does not count.

If tab audio is unavailable, record the browser, OS and selected share option in `EXPERIMENT.md` and leave audible PASS unclaimed. The capture button does not save private data until the operator explicitly starts and downloads a recording.

## Limits

The generated WAV is a 24 kHz mono PCM16, 660 Hz half-second signal; tone is 440 Hz for 250 ms at volume 0.35. These values test only the browser simulator audio path, not real device speakers or TTS.
