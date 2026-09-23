import assert from 'node:assert/strict'
import test from 'node:test'
import { Action, GreetingSlot, decodeCommand } from './protocol.ts'

test('direct greet command has no event ID', () => {
  assert.deepEqual(decodeCommand({
    type: 'robot.command', command_id: 'direct-1', action: 'greet',
  }), { commandId: 'direct-1', action: Action.GREET, eventId: undefined })
})

test('E003 event command retains event ID', () => {
  assert.deepEqual(decodeCommand({
    type: 'robot.command', command_id: 'event-1', event_id: 'event-id', action: 'greet',
  }), { commandId: 'event-1', action: Action.GREET, eventId: 'event-id' })
})

test('unknown action and malformed correlation are rejected', () => {
  assert.equal(decodeCommand({ type: 'robot.command', command_id: 'x', action: 'wave' }), null)
  assert.equal(decodeCommand({ type: 'robot.command', command_id: '', action: 'greet' }), null)
  assert.equal(decodeCommand({ type: 'robot.command', command_id: 'x', event_id: 4, action: 'greet' }), null)
})

test('bridge local busy survives session replacement until old greet ends', () => {
  const slot = new GreetingSlot()
  assert.equal(slot.begin('old-command', 1, 'direct'), true)
  assert.equal(slot.begin('new-command', 2, 'direct'), false)
  assert.deepEqual(slot.current, {
    commandId: 'old-command', session: 1, origin: 'direct',
  })
  assert.deepEqual(slot.finish(), {
    commandId: 'old-command', session: 1, origin: 'direct',
  })
  assert.equal(slot.begin('new-command', 2, 'direct'), true)
})
