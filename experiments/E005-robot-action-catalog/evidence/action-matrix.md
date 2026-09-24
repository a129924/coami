# E005 action evidence matrix

An independent Tester reviewed each candidate's visible effect and reproduced the A/C/B protocol in a fresh browser run on 2026-09-23. `completed` in the MOD trace means the programmed sequence ended; it does not by itself establish visual PASS. The recorded headless Chrome simulator run exercised all 20 candidates in catalog order, with 20 `completed` terminals and 40 command/result rows. A fresh 2026-09-24 browser rerun confirmed the same catalog order and the per-action `run_seq` values below. Video ranges below are approximate; inspect the dwell interval for each effect in [action-run.webm](action-run.webm).

| Action ID | Vendor API / fixed starting state and parameter | MOD | Creator's visible observation / video | Independent verdict | Dedicated button |
| --- | --- | --- | --- | --- | --- |
| `face.neutral` | `setEmotion`; from ANGRY to NEUTRAL, 1.5 s | run_seq=1, completed | Angry-to-neutral transition, 00:08.4–00:10.6; angled eyes become neutral dots | PASS | yes |
| `face.angry` | `setEmotion(ANGRY)`, 1.5 s | run_seq=2, completed | Angled angry eyes, 00:10.6–00:12.3 | PASS | yes |
| `face.sad` | `setEmotion(SAD)`, 1.5 s | run_seq=3, completed | Downturned eyes, 00:12.3–00:14.0 | PASS | yes |
| `face.happy` | `setEmotion(HAPPY)`, 1.5 s | run_seq=4, completed | Curved smiling eyes, 00:14.0–00:15.7 | PASS | yes |
| `face.sleepy` | `setEmotion(SLEEPY)`, 1.5 s | run_seq=5, completed | Half-closed eyes, 00:15.7–00:17.4 | PASS | yes |
| `face.doubtful` | `setEmotion(DOUBTFUL)`, 1.5 s | run_seq=6, completed | No distinguishable change from neutral, 00:17.4–00:19.1 | FAIL | no |
| `face.cold` | `setEmotion(COLD)`, 1.5 s | run_seq=7, completed | No distinguishable change from neutral, 00:19.1–00:20.8 | FAIL | no |
| `face.hot` | `setEmotion(HOT)`, 1.5 s | run_seq=8, completed | No distinguishable change from neutral, 00:20.8–00:22.5 | FAIL | no |
| `face.blink` | `setEyeOpen(left/right, 0→1)`, 0.9 s | run_seq=9, completed | Both eyes close then reopen, 00:22.5–00:23.6 | PASS | yes |
| `face.wink_left` | `setEyeOpen(left, 0→1)`, 0.9 s | run_seq=10, completed | Left robot eye closes then reopens, 00:23.6–00:24.8 | PASS | yes |
| `face.wink_right` | `setEyeOpen(right, 0→1)`, 0.9 s | run_seq=11, completed | Right robot eye closes then reopens, 00:24.8–00:25.9 | PASS | yes |
| `face.mouth_open` | `setMouthOpen(0.8→0)`, 0.9 s | run_seq=12, completed | Square open mouth then line, 00:25.9–00:27.0 | PASS | yes |
| `head.left` | `setPose(yaw=+π/6→0)`, 0.9 s dwell | run_seq=13, completed | Robot-left turn, 00:27.0–00:28.1 | PASS | yes |
| `head.right` | `setPose(yaw=−π/6→0)`, 0.9 s dwell | run_seq=14, completed | Robot-right turn, 00:28.1–00:29.3 | PASS | yes |
| `head.up` | `setPose(pitch=−π/6→0)`, 0.9 s dwell | run_seq=15, completed | Head tilts up, 00:29.3–00:30.4 | PASS | yes |
| `head.down` | `setPose(pitch=+π/32→0)`, 0.9 s dwell | run_seq=16, completed | Head tilts down, 00:30.4–00:31.6 | PASS | yes |
| `head.nod` | `setPose(pitch=+0.28→0)`, 0.9 s dwell | run_seq=17, completed | Downward nod and return, 00:31.6–00:32.7 | PASS | yes |
| `head.shake` | `setPose(yaw=+0.25→−0.25→0)`, 0.45 s per side | run_seq=18, completed | Left-right movement, 00:32.7–00:33.9 | PASS | yes |
| `head.center` | `setPose(yaw=+π/6→0)`, offset created within the action | run_seq=19, completed | Turns from its own left offset back to center, 00:33.9–00:35.9 | PASS | yes |
| `greet` | `setEmotion(HAPPY)` + `setPose(pitch=+0.28→0)`, 1.7 s | run_seq=20, completed | Smiling nod then neutral, 00:35.9–00:37.9 | PASS | yes |

API definitions are in the pinned vendor `firmware/host/app/capabilities.ts` and `firmware/host/modules/ui/state/face-state.ts`; E005 values are in `mod/mod.ts`. The independent Tester observed the recorded effect at each listed timecode and reproduced A selection pressed/released before C in a fresh browser run. That run produced `run cancelled`, `reset completed`, and `reset released` after B, and its downloaded JSONL held two matched command/result pairs with the cancelled action pointing to the stop request. A separate `face.angry` run confirmed selection and completion with one matched pair. The three FAIL emotions remain research candidates only.
