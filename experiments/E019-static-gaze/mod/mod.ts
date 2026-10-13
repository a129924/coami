import Timer from 'timer'
import { GazeControl, TARGETS, type Motion } from './gaze-control'
type Button = { onEvent: (event: { pressed: boolean }) => void }
type Robot = { motion: Motion; input: { button: { a: Button; b: Button; c: Button } }; ui: { showFace(): void } }
const emit = (event: object): void => trace(`COAMI19|${JSON.stringify(event)}\n`)
export function onContextCreated(robot: Robot): void {
  let selection = 0
  const control = new GazeControl(robot.motion, emit, done => { Timer.set(done, 5000) })
  const selected = () => emit({ phase: 'selected', selection, target: TARGETS[selection]?.id ?? 'prepare' })
  robot.ui.showFace()
  robot.input.button.a.onEvent = event => {
    if (!event.pressed || control.busy) return
    selection = (selection + 1) % (TARGETS.length + 1); selected()
  }
  robot.input.button.b.onEvent = event => {
    if (event.pressed) void control.run(selection === TARGETS.length ? 'prepare' : 'look', TARGETS[selection]?.id)
  }
  robot.input.button.c.onEvent = event => { if (event.pressed) void control.run('away') }
  emit({ phase: 'ready', experiment: 'E019' }); selected()
}
