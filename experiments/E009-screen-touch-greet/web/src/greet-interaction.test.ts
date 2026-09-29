import assert from 'node:assert/strict'
import test from 'node:test'

import { GreetInteraction } from '../../mod/greet-interaction.ts'

test('one valid press and release starts one run, completed result is correlated', () => {
  const interaction = new GreetInteraction()
  assert.equal(interaction.begin(0, 40, 40), true)
  assert.equal(interaction.end(0), 1)
  assert.equal(interaction.end(0), null)
  assert.equal(interaction.finish(1, 'completed'), 'completed')
  assert.equal(interaction.result, 'completed')
})

test('outside, moved, and cancelled touches do not start a run', () => {
  const interaction = new GreetInteraction()
  assert.equal(interaction.end(0), null)
  assert.equal(interaction.begin(0, 40, 40), true)
  interaction.move(0, 70, 40)
  assert.equal(interaction.end(0), null)
  assert.equal(interaction.begin(0, 40, 40), true)
  interaction.cancel(0)
  assert.equal(interaction.end(0), null)
  assert.equal(interaction.result, null)
})

test('a moved-away touch clears its press even if the simulator omits touch end', () => {
  const interaction = new GreetInteraction()
  interaction.begin(0, 40, 40)
  interaction.move(0, -100, -100)
  assert.equal(interaction.begin(0, 40, 40), true)
  assert.equal(interaction.end(0), 1)
})

test('busy touch is ignored and never queued; a terminal run allows a new tap', () => {
  const interaction = new GreetInteraction()
  interaction.begin(0, 40, 40)
  assert.equal(interaction.end(0), 1)
  assert.equal(interaction.begin(1, 40, 40), false)
  assert.equal(interaction.end(1), null)
  assert.equal(interaction.finish(1, 'failed'), 'failed')
  assert.equal(interaction.result, 'failed')
  interaction.begin(0, 40, 40)
  assert.equal(interaction.end(0), 2)
  assert.equal(interaction.result, null)
})

test('late terminal from an old run or restart cannot claim success', () => {
  const interaction = new GreetInteraction()
  interaction.begin(0, 40, 40)
  assert.equal(interaction.end(0), 1)
  interaction.restart()
  assert.equal(interaction.finish(1, 'completed'), null)
  assert.equal(interaction.result, null)
  interaction.begin(0, 40, 40)
  assert.equal(interaction.end(0), 2)
  assert.equal(interaction.finish(1, 'completed'), null)
  assert.equal(interaction.finish(2, 'completed'), 'completed')
})
