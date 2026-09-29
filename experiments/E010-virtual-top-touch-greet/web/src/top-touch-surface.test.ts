import assert from 'node:assert/strict'
import test from 'node:test'

import { TopTouchSurface, type SurfacePointer } from './top-touch-surface.ts'

const pointer = (overrides: Partial<SurfacePointer> = {}): SurfacePointer => ({
  pointerId: 7,
  isPrimary: true,
  clientX: 10,
  clientY: 20,
  timeStamp: 100,
  ...overrides,
})

test('a same-zone primary tap dispatches its matching top position once', () => {
  const emitted: number[] = []
  const surface = new TopTouchSurface((position) => emitted.push(position))
  assert.equal(surface.begin('left', pointer()), true)
  assert.equal(surface.end('left', pointer({ timeStamp: 220, clientX: 20 })), true)
  assert.deepEqual(emitted, [-100])
})

test('secondary, long, moved, cancelled, and cross-zone pointers do not dispatch', () => {
  const emitted: number[] = []
  const surface = new TopTouchSurface((position) => emitted.push(position))
  assert.equal(surface.begin('center', pointer({ isPrimary: false })), false)
  assert.equal(surface.begin('center', pointer()), true)
  assert.equal(surface.end('right', pointer({ timeStamp: 120 })), false)
  assert.equal(surface.begin('center', pointer()), true)
  surface.move(pointer({ clientX: 30 }))
  assert.equal(surface.end('center', pointer({ timeStamp: 120, clientX: 30 })), false)
  assert.equal(surface.begin('center', pointer()), true)
  assert.equal(surface.end('center', pointer({ timeStamp: 401 })), false)
  assert.equal(surface.begin('center', pointer()), true)
  surface.cancel(pointer())
  assert.equal(surface.end('center', pointer({ timeStamp: 130 })), false)
  assert.deepEqual(emitted, [])
})

test('a second pointer cannot replace the active pointer', () => {
  const emitted: number[] = []
  const surface = new TopTouchSurface((position) => emitted.push(position))
  assert.equal(surface.begin('right', pointer()), true)
  assert.equal(surface.begin('right', pointer({ pointerId: 8 })), false)
  assert.equal(surface.end('right', pointer({ pointerId: 8, timeStamp: 120 })), false)
  assert.equal(surface.end('right', pointer({ timeStamp: 120 })), true)
  assert.deepEqual(emitted, [100])
})
