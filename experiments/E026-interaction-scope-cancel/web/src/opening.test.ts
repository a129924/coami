import test from 'node:test'
import assert from 'node:assert/strict'
import { runOpening } from './opening.ts'
for (const gateAt of [0, 1, 2, 3]) test(`cancel during opening stage ${gateAt} drains and disposes, never creates later resources`, async () => {
  let live = true, release!: () => void; const calls: string[] = []
  const gate = new Promise<void>(resolve => { release = resolve })
  const stages = [0, 1, 2, 3].map(i => async () => { calls.push(`stage-${i}`); if (i === gateAt) await gate })
  const opening = runOpening(stages, () => live, async () => { calls.push('disposed') })
  for (let i = 0; i < gateAt + 2; i++) await Promise.resolve()
  live = false; release()
  assert.equal(await opening, false)
  assert.deepEqual(calls, [...Array.from({ length: gateAt + 1 }, (_, i) => `stage-${i}`), 'disposed'])
})
test('an opening error disposes resources before rejection', async () => {
  let disposed = false
  await assert.rejects(runOpening([async () => { throw Error('boot failed') }], () => true, async () => { disposed = true }), /boot failed/)
  assert.equal(disposed, true)
})
