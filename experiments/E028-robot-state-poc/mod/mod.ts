import Timer from 'timer'
export type Pose = { rotation: { y: number; p: number; r: number }; position: { x: number; y: number; z: number } }
export type Robot = {
  audio: { record(duration: number): Promise<ArrayBuffer>; say(text: string): Promise<{ success: boolean; value?: string }> }
  face: { setEmotion(value: number): void; setEyeOpen(key: 'left' | 'right', value: number): void; setMouthOpen(value: number): void }
  motion: { setPose(pose: Pose, seconds: number): Promise<void> }
  input: { button: Partial<Record<'a' | 'b' | 'c', { onEvent?: (event: { kind: string; name: string; pressed: boolean }) => void }>> }
}
export const TEXT = 'こんにちは。こんにちは。こんにちは。こんにちは。'
const emit = (record: Record<string, unknown>): void => trace(`COAMI28|${JSON.stringify(record)}\n`)
const pose = (pitch: number): Pose => ({ rotation: { y: 0, p: pitch, r: 0 }, position: { x: 0, y: 0, z: 0 } })
const wait = (milliseconds: number): Promise<void> => new Promise(resolve => { Timer.set(resolve, milliseconds) })
export async function headNod(robot: Robot): Promise<void> {
  await robot.motion.setPose(pose(0.28), 0.35)
  await wait(900)
  // Complete E005 neutral: expression, both eyes, mouth, head.
  robot.face.setEmotion(0)
  robot.face.setEyeOpen('left', 1)
  robot.face.setEyeOpen('right', 1)
  robot.face.setMouthOpen(0)
  await robot.motion.setPose(pose(0), 0.25)
}
export function onContextCreated(robot: Robot): void {
  let sequence = 0
  const run = async (op: 'record' | 'say' | 'head.nod'): Promise<void> => {
    const seq = ++sequence
    emit({ kind: 'called', op, seq })
    try {
      if (op === 'record') {
        const buffer = await robot.audio.record(5000)
        emit({ kind: 'terminal', op, seq, success: buffer.byteLength > 0, bytes: buffer.byteLength })
      } else if (op === 'say') {
        const result = await robot.audio.say(TEXT)
        emit({ kind: 'terminal', op, seq, success: result.success && result.value === TEXT })
      } else {
        emit({ kind: 'sequence-start', op, seq })
        await headNod(robot)
        emit({ kind: 'sequence-end', op, seq })
        emit({ kind: 'terminal', op, seq, success: true })
      }
    } catch (error) { emit({ kind: 'terminal', op, seq, success: false, reason: String(error) }) }
  }
  for (const [name, op] of [['a', 'record'], ['c', 'say'], ['b', 'head.nod']] as const) {
    const button = robot.input.button[name]
    if (button) button.onEvent = event => {
      if (event.kind === 'button' && event.name === name && event.pressed) void run(op)
    }
  }
  emit({ kind: 'ready', text: TEXT })
}
