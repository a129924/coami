import test from 'node:test'
import assert from 'node:assert/strict'
import { ScopeController, type Operation, type Token } from './scope-controller.ts'

const deferred = () => { let resolve!: () => void; let reject!: (e: Error) => void; const promise = new Promise<void>((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function fixture() {
  let now = 0
  const timers = new Map<number, { due: number; run: () => void }>(); let serial = 0
  const local = deferred(); const calls: string[] = []; let stopped!: (at: number) => void
  const controller = new ScopeController({ runEpoch: 'run', robotId: 'A', now: () => now,
    later: (run, ms) => { const id = ++serial; timers.set(id, { due: now + ms, run }); return () => { timers.delete(id) } },
    stop: (_token, mark) => { calls.push('local'); stopped = mark; return local.promise },
    notify: () => { calls.push('server') }, record: () => {},
  })
  const token = controller.beginScope('old'); controller.activate(token)
  return { controller, token, local, calls, stopped: (at = now) => { now = at; stopped(at) }, advance: (t: number) => { now = t; for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.run() } } }
}
for (let repeat = 1; repeat <= 3; repeat++) {
  for (const first of ['robot', 'server'] as const) test(`barrier ${first} first, repeat ${repeat}`, async () => {
    const f = fixture(), op = f.controller.cancel('cancel')!
    assert.deepEqual(f.calls, ['local', 'server']); assert.equal(f.controller.permits(f.token), false)
    f.stopped(100)
    if (first === 'robot') { f.local.resolve(); await f.local.promise; await Promise.resolve() }
    else f.controller.serverAck(op, true)
    assert.equal(f.controller.state, 'cancelling'); assert.throws(() => f.controller.beginScope('new'))
    if (first === 'robot') f.controller.serverAck(op, true)
    else { f.local.resolve(); await f.local.promise; await Promise.resolve() }
    assert.equal(f.controller.state, 'restartable')
    const fresh = f.controller.beginScope('new'); assert.equal(f.controller.permits(fresh), false)
    f.controller.activate(fresh); assert.equal(f.controller.permits(fresh), true)
    assert.equal(f.controller.apply(f.token, () => { throw Error('stale effect') }), false)
    assert.throws(() => f.controller.beginScope('old'))
  })
  test(`queue discard, duplicate cancel, stale ACK and late failure, repeat ${repeat}`, async () => {
    const f = fixture(), running = deferred(); const effects: string[] = []
    f.controller.enqueue(f.token, () => { effects.push('running'); return running.promise })
    f.controller.enqueue(f.token, async () => { effects.push('queued') })
    const op = f.controller.cancel('cancel')!
    assert.equal(f.controller.cancel('duplicate'), op)
    f.controller.serverAck({ ...op, runEpoch: 'other' }, true)
    assert.equal(f.controller.state, 'cancelling')
    f.advance(1001)
    assert.equal(f.controller.state, 'quarantined')
    f.stopped(1002); f.local.resolve(); f.controller.serverAck(op, true); running.resolve()
    await Promise.resolve(); await Promise.resolve()
    assert.deepEqual(effects, ['running']); assert.equal(f.controller.state, 'quarantined')
  })
  for (const mode of ['robot-error', 'server-error', 'cleanup-timeout'] as const) test(`${mode} holds quarantine, repeat ${repeat}`, async () => {
    const f = fixture(), op = f.controller.cancel('cancel')!; f.stopped(100)
    if (mode === 'robot-error') f.local.reject(Error('close failed'))
    if (mode === 'server-error') f.controller.serverAck(op, false)
    if (mode === 'cleanup-timeout') f.advance(5001)
    await Promise.resolve(); await Promise.resolve()
    f.local.resolve(); f.controller.serverAck(op, true)
    await Promise.resolve()
    assert.equal(f.controller.state, 'quarantined'); assert.throws(() => f.controller.beginScope('new'))
  })
}
test('foreign robot and mismatched cancel cannot acknowledge the barrier', () => {
  const f = fixture(), op = f.controller.cancel('cancel')!
  for (const patch of [{ robotId: 'B' }, { scopeId: 'new' }, { cancelId: 'foreign' }]) f.controller.serverAck({ ...op, ...patch }, true)
  assert.equal(f.controller.state, 'cancelling')
})
