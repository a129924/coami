type Robot = { audio: {record(ms: number): Promise<ArrayBuffer>; playAudio(bytes: ArrayBuffer): Promise<boolean>};
  input: {button: Partial<Record<'a' | 'b' | 'c', {onEvent?: (e: {pressed: boolean}) => void}>>} }
const emit = (event: Record<string, unknown>): void => trace(`COAMI27|${JSON.stringify(event)}\n`)
export function onContextCreated(robot: Robot): void {
  let busy = false, sequence = 0
  async function run(button: 'a' | 'b' | 'c'): Promise<void> {
    if (busy) return
    busy = true
    const run_seq = ++sequence
    emit({kind:'started', run_seq})
    try {
      const bridge = globalThis.__coamiVoiceTurnBridge
      if (!bridge) throw Error('fresh E027 native bridge unavailable')
      const reply = button === 'b' ? await bridge.exchange(await robot.audio.record(4000))
        : await bridge.checkTts(button === 'a' ? 'A' : 'B')
      emit({kind:'sdk', run_seq, success: await robot.audio.playAudio(reply)})
    } catch { emit({kind:'sdk', run_seq, success:false}) }
    finally { busy = false }
  }
  for (const name of ['a','b','c'] as const) {
    const button = robot.input.button[name]
    if (button) button.onEvent = e => { if (e.pressed) void run(name) }
  }
  emit({kind:'ready'})
}
