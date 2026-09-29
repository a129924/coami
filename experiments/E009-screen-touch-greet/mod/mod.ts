import 'piu/MC'
import Timer from 'timer'
import { Emotion } from 'face-state'
import { GreetInteraction, type Terminal } from './greet-interaction'

type Pose = { rotation: { y: number; p: number; r: number } }
type Robot = {
  ui: { setMain(content: PiuContainer): void; showFace(): void }
  face: { setEmotion(value: number): void; setEyeOpen(key: 'left' | 'right', value: number): void; setMouthOpen(value: number): void }
  motion: { setPose(pose: Pose, duration: number): Promise<void> }
}

const ZERO: Pose = { rotation: { y: 0, p: 0, r: 0 } }
const NOD: Pose = { rotation: { y: 0, p: 0.28, r: 0 } }
const emit = (message: Record<string, unknown>): void => trace(`COAMI9|${JSON.stringify(message)}\n`)
const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => { Timer.set(resolve, milliseconds) })

export function onContextCreated(robot: Robot): void {
  const interaction = new GreetInteraction()
  let screenGeneration = 0
  const screenSkin = new Skin({ fill: '#f7f6f0' })
  const buttonSkin = new Skin({ fill: ['#d86f45', '#a94e2d'] })
  const titleStyle = new Style({ font: 'k8x12-12', color: '#263538', horizontal: 'center', vertical: 'middle' })
  const buttonStyle = new Style({ font: 'k8x12-12', color: '#ffffff', horizontal: 'center', vertical: 'middle' })

  const showScreen = (status: Terminal | null): void => {
    const generation = ++screenGeneration
    const label = status === 'completed' ? '打招呼完成' : status === null ? '點選打招呼' : '打招呼失敗'
    const hint = status === null ? '點下方按鈕' : '可再次點選'
    const button = new Container(null, {
      name: 'greet-button', left: 54, right: 54, top: 95, height: 62,
      active: true, skin: buttonSkin,
      contents: [new Label(null, { left: 0, right: 0, top: 0, bottom: 0, string: '打招呼', style: buttonStyle })],
      Behavior: class extends Behavior {
        onTouchBegan(_content: PiuContainer, touchId: number, x: number, y: number): void {
          if (generation !== screenGeneration) return
          const accepted = interaction.begin(touchId, x, y)
          emit({ kind: 'touch', phase: 'began', touch_id: touchId, accepted })
        }
        onTouchMoved(_content: PiuContainer, touchId: number, x: number, y: number): void {
          interaction.move(touchId, x, y)
          emit({ kind: 'touch', phase: 'moved', touch_id: touchId })
        }
        onTouchCancelled(_content: PiuContainer, touchId: number): void {
          interaction.cancel(touchId)
          emit({ kind: 'touch', phase: 'cancelled', touch_id: touchId })
        }
        onTouchEnded(_content: PiuContainer, touchId: number, x: number, y: number): void {
          if (generation !== screenGeneration) return
          interaction.move(touchId, x, y)
          const runSeq = interaction.end(touchId)
          emit({ kind: 'touch', phase: 'ended', touch_id: touchId, run_seq: runSeq })
          if (runSeq !== null) Timer.set(() => { void runGreet(runSeq) }, 0)
        }
      },
    })
    const root = new Container(null, {
      name: 'greet-screen', left: 0, right: 0, top: 0, bottom: 0, skin: screenSkin,
      contents: [
        new Label(null, { left: 10, right: 10, top: 28, height: 38, string: label, style: titleStyle }),
        button,
        new Label(null, { left: 10, right: 10, top: 174, height: 28, string: hint, style: titleStyle }),
      ],
    })
    robot.ui.setMain(root)
    emit({ kind: 'screen', phase: status ?? 'ready' })
  }

  const neutral = async (): Promise<void> => {
    robot.face.setEmotion(Emotion.NEUTRAL)
    robot.face.setEyeOpen('left', 1)
    robot.face.setEyeOpen('right', 1)
    robot.face.setMouthOpen(0)
    await robot.motion.setPose(ZERO, 0.25)
  }

  const runGreet = async (runSeq: number): Promise<void> => {
    emit({ kind: 'run', run_seq: runSeq, action_id: 'greet', phase: 'started' })
    let terminal: Terminal = 'completed'
    try {
      robot.ui.showFace()
      robot.face.setEmotion(Emotion.HAPPY)
      await robot.motion.setPose(NOD, 0.35)
      await wait(1700)
      await neutral()
    } catch {
      terminal = 'failed'
      try { await neutral() } catch { /* preserve failure terminal */ }
    }
    if (!interaction.busy) return
    try { showScreen(terminal) }
    catch {
      terminal = 'failed'
      emit({ kind: 'screen', phase: 'failed', error_code: 'result_render_failed' })
    }
    if (interaction.finish(runSeq, terminal) !== null) {
      emit({ kind: 'run', run_seq: runSeq, action_id: 'greet', phase: terminal })
    }
  }

  showScreen(null)
  emit({ kind: 'ready', action_id: 'greet' })
}
