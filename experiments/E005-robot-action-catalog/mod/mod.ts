import Timer from 'timer'
import { Emotion } from 'face-state'

type ButtonEvent = { kind: 'button'; name: 'a' | 'b' | 'c' | 'power'; pressed: boolean; ticks: number }
type Pose = { rotation: { y: number; p: number; r: number } }
type Robot = {
  face: {
    setEmotion(value: number): void
    setEyeOpen(key: 'left' | 'right', value: number): void
    setMouthOpen(value: number): void
  }
  motion: { setPose(pose: Pose, duration: number): Promise<void> }
  input: { button: {
    a: { onEvent: (event: ButtonEvent) => void }
    b: { onEvent: (event: ButtonEvent) => void }
    c: { onEvent: (event: ButtonEvent) => void }
  } }
}
type Phase = 'started' | 'completed' | 'cancelled' | 'failed'
type Run = { seq: number; id: string; generation: number; finished: boolean }

const IDS = [
  'face.neutral', 'face.angry', 'face.sad', 'face.happy', 'face.sleepy', 'face.doubtful', 'face.cold', 'face.hot',
  'face.blink', 'face.wink_left', 'face.wink_right', 'face.mouth_open',
  'head.left', 'head.right', 'head.up', 'head.down', 'head.nod', 'head.shake', 'head.center', 'greet',
]
const EMOTIONS = [Emotion.NEUTRAL, Emotion.ANGRY, Emotion.SAD, Emotion.HAPPY, Emotion.SLEEPY, Emotion.DOUBTFUL, Emotion.COLD, Emotion.HOT]
const ZERO: Pose = { rotation: { y: 0, p: 0, r: 0 } }
const pose = (y: number, p: number): Pose => ({ rotation: { y, p, r: 0 } })
const emit = (message: Record<string, unknown>): void => trace(`COAMI5|${JSON.stringify({ catalog_version: 1, ...message })}\n`)

export function onContextCreated(robot: Robot): void {
  let selectedIndex = -1
  let selectionSeq = 0
  let runSeq = 0
  let generation = 0
  let activeRun: Run | null = null
  let activeRunner: Promise<void> | null = null
  let cancelWait: (() => void) | null = null
  let resetting = false

  const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => {
    const handle = Timer.set(() => { cancelWait = null; resolve() }, milliseconds)
    cancelWait = () => { Timer.clear(handle); cancelWait = null; resolve() }
  })
  const current = (run: Run): boolean => run.generation === generation
  const finish = (run: Run, phase: Exclude<Phase, 'started'>, error?: unknown): void => {
    if (run.finished) return
    run.finished = true
    emit({ kind: 'run', run_seq: run.seq, action_id: run.id, phase, ...(error === undefined ? {} : { error: String(error) }) })
  }
  const neutral = async (): Promise<void> => {
    robot.face.setEmotion(Emotion.NEUTRAL)
    robot.face.setEyeOpen('left', 1)
    robot.face.setEyeOpen('right', 1)
    robot.face.setMouthOpen(0)
    await robot.motion.setPose(ZERO, 0.25)
  }
  const action = async (run: Run): Promise<void> => {
    const id = run.id
    const emotionIndex = IDS.indexOf(id)
    if (emotionIndex >= 0 && emotionIndex < EMOTIONS.length) {
      if (id === 'face.neutral') {
        robot.face.setEmotion(Emotion.ANGRY)
        await wait(400)
        if (!current(run)) return
      }
      robot.face.setEmotion(EMOTIONS[emotionIndex])
      await wait(1500)
    } else if (id === 'face.blink' || id === 'face.wink_left' || id === 'face.wink_right') {
      if (id !== 'face.wink_right') robot.face.setEyeOpen('left', 0)
      if (id !== 'face.wink_left') robot.face.setEyeOpen('right', 0)
      await wait(900)
    } else if (id === 'face.mouth_open') {
      robot.face.setMouthOpen(0.8)
      await wait(900)
    } else if (id === 'head.left' || id === 'head.right' || id === 'head.up' || id === 'head.down') {
      const target = id === 'head.left' ? pose(Math.PI / 6, 0) : id === 'head.right' ? pose(-Math.PI / 6, 0)
        : id === 'head.up' ? pose(0, -Math.PI / 6) : pose(0, Math.PI / 32)
      await robot.motion.setPose(target, 0.3)
      if (!current(run)) return
      await wait(900)
    } else if (id === 'head.nod') {
      await robot.motion.setPose(pose(0, 0.28), 0.35)
      if (!current(run)) return
      await wait(900)
    } else if (id === 'head.shake') {
      await robot.motion.setPose(pose(0.25, 0), 0.25)
      if (!current(run)) return
      await wait(450)
      if (!current(run)) return
      await robot.motion.setPose(pose(-0.25, 0), 0.25)
      if (!current(run)) return
      await wait(450)
    } else if (id === 'head.center') {
      await robot.motion.setPose(pose(Math.PI / 6, 0), 0.25)
      if (!current(run)) return
      await wait(900)
      if (!current(run)) return
      await robot.motion.setPose(ZERO, 0.25)
      if (!current(run)) return
      await wait(900)
    } else if (id === 'greet') {
      robot.face.setEmotion(Emotion.HAPPY)
      await robot.motion.setPose(pose(0, 0.28), 0.35)
      if (!current(run)) return
      await wait(1700)
    } else throw new Error(`unknown_action:${id}`)
    if (!current(run)) return
    await neutral()
  }
  const execute = async (run: Run): Promise<void> => {
    try {
      await action(run)
      if (current(run)) finish(run, 'completed')
      else finish(run, 'cancelled')
    } catch (error) {
      finish(run, current(run) ? 'failed' : 'cancelled', error)
    } finally {
      if (activeRun === run) { activeRun = null; activeRunner = null }
    }
  }

  robot.input.button.a.onEvent = (event) => {
    if (event.kind !== 'button' || event.name !== 'a' || resetting || activeRun) return
    if (event.pressed) {
      selectedIndex = (selectedIndex + 1) % IDS.length
      selectionSeq += 1
    }
    if (selectedIndex < 0) return
    emit({ kind: 'selection', selection_seq: selectionSeq, selected_index: selectedIndex,
      action_id: IDS[selectedIndex], phase: event.pressed ? 'pressed' : 'released' })
  }
  robot.input.button.c.onEvent = (event) => {
    if (!event.pressed || selectedIndex < 0 || resetting || activeRun) return
    const run: Run = { seq: ++runSeq, id: IDS[selectedIndex], generation: ++generation, finished: false }
    activeRun = run
    emit({ kind: 'run', run_seq: run.seq, action_id: run.id, phase: 'started' })
    activeRunner = execute(run)
  }
  robot.input.button.b.onEvent = (event) => {
    if (!event.pressed) {
      emit({ kind: 'reset', phase: 'released' })
      return
    }
    if (resetting) return
    resetting = true
    generation += 1
    cancelWait?.()
    const previous = activeRun
    const runner = activeRunner
    void (async () => {
      try {
        if (runner) await runner
        if (previous) finish(previous, 'cancelled')
        await neutral()
        selectedIndex = -1
        emit({ kind: 'reset', phase: 'completed' })
      } catch (error) {
        emit({ kind: 'reset', phase: 'failed', error: String(error) })
      } finally {
        resetting = false
      }
    })()
  }

  emit({ kind: 'catalog', action_ids: IDS, selected_index: -1 })
}
