type ButtonEvent = { kind: 'button'; name: 'a' | 'b' | 'c' | 'power'; pressed: boolean }
type Button = { onEvent?: (event: ButtonEvent) => void }
type Robot = {
  audio: {
    record(durationMilliSec: number): Promise<ArrayBuffer>
    playAudio(buffer: ArrayBuffer): Promise<boolean>
  }
  input: { button?: { a?: Button } }
}

const emit = (message: Record<string, unknown>): void => trace(`COAMI7|${JSON.stringify(message)}\n`)

export function onContextCreated(robot: Robot): void {
  let busy = false
  let sequence = 0

  const run = async (): Promise<void> => {
    if (busy) return
    busy = true
    const runSeq = ++sequence
    emit({ kind: 'run', run_seq: runSeq, phase: 'started' })
    try {
      let buffer: ArrayBuffer
      try { buffer = await robot.audio.record(2000) }
      catch (error) {
        const errorCode = /permission|denied|notallowed/i.test(String(error)) ? 'permission_denied' : 'record_failed'
        emit({ kind: 'run', run_seq: runSeq, phase: 'failed', error_code: errorCode })
        return
      }
      const byteLength = buffer.byteLength
      if (byteLength === 0) {
        emit({ kind: 'run', run_seq: runSeq, phase: 'failed', error_code: 'empty_buffer' })
        return
      }
      emit({ kind: 'run', run_seq: runSeq, phase: 'recorded', byte_length: byteLength })
      try {
        if (!await robot.audio.playAudio(buffer)) {
          emit({ kind: 'run', run_seq: runSeq, phase: 'failed', error_code: 'playback_failed' })
          return
        }
      } catch {
        emit({ kind: 'run', run_seq: runSeq, phase: 'failed', error_code: 'playback_failed' })
        return
      }
      emit({ kind: 'run', run_seq: runSeq, phase: 'completed', byte_length: byteLength })
    } finally {
      busy = false
    }
  }

  if (robot.input.button?.a) robot.input.button.a.onEvent = (event) => {
    if (event.kind === 'button' && event.name === 'a' && event.pressed) void run()
  }
  emit({ kind: 'ready', action: 'record_replay' })
}
