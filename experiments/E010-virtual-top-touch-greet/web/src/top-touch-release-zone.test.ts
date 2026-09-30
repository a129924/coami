import assert from 'node:assert/strict'
import test from 'node:test'
import { releaseZoneAt } from './top-touch-release-zone.ts'

test('uses final pointer coordinates to resolve a release zone', () => {
  const calls: Array<[number, number]> = []
  assert.equal(releaseZoneAt({ clientX: 42, clientY: 18 }, (x, y) => {
    calls.push([x, y])
    return 'right'
  }), 'right')
  assert.deepEqual(calls, [[42, 18]])
})

test('rejects a release outside the three top-touch zones', () => {
  assert.equal(releaseZoneAt({ clientX: 42, clientY: 18 }, () => undefined), null)
})
