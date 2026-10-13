import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GazeControl, TARGETS, validTarget, type GazeEvent, type Motion } from '../../mod/gaze-control.ts'
function setup(fail = false) {
  const calls: unknown[] = [], events: GazeEvent[] = [], timers: (() => void)[] = []
  const motion: Motion = { lookAt: (point) => { calls.push(['look', point]); if (fail) throw Error('SDK failed') },
    lookAway: () => { calls.push(['away']) }, setPose: async (pose) => { calls.push(['prepare', pose]) } }
  const control = new GazeControl(motion, (event) => events.push(event), (done) => timers.push(done))
  return { control, calls, events, timers }
}
test('each preset uses lookAt with its actual coordinate, never setPose', async () => {
  for (const target of TARGETS) {
    const s = setup(); await s.control.run('look', target.id)
    assert.deepEqual(s.calls, [['look', [...target.point]]])
    assert.deepEqual(s.events.map(e => e.phase), ['begin', 'returned'])
    assert.equal(s.events[1]?.seq, 1); assert.equal(s.events[1]?.kind, 'look')
    s.timers[0]!(); assert.equal(s.events.at(-1)?.phase, 'window-ended')
  }
})
test('invalid coordinates and unknown target never reach SDK', async () => {
  for (const point of [[0,0,0], [1,2], [NaN,0,1], [1,Infinity,0], ['1',0,1], [1,1,1], null]) assert.equal(validTarget(point), false)
  for (const t of TARGETS) assert.equal(validTarget([...t.point]), true)
  const s=setup(); await s.control.run('look', 'unknown')
  assert.deepEqual(s.calls, []); assert.equal(s.events.at(-1)?.phase, 'rejected')
})
test('window prevents overlap; away and subsequent target get new sequence', async () => {
  const s=setup(); await s.control.run('look', 'left'); await s.control.run('away')
  assert.equal(s.calls.length,1); assert.equal(s.events.at(-1)?.phase,'rejected')
  s.timers.shift()!(); await s.control.run('away'); s.timers.shift()!(); await s.control.run('look','right')
  assert.deepEqual(s.calls,[['look',[0.5,0.5,0]],['away'],['look',[0.5,-0.5,0]]])
  assert.deepEqual(s.events.filter(e=>e.phase==='begin').map(e=>e.seq),[1,3,4])
})
test('synchronous failure is failed, never returned; window still isolates late traces', async () => {
  const s=setup(true); await s.control.run('look','up')
  assert.equal(s.events.at(-1)?.phase,'failed'); assert.match(s.events.at(-1)?.error??'',/SDK failed/)
  await s.control.run('look','down'); assert.equal(s.calls.length,1)
})
test('prepare calls lookAway then setPose, with separate preparation kind', async () => {
  const s=setup(); await s.control.run('prepare')
  assert.deepEqual(s.calls,[['away'],['prepare',{rotation:{y:0,p:0,r:0}}]])
  assert.equal(s.events[0]?.kind,'prepare')
})
