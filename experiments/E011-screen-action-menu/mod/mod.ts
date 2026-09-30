import 'piu/MC'
import Timer from 'timer'
import { Emotion } from 'face-state'
import { ACTION_MENU, actionFor, type ActionId } from './action-catalog'
import { ActionMenuInteraction, MenuScrollState, menuFooterText, type Result, type Selection, type Terminal } from './action-menu-interaction'

type Pose = { rotation: { y: number; p: number; r: number } }
type Robot = {
  ui: { setMain(content: PiuContainer): void; showFace(): void }
  face: { setEmotion(value: number): void; setEyeOpen(key: 'left' | 'right', value: number): void; setMouthOpen(value: number): void }
  motion: { setPose(pose: Pose, duration: number): Promise<void> }
}

const ZERO: Pose = { rotation: { y: 0, p: 0, r: 0 } }
const pose = (y: number, p: number): Pose => ({ rotation: { y, p, r: 0 } })
const ROW_TOP = 50
const ROW_HEIGHT = 25
const VISIBLE_HEIGHT = 145
const emit = (message: Record<string, unknown>): void => trace(`COAMI11|${JSON.stringify(message)}\n`)
const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => { Timer.set(resolve, milliseconds) })

export function onContextCreated(robot: Robot): void {
  const interaction = new ActionMenuInteraction()
  const screenSkin = new Skin({ fill: '#f7f6f0' })
  const rowSkin = new Skin({ fill: '#dfe9e3' })
  const titleStyle = new Style({ font: 'k8x12-12', color: '#263538', horizontal: 'center', vertical: 'middle' })
  const rowStyle = new Style({ font: 'k8x12-12', color: '#263538', horizontal: 'left', vertical: 'middle' })
  const scroll = new MenuScrollState(Math.max(0, ACTION_MENU.length * ROW_HEIGHT - VISIBLE_HEIGHT))

  const actionAt = (y: number): ActionId | null => {
    if (y < ROW_TOP || y >= ROW_TOP + VISIBLE_HEIGHT) return null
    const index = Math.floor((y - ROW_TOP + scroll.offset) / ROW_HEIGHT)
    return ACTION_MENU[index]?.id ?? null
  }
  const resultText = (result: Result | null, activeLabel: string | null): string => {
    if (activeLabel) return `執行中：${activeLabel}`
    if (!result) return '選擇一個動作'
    const label = actionFor(result.actionId).label
    return result.status === 'completed' ? `${label}完成` : `${label}未完成`
  }

  const showMenu = (activeLabel: string | null = null, displayResult: Result | null = interaction.result): void => {
    const phase = activeLabel ? 'running' : displayResult?.status ?? 'ready'
    const rows: PiuContainer[] = []
    for (let index = 0; index < ACTION_MENU.length; index += 1) {
      const top = ROW_TOP + index * ROW_HEIGHT - scroll.offset
      if (top + ROW_HEIGHT <= ROW_TOP || top >= ROW_TOP + VISIBLE_HEIGHT) continue
      rows.push(new Container(null, {
        name: `action-row-${ACTION_MENU[index].id}`, left: 12, right: 12, top, height: ROW_HEIGHT - 2, skin: rowSkin,
        contents: [new Label(null, { left: 8, right: 4, top: 0, bottom: 0, string: ACTION_MENU[index].label, style: rowStyle })],
      }))
    }
    const root = new Container(null, {
      name: 'action-menu-screen', left: 0, right: 0, top: 0, bottom: 0, skin: screenSkin, active: true,
      contents: [
        new Label(null, { left: 8, right: 8, top: 7, height: 30, string: resultText(displayResult, activeLabel), style: titleStyle }),
        ...rows,
        new Label(null, { left: 8, right: 8, top: 204, height: 27, string: menuFooterText(phase), style: titleStyle }),
      ],
      Behavior: class extends Behavior {
        onTouchBegan(_content: PiuContainer, touchId: number, _x: number, y: number): void {
          if (scroll.recover(touchId)) {
            // A viewport leave can suppress Piu's cancel/end callbacks. No menu
            // redraw occurred, so restore the offset shown on the screen.
            emit({ kind: 'touch', phase: 'recovered', touch_id: touchId })
          }
          const actionId = actionAt(y)
          const accepted = interaction.begin(touchId, actionId, y)
          if (accepted) scroll.begin(touchId, y)
          emit({ kind: 'touch', phase: 'began', touch_id: touchId, action_id: actionId, accepted })
        }
        onTouchMoved(_content: PiuContainer, touchId: number, _x: number, y: number): void {
          interaction.move(touchId, y)
          if (scroll.move(touchId, y)) emit({ kind: 'scroll', offset: scroll.offset })
        }
        onTouchCancelled(_content: PiuContainer, touchId: number): void {
          interaction.cancel(touchId)
          scroll.cancel(touchId)
          emit({ kind: 'touch', phase: 'cancelled', touch_id: touchId })
        }
        onTouchEnded(_content: PiuContainer, touchId: number, _x: number, y: number): void {
          interaction.move(touchId, y)
          if (scroll.move(touchId, y)) emit({ kind: 'scroll', offset: scroll.offset })
          const selection = interaction.end(touchId, actionAt(y))
          const scrolled = scroll.end(touchId)
          emit({ kind: 'touch', phase: 'ended', touch_id: touchId, run_seq: selection?.runSeq ?? null, action_id: selection?.actionId ?? null })
          if (scrolled) showMenu()
          if (!selection) return
          const label = actionFor(selection.actionId).label
          showMenu(label)
          Timer.set(() => { void runAction(selection) }, 0)
        }
      },
    })
    robot.ui.setMain(root)
    emit({ kind: 'screen', phase, offset: scroll.offset })
  }

  const neutral = async (): Promise<void> => {
    robot.face.setEmotion(Emotion.NEUTRAL)
    robot.face.setEyeOpen('left', 1)
    robot.face.setEyeOpen('right', 1)
    robot.face.setMouthOpen(0)
    await robot.motion.setPose(ZERO, 0.25)
  }

  const execute = async (actionId: ActionId): Promise<void> => {
    if (actionId === 'face.neutral') { robot.face.setEmotion(Emotion.ANGRY); await wait(400); robot.face.setEmotion(Emotion.NEUTRAL); await wait(900) }
    else if (actionId === 'face.angry') { robot.face.setEmotion(Emotion.ANGRY); await wait(1500) }
    else if (actionId === 'face.sad') { robot.face.setEmotion(Emotion.SAD); await wait(1500) }
    else if (actionId === 'face.happy') { robot.face.setEmotion(Emotion.HAPPY); await wait(1500) }
    else if (actionId === 'face.sleepy') { robot.face.setEmotion(Emotion.SLEEPY); await wait(1500) }
    else if (actionId === 'face.blink') { robot.face.setEyeOpen('left', 0); robot.face.setEyeOpen('right', 0); await wait(900) }
    else if (actionId === 'face.wink_left') { robot.face.setEyeOpen('left', 0); await wait(900) }
    else if (actionId === 'face.wink_right') { robot.face.setEyeOpen('right', 0); await wait(900) }
    else if (actionId === 'face.mouth_open') { robot.face.setMouthOpen(0.8); await wait(900) }
    else if (actionId === 'head.left') { await robot.motion.setPose(pose(Math.PI / 6, 0), 0.3); await wait(900) }
    else if (actionId === 'head.right') { await robot.motion.setPose(pose(-Math.PI / 6, 0), 0.3); await wait(900) }
    else if (actionId === 'head.up') { await robot.motion.setPose(pose(0, -Math.PI / 6), 0.3); await wait(900) }
    else if (actionId === 'head.down') { await robot.motion.setPose(pose(0, Math.PI / 32), 0.3); await wait(900) }
    else if (actionId === 'head.nod') { await robot.motion.setPose(pose(0, 0.28), 0.35); await wait(900) }
    else if (actionId === 'head.shake') { await robot.motion.setPose(pose(0.25, 0), 0.25); await wait(450); await robot.motion.setPose(pose(-0.25, 0), 0.25); await wait(450) }
    else if (actionId === 'head.center') { await robot.motion.setPose(pose(Math.PI / 6, 0), 0.25); await wait(900); await robot.motion.setPose(ZERO, 0.25); await wait(900) }
    else if (actionId === 'greet') { robot.face.setEmotion(Emotion.HAPPY); await robot.motion.setPose(pose(0, 0.28), 0.35); await wait(1700) }
    await neutral()
  }

  const runAction = async (selection: Selection): Promise<void> => {
    emit({ kind: 'run', run_seq: selection.runSeq, action_id: selection.actionId, phase: 'started' })
    let terminal: Terminal = 'completed'
    try { robot.ui.showFace(); await execute(selection.actionId) }
    catch { terminal = 'failed'; try { await neutral() } catch { /* preserve failed result */ } }
    try { showMenu(null, { actionId: selection.actionId, status: terminal }) }
    catch {
      terminal = 'failed'
      emit({ kind: 'screen', phase: 'failed', error_code: 'result_render_failed' })
      try { showMenu(null, { actionId: selection.actionId, status: terminal }) } catch { /* terminal trace remains truthful */ }
    }
    if (interaction.finish(selection.runSeq, selection.actionId, terminal) !== null) {
      emit({ kind: 'run', run_seq: selection.runSeq, action_id: selection.actionId, phase: terminal })
    }
  }

  showMenu()
  emit({ kind: 'ready', action_ids: ACTION_MENU.map((action) => action.id) })
}
