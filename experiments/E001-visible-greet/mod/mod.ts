import Timer from 'timer'
import { Emotion } from 'face-state'

type Robot = {
  face: { setEmotion(emotion: number): void }
  motion: {
    setPose(pose: { rotation: { y: number; p: number; r: number } }, duration: number): Promise<void>
  }
  input: {
    button: {
      a: { onEvent: (event: { pressed: boolean }) => void }
      b: { onEvent: (event: { pressed: boolean }) => void }
    }
  }
}

const NEUTRAL = { rotation: { y: 0, p: 0, r: 0 } }
const NOD = { rotation: { y: 0, p: 0.28, r: 0 } }

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => Timer.set(resolve, milliseconds))
}

export function onContextCreated(robot: Robot): void {
  let generation = 0
  let greeting = false

  robot.input.button.a.onEvent = (event) => {
    if (!event.pressed || greeting) return
    greeting = true
    const current = ++generation
    void (async () => {
      try {
        robot.face.setEmotion(Emotion.HAPPY)
        await robot.motion.setPose(NOD, 0.35)
        await wait(1700)
        if (current !== generation) return
        await robot.motion.setPose(NEUTRAL, 0.35)
        await wait(800)
        if (current !== generation) return
        robot.face.setEmotion(Emotion.NEUTRAL)
        greeting = false
        trace('COAMI_RESULT|greet|completed\n')
      } catch (error) {
        if (current !== generation) return
        greeting = false
        trace(`COAMI_RESULT|greet|failed|${String(error)}\n`)
      }
    })()
  }

  robot.input.button.b.onEvent = (event) => {
    if (!event.pressed) return
    ++generation
    const interrupted = greeting
    greeting = false
    robot.face.setEmotion(Emotion.NEUTRAL)
    void robot.motion.setPose(NEUTRAL, 0.1).then(
      () => {
        if (interrupted) trace('COAMI_RESULT|greet|cancelled\n')
        trace('COAMI_RESULT|stop|completed\n')
      },
      (error: unknown) => trace(`COAMI_RESULT|stop|failed|${String(error)}\n`),
    )
  }
}
