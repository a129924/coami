import assert from 'node:assert/strict'
import test from 'node:test'

import { ACTION_MENU } from '../../mod/action-catalog.ts'
import { ActionMenuInteraction, MenuScrollState, menuFooterText, rowTopInViewport, visibleRowIndex } from '../../mod/action-menu-interaction.ts'

const hiddenTarget = ACTION_MENU.at(-1)!

test('a valid visible selection owns exactly one matching run and result', () => {
  const interaction = new ActionMenuInteraction()
  assert.equal(interaction.begin(1, hiddenTarget.id, { x: 100, y: 90 }), true)
  assert.deepEqual(interaction.end(1, hiddenTarget.id), { runSeq: 1, actionId: hiddenTarget.id })
  assert.equal(interaction.finish(1, hiddenTarget.id, 'completed'), 'completed')
  assert.equal(interaction.result?.status, 'completed')
})

test('scroll, outside, moved-away, and cancelled touches cannot select an action', () => {
  const interaction = new ActionMenuInteraction()
  assert.equal(interaction.begin(1, null, { x: 100, y: 90 }), true)
  assert.equal(interaction.end(1, null), null)

  assert.equal(interaction.begin(2, hiddenTarget.id, { x: 100, y: 90 }), true)
  interaction.move(2, { x: 100, y: 130 })
  assert.equal(interaction.end(2, hiddenTarget.id), null)

  assert.equal(interaction.begin(3, hiddenTarget.id, { x: 100, y: 90 }), true)
  interaction.cancel(3)
  assert.equal(interaction.end(3, hiddenTarget.id), null)
})

test('a changed row cannot be accepted as the original visible item', () => {
  const interaction = new ActionMenuInteraction()
  assert.equal(interaction.begin(1, ACTION_MENU[0].id, { x: 100, y: 90 }), true)
  assert.equal(interaction.end(1, ACTION_MENU[1].id), null)
})

test('a new begin with the same simulator touch ID recovers after a dropped cancel callback', () => {
  const interaction = new ActionMenuInteraction()
  assert.equal(interaction.begin(0, ACTION_MENU[0].id, { x: 100, y: 90 }), true)
  assert.equal(interaction.begin(0, ACTION_MENU[1].id, { x: 100, y: 90 }), true)
  assert.deepEqual(interaction.end(0, ACTION_MENU[1].id), { runSeq: 1, actionId: ACTION_MENU[1].id })
})

test('busy selections are ignored and do not queue another run', () => {
  const interaction = new ActionMenuInteraction()
  interaction.begin(1, ACTION_MENU[0].id, { x: 100, y: 90 })
  assert.deepEqual(interaction.end(1, ACTION_MENU[0].id), { runSeq: 1, actionId: ACTION_MENU[0].id })
  assert.equal(interaction.begin(2, hiddenTarget.id, { x: 100, y: 90 }), false)
  assert.equal(interaction.finish(1, ACTION_MENU[0].id, 'failed'), 'failed')
  assert.equal(interaction.begin(3, hiddenTarget.id, { x: 100, y: 90 }), true)
  assert.deepEqual(interaction.end(3, hiddenTarget.id), { runSeq: 2, actionId: hiddenTarget.id })
})

test('late or mismatched terminals cannot overwrite the current result', () => {
  const interaction = new ActionMenuInteraction()
  interaction.begin(1, ACTION_MENU[0].id, { x: 100, y: 90 })
  interaction.end(1, ACTION_MENU[0].id)
  assert.equal(interaction.finish(1, hiddenTarget.id, 'completed'), null)
  assert.equal(interaction.result, null)
  assert.equal(interaction.finish(1, ACTION_MENU[0].id, 'cancelled'), 'cancelled')
  interaction.begin(2, hiddenTarget.id, { x: 100, y: 90 })
  interaction.end(2, hiddenTarget.id)
  assert.equal(interaction.finish(1, ACTION_MENU[0].id, 'completed'), null)
  assert.equal(interaction.finish(2, hiddenTarget.id, 'completed'), 'completed')
})

test('the local menu is exactly the E005 visual-PASS action set', () => {
  assert.deepEqual(ACTION_MENU.map((action) => action.id), [
    'face.neutral', 'face.angry', 'face.sad', 'face.happy', 'face.sleepy',
    'face.blink', 'face.wink_left', 'face.wink_right', 'face.mouth_open',
    'head.left', 'head.right', 'head.up', 'head.down', 'head.nod', 'head.shake', 'head.center', 'greet',
  ])
  assert.equal(ACTION_MENU.some((action) => ['face.doubtful', 'face.cold', 'face.hot'].includes(action.id)), false)
})

test('cancelled drag restores the offset used to identify visible rows', () => {
  const scroll = new MenuScrollState(280)
  assert.equal(scroll.begin(0, 100), true)
  assert.equal(scroll.move(0, 40), true)
  assert.equal(scroll.offset, 60)
  scroll.cancel(0)
  assert.equal(scroll.offset, 0)
  assert.equal(scroll.begin(0, 100), true)
  assert.equal(scroll.offset, 0)
})

test('dropped cancel callback recovers the displayed offset before next touch', () => {
  const scroll = new MenuScrollState(280)
  scroll.begin(0, 100)
  scroll.move(0, 30)
  assert.equal(scroll.offset, 70)
  assert.equal(scroll.recover(0), true)
  assert.equal(scroll.offset, 0)
  assert.equal(scroll.begin(0, 100), true)
  scroll.move(0, 20)
  assert.equal(scroll.end(0), true)
  assert.equal(scroll.offset, 80)
})

test('terminal screen footer never claims the completed run is still busy', () => {
  assert.equal(menuFooterText('running'), '請等待完成')
  for (const phase of ['ready', 'completed', 'failed', 'cancelled'] as const) {
    assert.equal(menuFooterText(phase), '滑動瀏覽，點選執行')
  }
})

test('partially visible rows stay inside the clipped menu viewport', () => {
  assert.equal(rowTopInViewport(3, 98), null)
  assert.equal(rowTopInViewport(4, 98), 2)
  assert.equal(rowTopInViewport(9, 98), 127)
  assert.equal(rowTopInViewport(10, 98), null)
})

test('hit testing excludes title, side gutters, row gaps, and hidden row pixels', () => {
  assert.equal(visibleRowIndex(100, 49, 98, ACTION_MENU.length), null)
  assert.equal(visibleRowIndex(11, 54, 98, ACTION_MENU.length), null)
  assert.equal(visibleRowIndex(308, 54, 98, ACTION_MENU.length), null)
  assert.equal(visibleRowIndex(100, 50, 98, ACTION_MENU.length), null)
  assert.equal(visibleRowIndex(100, 75, 98, ACTION_MENU.length), null)
  assert.equal(visibleRowIndex(100, 53, 98, ACTION_MENU.length), 4)
  assert.equal(visibleRowIndex(100, 195, 98, ACTION_MENU.length), null)
})

test('horizontal drag beyond tap slop never selects its original row', () => {
  const interaction = new ActionMenuInteraction()
  assert.equal(interaction.begin(1, ACTION_MENU[0].id, { x: 100, y: 90 }), true)
  interaction.move(1, { x: 130, y: 90 })
  assert.equal(interaction.end(1, ACTION_MENU[0].id), null)
})
