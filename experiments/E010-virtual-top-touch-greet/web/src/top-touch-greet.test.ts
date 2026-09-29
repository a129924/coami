import assert from 'node:assert/strict'
import test from 'node:test'

import { TopTouchGreet, type TouchPanelEvent } from '../../mod/top-touch-greet.ts'

const tap = (ticks: number, position = 0): TouchPanelEvent => ({
  kind: 'touch-panel',
  gesture: 'release',
  position: 0,
  intensity: 0,
  ticks,
  tap: { position, durationMs: 1, maxMovement: 0 },
})

test('each valid zone accepts one run and correlates its completed terminal', () => {
  for (const [position, expectedZone] of [[-100, 'left'], [0, 'center'], [100, 'right']] as const) {
    const interaction = new TopTouchGreet()
    const accepted = interaction.accept(tap(1, position))
    assert.deepEqual(accepted, { run: 1, zone: expectedZone })
    assert.equal(interaction.finish(1, 'completed'), 'completed')
    assert.equal(interaction.result, 'completed')
  }
})

test('invalid events and non-monotonic ticks never start a run', () => {
  const interaction = new TopTouchGreet()
  const invalid: TouchPanelEvent[] = [
    { ...tap(1), kind: 'touch' },
    { ...tap(2), gesture: 'press' },
    { ...tap(3), tap: undefined },
    tap(4, 25),
    { ...tap(5), tap: { position: 0, durationMs: 301, maxMovement: 0 } },
    { ...tap(6), tap: { position: 0, durationMs: 1, maxMovement: 16 } },
    tap(Number.NaN),
  ]
  for (const event of invalid) assert.equal(interaction.accept(event), null)
  assert.deepEqual(interaction.accept(tap(7)), { run: 1, zone: 'center' })
  assert.equal(interaction.accept(tap(7, 100)), null)
  assert.equal(interaction.accept(tap(6, -100)), null)
})

test('busy input never queues and a matching terminal enables the next tap', () => {
  const interaction = new TopTouchGreet()
  assert.deepEqual(interaction.accept(tap(1)), { run: 1, zone: 'center' })
  assert.equal(interaction.accept(tap(2, -100)), null)
  assert.equal(interaction.finish(99, 'completed'), null)
  assert.equal(interaction.finish(1, 'failed'), 'failed')
  assert.deepEqual(interaction.accept(tap(3, 100)), { run: 2, zone: 'right' })
})

test('an old terminal cannot replace a current run result', () => {
  const interaction = new TopTouchGreet()
  assert.deepEqual(interaction.accept(tap(1)), { run: 1, zone: 'center' })
  assert.equal(interaction.finish(1, 'completed'), 'completed')
  assert.deepEqual(interaction.accept(tap(2)), { run: 2, zone: 'center' })
  assert.equal(interaction.finish(1, 'failed'), null)
  assert.equal(interaction.result, null)
})
