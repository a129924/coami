export type ButtonEvent = { kind: 'button'; name: 'a' | 'b' | 'c' | 'power'; pressed: boolean }
export type Robot = { audio: { record(duration: number): Promise<ArrayBuffer>; say(text: string): Promise<{ success: boolean; value?: string; reason?: string }>; playAudio(buffer: ArrayBuffer): Promise<boolean> }; input: { button: { a?: { onEvent?: (e: ButtonEvent) => void }; b?: { onEvent?: (e: ButtonEvent) => void }; c?: { onEvent?: (e: ButtonEvent) => void } } } }
const TEXT = 'こんにちは。こんにちは。こんにちは。こんにちは。'
const emit = (record: Record<string, unknown>): void => trace(`COAMI25|${JSON.stringify(record)}\n`)
export function onContextCreated(robot: Robot): void {
  let sequence = 0
  let recorded: ArrayBuffer | undefined
  const run = async (op: 'record' | 'say' | 'replay'): Promise<void> => {
    const seq = ++sequence
    emit({ kind: 'called', op, seq, text: op === 'say' ? TEXT : undefined })
    try {
      if (op === 'record') {
        recorded = undefined
        const buffer = await robot.audio.record(5000)
        recorded = buffer
        emit({ kind: 'terminal', op, seq, success: buffer.byteLength > 0, bytes: buffer.byteLength })
      } else if (op === 'say') {
        const result = await robot.audio.say(TEXT)
        emit({ kind: 'terminal', op, seq, success: result.success && result.value === TEXT, reason: result.reason })
      } else {
        const buffer = recorded
        if (!buffer || buffer.byteLength === 0) throw Error('No current recording to replay')
        emit({ kind: 'terminal', op, seq, success: await robot.audio.playAudio(buffer) })
      }
    } catch (error) { emit({ kind: 'terminal', op, seq, success: false, reason: String(error) }) }
  }
  for (const [name, op] of [['a', 'record'], ['c', 'say'], ['b', 'replay']] as const) {
    const button = robot.input.button[name]
    if (button) button.onEvent = event => { if (event.kind === 'button' && event.name === name && event.pressed) void run(op) }
  }
  emit({ kind: 'ready', text: TEXT })
}
