import Timer from 'timer'
import { Emotion } from 'face-state'
type Button = { onEvent?: (event: { pressed: boolean }) => void }
type Robot = {
  audio: { say(text: string): Promise<{ success: boolean; reason?: string }> }
  motion: { setPose(pose: { rotation: { y: number; p: number; r: number } }, duration: number): Promise<void> }
  face: { setEmotion(value: number): void }
  input: { button: { a: Button; b: Button; c: Button } }
}
const emit = (record: Record<string, unknown>): void => trace(`COAMI26|${JSON.stringify(record)}\n`)
export function onContextCreated(robot: Robot): void {
  let generation = 0, serial = 0, accepting = true
  const pending = new Map<number, { timer: number; settle: () => void }>()
  const pause = (milliseconds: number): Promise<void> => new Promise(resolve => {
    const timer = Timer.set(() => { pending.delete(timer); resolve() }, milliseconds)
    pending.set(timer, { timer, settle: resolve })
  })
  const run = async (op: 'say' | 'greet'): Promise<void> => {
    if (!accepting) { emit({ kind: 'discarded', op }); return }
    const seq = ++serial, own = generation; emit({ kind: 'started', op, seq, generation: own })
    let success = false
    try {
      if (op === 'say') success = (await robot.audio.say('こんにちは。こんにちは。こんにちは。こんにちは。')).success
      else {
        if (own !== generation) return
        robot.face.setEmotion(Emotion.HAPPY)
        await robot.motion.setPose({ rotation: { y: 0, p: 0.28, r: 0 } }, 0.2)
        if (own !== generation) return
        await pause(3000)
        if (own !== generation) return
        await robot.motion.setPose({ rotation: { y: 0, p: 0, r: 0 } }, 0.1)
        robot.face.setEmotion(Emotion.NEUTRAL); success = true
      }
    } catch (error) { emit({ kind: 'sdk-error', op, seq, reason: String(error) }) }
    finally { emit({ kind: 'settled', op, seq, generation: own, success, cancelled: own !== generation }) }
  }
  robot.input.button.a.onEvent = e => { if (e.pressed) void run('say') }
  robot.input.button.b.onEvent = e => { if (e.pressed) void run('greet') }
  robot.input.button.c.onEvent = e => {
    if (!e.pressed) return
    accepting = false; generation++
    for (const item of pending.values()) { Timer.clear(item.timer); item.settle() }
    pending.clear()
    robot.face.setEmotion(Emotion.NEUTRAL)
    void robot.motion.setPose({ rotation: { y: 0, p: 0, r: 0 } }, 0.1).then(
      () => emit({ kind: 'neutral-command-returned', generation }),
      (error: unknown) => emit({ kind: 'stop-error', reason: String(error) }),
    )
    emit({ kind: 'invalidated', generation })
  }
  emit({ kind: 'ready' })
}
