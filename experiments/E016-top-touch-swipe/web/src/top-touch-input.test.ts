import { test } from 'node:test'
import assert from 'node:assert/strict'
import { positionSample, TopTouchInput } from './top-touch-input.ts'
import { GestureRecognizer } from '../generated/pinned-stack-chan/firmware/host/modules/input/touch-panel-gesture.ts'

function harness(limit = 4096) {
  const input = new TopTouchInput(7, limit)
  input.setReady()
  const recognizer = new GestureRecognizer()
  const events: { gesture: string; operation: number; ticks: number; tap?: { durationMs: number } }[] = []
  const poll = () => {
    input.beginSample()
    const meta = [input.meta(0), input.meta(1), input.meta(2)]
    const e = recognizer.update([input.read(0), input.read(1), input.read(2)], input.ticks())
    if (e) events.push({ gesture: e.type, operation: meta[1]!, ticks: e.ticks, ...(e.tap ? { tap: e.tap } : {}) })
    input.completeSample()
  }
  const drain = () => { while (input.pending) poll() }
  return { input, events, poll, drain }
}

test('TC04 raw mapping endpoint/midpoint, clamp and SDK exact boundaries', () => {
  assert.deepEqual(positionSample(0), [100, 0, 0])
  assert.deepEqual(positionSample(.5), [0, 100, 0])
  assert.deepEqual(positionSample(1), [0, 0, 100])
  assert.deepEqual(positionSample(-2), [100, 0, 0])
  for (const end of [.2, .8]) {
    const channels = positionSample(end)
    assert.equal(Math.abs(channels[2]! - channels[0]!), 60, 'fixture must reach exactly ±60 from center')
    const r = new GestureRecognizer()
    r.update(positionSample(.5), 0)
    assert.equal(r.update(positionSample(end), 10), undefined)
    const beyond = end < .5 ? .19 : .81
    assert.equal(r.update(positionSample(beyond), 20)?.type, end < .5 ? 'backwardSwipe' : 'forwardSwipe')
  }
})

test('TC01/02 SDK direction; hold/reverse/release do not duplicate', () => {
  for (const [start, end, direction] of [[0, 1, 'forwardSwipe'], [1, 0, 'backwardSwipe']] as const) {
    const h = harness()
    assert.equal(h.input.down(1, true, start, 1), true)
    h.input.move(1, end, 12)
    h.drain()
    h.poll(); h.poll()
    h.input.move(1, start, 20)
    h.input.up(1, start, 30)
    h.drain()
    assert.deepEqual(h.events.map(e => e.gesture), ['press', direction, 'release'])
    assert.equal(new Set(h.events.map(e => e.operation)).size, 1)
  }
})

test('TC03 accepts consecutive contacts while first release is pending, never merges', () => {
  const h = harness()
  h.input.down(1, true, 0, 1); h.input.up(1, 1, 9)
  assert.equal(h.input.down(2, true, 1, 10), true)
  h.input.up(2, 0, 18); h.drain()
  assert.deepEqual(h.events.map(e => [e.operation, e.gesture]), [[1,'press'],[1,'forwardSwipe'],[1,'release'],[2,'press'],[2,'backwardSwipe'],[2,'release']])
})

test('TC04 tap/short move no swipe; captured duration survives delayed consumption', () => {
  const h = harness()
  h.input.down(1, true, .5, 100); h.input.move(1, .52, 120); h.input.up(1, .52, 140); h.drain()
  assert.deepEqual(h.events.map(e => e.gesture), ['press','release'])
  assert.equal(h.events[1]?.tap?.durationMs, 40)
})

test('TC05 cancel removes queued movement but preserves observed swipe and recovery', () => {
  const h = harness()
  h.input.down(1, true, 0, 1); h.input.move(1, 1, 2); h.input.cancel(1, 3); h.drain()
  assert.deepEqual(h.events.map(e => e.gesture), ['press','release'])
  h.input.down(2, true, 0, 4); h.input.move(2, 1, 5); h.drain()
  h.input.move(2, 0, 6); h.input.cancel(2, 7); h.drain(); h.poll()
  assert.deepEqual(h.events.slice(2).map(e => e.gesture), ['press','forwardSwipe','release'])
  assert.equal(h.input.down(3, true, 1, 8), true)
  h.input.up(3, 0, 9); h.drain()
  assert.equal(h.events.at(-2)?.gesture, 'backwardSwipe')
})

test('TC05/07 idle holds sample, metadata is atomic through complete ack', () => {
  const h = harness()
  h.input.down(1, true, .1, 13); h.poll(); h.poll()
  assert.deepEqual(h.events.map(e => e.gesture), ['press'])
  h.input.move(1, .9, 25)
  h.input.beginSample()
  assert.deepEqual([h.input.meta(0),h.input.meta(1),h.input.meta(2)], [7,1,2])
  assert.equal(h.input.ticks(), 25)
  h.input.move(1, .8, 26)
  assert.equal(h.input.ticks(), 25)
  assert.equal(h.input.read(2), 80)
  h.input.completeSample()
  h.input.beginSample(); assert.equal(h.input.ticks(), 26); h.input.completeSample()
})

test('TC05 initializing, extra pointer, overflow and ack timeout are explicit', () => {
  const input = new TopTouchInput(1, 2)
  assert.equal(input.down(1, true, 0, 0), false)
  input.setReady()
  assert.equal(input.down(1, false, 0, 0), false)
  assert.equal(input.down(1, true, 0, 0), true)
  assert.equal(input.down(2, true, 1, 1), false)
  input.move(2, 1, 1); assert.equal(input.pending, 1)
  input.move(1, .2, 2); input.move(1, .3, 3)
  assert.equal(input.state, 'fault')
  assert.match(input.error, /overflow/)
  assert.equal(input.down(1, true, 0, 4), false)
  const h = harness()
  h.input.down(1, true, 0, 0)
  h.input.checkHealth(4000)
  assert.equal(h.input.state, 'fault')
})
