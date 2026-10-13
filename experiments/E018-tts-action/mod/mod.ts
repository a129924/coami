type ButtonEvent = { kind: 'button'; name: 'a' | 'b' | 'c' | 'power'; pressed: boolean }
type Button = { onEvent?: (event: ButtonEvent) => void }
type SayResult = { success: true; value: string } | { success: false; reason: string }
export type Robot = { audio: { say(text: string): Promise<SayResult> };
  input: { button: { a?: Button; c?: Button } } }
const TEXT = { a: 'こんにちは。', c: 'おやすみなさい。' }
const emit = (message: Record<string, unknown>): void => trace(`COAMI18|${JSON.stringify(message)}\n`)

export function onContextCreated(robot: Robot): void {
  let busy = false, sequence = 0
  const run = async (name: 'a' | 'c'): Promise<void> => {
    if (busy) { emit({ kind: 'busy', text: TEXT[name] }); return }
    busy = true
    const runSeq = ++sequence, text = TEXT[name]
    emit({ kind: 'started', runSeq, text })
    try {
      const result = await robot.audio.say(text)
      emit(result.success ? { kind: 'sdk', runSeq, text, success: true, value: result.value }
        : { kind: 'sdk', runSeq, text, success: false, reason: String(result.reason) })
    } catch (error) { emit({ kind: 'sdk', runSeq, text, success: false, reason: String(error) }) }
    finally { busy = false }
  }
  for (const name of ['a', 'c'] as const) {
    const button = robot.input.button[name]
    if (button) button.onEvent = event => { if (event.kind === 'button' && event.name === name && event.pressed) void run(name) }
  }
  emit({ kind: 'ready', texts: TEXT })
}
