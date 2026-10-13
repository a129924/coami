import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GestureRecognizer } from '../../../../vendor/stack-chan/firmware/host/modules/input/touch-panel-gesture.ts'
import { TopSwipeInput, positionSample, type Tuple } from './input.ts'

function rig() {
  let time = 0
  const input = new TopSwipeInput(7, () => time)
  const recognizer = new GestureRecognizer()
  const events: { gesture: string; tuple: Tuple; tap?: unknown }[] = []
  const poll = () => {
    const tuple = input.take()
    const gesture = recognizer.update(tuple.sample, tuple.meta.ticks)
    if (gesture) events.push({ gesture: gesture.type, tuple, tap: gesture.tap })
    input.consumed(tuple.meta.session, tuple.meta.sampleId)
    return tuple
  }
  input.modReady()
  poll()
  return { input, poll, events, time: (n: number) => { time = n } }
}

test('continuous weighted positions round-trip through pinned recognizer', () => {
  const sdk = new GestureRecognizer()
  for (let p = -100; p <= 100; p++) assert.equal(sdk.getPosition(positionSample(p)), p)
  assert.throws(() => positionSample(NaN))
})
for (const delta of [-61, -60, 60, 61]) {
  test(`SDK strict threshold ${delta}`, () => {
    const r = rig()
    assert.equal(r.input.begin(1, 0), true)
    r.input.move(1, delta)
    r.input.end(1)
    while (r.input.pending > 0) r.poll()
    assert.deepEqual(r.events.map(e => e.gesture), Math.abs(delta) > 60
      ? ['press', delta > 0 ? 'forwardSwipe' : 'backwardSwipe', 'release'] : ['press', 'release'])
  })
}
test('one swipe per hold, including reversal; zero separates independent strokes', () => {
  const r = rig()
  r.input.begin(1, -100); r.poll()
  r.input.move(1, 0); r.poll()
  r.input.move(1, 100); r.poll()
  r.input.move(1, -100); r.poll(); r.poll()
  r.input.end(1); r.poll()
  r.input.begin(2, 100); r.poll()
  r.input.move(2, 0); r.poll()
  r.input.end(2); r.poll()
  assert.deepEqual(r.events.map(e => e.gesture), ['press','forwardSwipe','release','press','backwardSwipe','release'])
})
test('tap and small movement do not swipe; idle clock advances long press duration', () => {
  const r = rig()
  r.input.begin(1, 0); r.poll()
  r.time(500); assert.equal(r.poll().meta.ticks, 500)
  r.input.end(1); r.poll()
  assert.equal(r.events.at(-1)?.tap, undefined)
  r.input.begin(2, 0); r.input.move(2, 10); r.input.end(2)
  while (r.input.pending) r.poll()
  assert.equal(r.events.filter(e => e.gesture.includes('Swipe')).length, 0)
  assert.ok(r.events.at(-1)?.tap)
})
test('readiness requires new zero after MOD ready, not an idle ack', () => {
  const input = new TopSwipeInput(1, () => 0)
  const old = input.take()
  input.consumed(1, old.meta.sampleId)
  assert.equal(input.state, 'initializing')
  assert.equal(input.begin(1, 0), false)
  input.modReady()
  const zero = input.take()
  input.consumed(99, zero.meta.sampleId)
  assert.equal(input.state, 'initializing')
  input.consumed(1, zero.meta.sampleId)
  assert.equal(input.state, 'ready')
})
test('normal up then lost capture retains FIFO and blocks new pointer until zero ack', () => {
  const r = rig()
  r.input.begin(1, -100); r.input.move(1, 100); r.input.end(1)
  r.input.cancel(1)
  assert.equal(r.input.state, 'cleaning')
  assert.equal(r.input.begin(2, 0), false)
  while (r.input.pending) r.poll()
  assert.equal(r.input.state, 'ready')
  assert.deepEqual(r.events.map(e => e.gesture), ['press','forwardSwipe','release'])
})
for (const consumedPress of [false, true]) {
  test(`cancel removes queued moves and recovers (press consumed=${consumedPress})`, () => {
    const r = rig()
    r.input.begin(1, -100)
    if (consumedPress) r.poll()
    r.input.move(1, 100); r.input.cancel(1)
    while (r.input.pending) r.poll()
    assert.deepEqual(r.events.map(e => e.gesture), ['press','release'])
    assert.equal(r.input.begin(2, 100), true)
    r.input.move(2, -100); r.input.end(2)
    while (r.input.pending) r.poll()
    assert.equal(r.events.filter(e => e.gesture === 'backwardSwipe').length, 1)
  })
}
test('cancel keeps an already recognized swipe without adding one', () => {
  const r = rig()
  r.input.begin(1, -100); r.poll(); r.input.move(1, 100); r.poll()
  r.input.move(1, -100); r.input.cancel(1)
  while (r.input.pending) r.poll()
  assert.equal(r.events.filter(e => e.gesture.includes('Swipe')).length, 1)
})
test('wrong pointer and additional pointers cannot mutate active operation', () => {
  const r = rig()
  r.input.begin(1, 0)
  assert.equal(r.input.begin(2, 0), false)
  r.input.move(2, 100); r.input.end(2); r.input.cancel(2)
  assert.equal(r.input.pending, 1)
  assert.equal(r.input.state, 'active')
})
test('atomic sample metadata and FIFO timestamps; duplicate millisecond ticks are valid', () => {
  const r = rig()
  r.input.begin(1, -100); r.time(12); r.input.move(1, 0); r.input.move(1, 100)
  const a = r.poll(), b = r.poll(), c = r.poll()
  assert.deepEqual([a.meta.ticks,b.meta.ticks,c.meta.ticks], [0,12,12])
  assert.equal(a.meta.operation, c.meta.operation)
  assert.equal(new Set([a.meta.sampleId,b.meta.sampleId,c.meta.sampleId]).size, 3)
  assert.deepEqual([a.sample,b.sample,c.sample], [[100,0,0],[0,100,0],[0,0,100]])
})
test('stale or pre-consumption zero acknowledgement cannot open the barrier', () => {
  const r = rig()
  r.input.begin(1, 0); r.input.end(1)
  r.input.consumed(7, 999)
  assert.equal(r.input.state, 'cleaning')
  r.poll()
  assert.equal(r.input.state, 'cleaning')
  const terminal = r.input.take()
  r.input.consumed(6, terminal.meta.sampleId)
  assert.equal(r.input.state, 'cleaning')
  r.input.consumed(7, terminal.meta.sampleId)
  assert.equal(r.input.state, 'ready')
})
test('overflow supplies zero but remains error; runtime failure stays disabled', () => {
  const r = rig()
  r.input.begin(1, 0)
  for (let i=0;i<128;i++) r.input.move(1, i%20)
  assert.equal(r.input.state, 'error')
  while (r.input.pending) r.poll()
  assert.equal(r.input.state, 'error')
  assert.equal(r.input.begin(2, 0), false)
  r.input.fail('runtime stopped')
  assert.equal(r.input.state, 'error')
})
