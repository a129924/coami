import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TouchFeedback } from './touch-feedback.ts'

test('TC06/08 only validated MOD observation counts; reject stale session; retain duplicate MOD reports for auditing', () => {
  const f = new TouchFeedback()
  f.start(4)
  assert.equal(f.ingest('browser forwardSwipe'), false)
  assert.equal(f.ingest('COAMI16|{"kind":"touch","session":3,"operation":1,"sample":2,"gesture":"forwardSwipe","ticks":10}'), false)
  const line='COAMI16|{"kind":"touch","session":4,"operation":1,"sample":2,"gesture":"forwardSwipe","ticks":10}'
  assert.equal(f.ingest(line), true)
  assert.equal(f.ingest(line), true)
  assert.equal(f.forward, 2)
  assert.equal(f.operations.get('4:1')?.forward, 2)
  assert.equal(f.ingest('COAMI16|{"kind":"touch","session":4,"operation":1,"sample":3,"gesture":"release","ticks":11}'), true)
  assert.equal(f.forward, 2)
  f.start(5)
  assert.equal(f.forward, 2)
  assert.equal(f.ingest(line), false)
  assert.equal(f.ingest('COAMI16|{"kind":"touch","session":5,"operation":1,"sample":2,"gesture":"invented","ticks":12}'), false)
  assert.equal(f.ingest('COAMI16|not json'), false)
})
