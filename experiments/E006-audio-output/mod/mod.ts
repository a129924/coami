import { createProbeWav } from './wav.ts'

type ButtonEvent = { kind: 'button'; name: 'a' | 'b' | 'c' | 'power'; pressed: boolean }
type Button = { onEvent?: (event: ButtonEvent) => void }
type Robot = {
  audio: {
    tone(hz: number, duration: number, volume: number): Promise<void>
    playAudio(buffer: ArrayBuffer): Promise<boolean>
  }
  input: { button?: { a?: Button; c?: Button } }
}
type ActionId = 'tone' | 'wav'

const emit = (message: Record<string, unknown>): void => trace(`COAMI6|${JSON.stringify(message)}\n`)

export function onContextCreated(robot: Robot): void {
  let busy = false
  let sequence = 0

  const run = async (actionId: ActionId): Promise<void> => {
    if (busy) return
    busy = true
    const runSeq = ++sequence
    emit({ kind: 'run', run_seq: runSeq, action_id: actionId, phase: 'started' })
    try {
      if (actionId === 'tone') {
        await robot.audio.tone(440, 250, 0.35)
      } else {
        const buffer = createProbeWav()
        if (!await robot.audio.playAudio(buffer)) throw new Error('playback_failed')
      }
      emit({ kind: 'run', run_seq: runSeq, action_id: actionId, phase: 'completed' })
    } catch (error) {
      emit({ kind: 'run', run_seq: runSeq, action_id: actionId, phase: 'failed', error: String(error) })
    } finally {
      busy = false
    }
  }

  if (robot.input.button?.a) robot.input.button.a.onEvent = (event) => {
    if (event.kind === 'button' && event.name === 'a' && event.pressed) void run('tone')
  }
  if (robot.input.button?.c) robot.input.button.c.onEvent = (event) => {
    if (event.kind === 'button' && event.name === 'c' && event.pressed) void run('wav')
  }
  emit({ kind: 'ready', actions: ['tone', 'wav'] })
}
