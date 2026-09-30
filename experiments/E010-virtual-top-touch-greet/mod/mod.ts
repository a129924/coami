import 'piu/MC'
import { Emotion } from 'face-state'
import Timer from 'timer'
import { TopTouchGreet, type Terminal, type TouchPanelEvent } from './top-touch-greet'
import { renderTerminal } from './run-terminal'

type Pose = { rotation: { y: number; p: number; r: number } }
type Robot = {
  input: { touchPanel?: { subscribe(listener: (event: TouchPanelEvent) => void): () => void } }
  ui: { setMain(content: PiuContainer): void; showFace(): void }
  face: { setEmotion(value: number): void; setEyeOpen(key: 'left' | 'right', value: number): void; setMouthOpen(value: number): void }
  motion: { setPose(pose: Pose, duration: number): Promise<void> }
}

const ZERO: Pose = { rotation: { y: 0, p: 0, r: 0 } }
const NOD: Pose = { rotation: { y: 0, p: 0.28, r: 0 } }
const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => { Timer.set(resolve, milliseconds) })
const emit = (message: Record<string, unknown>): void => trace(`COAMI10|${JSON.stringify(message)}\n`)

export function onContextCreated(robot: Robot): void {
  const interaction = new TopTouchGreet()
  const screenSkin = new Skin({ fill: '#f7f6f0' })
  const titleStyle = new Style({ font: 'k8x12-12', color: '#263538', horizontal: 'center', vertical: 'middle' })

  const showScreen = (status: 'ready' | 'unavailable' | Terminal): void => {
    const label = status === 'completed'
      ? '打招呼完成'
      : status === 'failed'
        ? '打招呼失敗'
        : status === 'unavailable'
          ? '機頂輸入不可用'
          : '輕觸模擬機頂'
    const hint = status === 'ready' ? '請點選瀏覽器中的任一機頂區域' : '可再次觸發或重新啟動'
    robot.ui.setMain(new Container(null, {
      name: 'top-touch-greet-screen', left: 0, right: 0, top: 0, bottom: 0, skin: screenSkin,
      contents: [
        new Label(null, { left: 12, right: 12, top: 48, height: 44, string: label, style: titleStyle }),
        new Label(null, { left: 12, right: 12, top: 132, height: 36, string: hint, style: titleStyle }),
      ],
    }))
    emit({ kind: 'screen', phase: status })
  }

  const neutral = async (): Promise<void> => {
    robot.face.setEmotion(Emotion.NEUTRAL)
    robot.face.setEyeOpen('left', 1)
    robot.face.setEyeOpen('right', 1)
    robot.face.setMouthOpen(0)
    await robot.motion.setPose(ZERO, 0.25)
  }

  const runGreet = async (run: number, zone: string): Promise<void> => {
    emit({ kind: 'run', run, zone, action_id: 'greet', phase: 'started' })
    let terminal: Terminal = 'completed'
    try {
      robot.ui.showFace()
      robot.face.setEmotion(Emotion.HAPPY)
      await robot.motion.setPose(NOD, 0.35)
      await wait(1700)
      await neutral()
    } catch {
      terminal = 'failed'
      try { await neutral() } catch { /* Preserve the original failed terminal. */ }
    }
    terminal = renderTerminal(showScreen, terminal)
    if (interaction.finish(run, terminal) === null) return
    emit({ kind: 'run', run, zone, action_id: 'greet', phase: terminal })
  }

  const panel = robot.input.touchPanel
  if (!panel) {
    showScreen('unavailable')
    emit({ kind: 'input', phase: 'unavailable' })
    return
  }

  panel.subscribe((event) => {
    const accepted = interaction.accept(event)
    emit({ kind: 'touch-panel', gesture: event.gesture, ticks: event.ticks, tap_position: event.tap?.position, accepted: accepted !== null })
    if (accepted) void runGreet(accepted.run, accepted.zone)
  })
  showScreen('ready')
  emit({ kind: 'ready', action_id: 'greet' })
}
