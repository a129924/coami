import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SwipeObserver, type Snapshot } from './observer.ts'
const meta: Snapshot = { session: 2, operation: 1, sampleId: 10, ticks: 123, terminal: false, queued: true }
test('MOD records original events and counts only SDK Swipe callbacks', () => {
  const observer = new SwipeObserver()
  assert.equal(observer.receive({ kind: 'touchPanel', gesture: 'press', ticks: 123 }, meta).count, 0)
  const raw = { kind: 'touchPanel', gesture: 'forwardSwipe', ticks: 123, position: 70 }
  const record = observer.receive(raw, meta)
  assert.equal(record.count, 1)
  assert.deepEqual(record.event, raw)
  assert.deepEqual(record.meta, meta)
  meta.sampleId = 11
  assert.equal(record.meta.sampleId, 10)
  assert.equal(observer.receive({ ...raw, gesture: 'backwardSwipe' }, meta).count, 2)
  assert.equal(observer.receive({ ...raw, gesture: 'backwardSwipe' }, meta).count, 3)
  assert.equal(observer.receive({ ...raw, gesture: 'release' }, meta).count, 3)
})
test('missing metadata, tick mismatch and stale session are rejected', () => {
  const observer = new SwipeObserver()
  const event = { kind: 'touchPanel', gesture: 'press', ticks: 123 }
  assert.throws(() => observer.receive(event, undefined))
  observer.receive(event, meta)
  assert.throws(() => observer.receive({ ...event, ticks: 122 }, meta))
  assert.throws(() => observer.receive(event, { ...meta, session: 9 }))
})
