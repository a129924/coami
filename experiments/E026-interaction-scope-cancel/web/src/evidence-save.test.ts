import test from 'node:test'
import assert from 'node:assert/strict'
import { EvidenceSaver, type SaveTransport } from './evidence-save.ts'
import { ScopeController } from './scope-controller.ts'

type Row = Record<string, unknown>
const meta = { caseId: 'case', runEpoch: 'epoch', scope: { scopeId: 'one' }, state: 'restartable', human: { verdict: 'unobserved' } }
function okay(body: string): Response {
  const row = JSON.parse(body) as { save: { id: string; chunk: number; recordEnd: number } }
  return Response.json({ saved: true, ...row.save })
}
function fixture(transport: SaveTransport, maxBytes?: number) {
  const errors: string[] = [], saved: number[] = []
  const saver = new EvidenceSaver({ transport, id: () => 'save-id', onError: value => errors.push(value), onSaved: end => saved.push(end), ...(maxBytes ? { maxBytes } : {}) })
  return { saver, errors, saved }
}
test('large Unicode evidence saves every record in order within the unchanged endpoint limit', async () => {
  const requests: string[] = [], rows: Row[] = Array.from({ length: 12000 }, (_, n) => ({ kind: 'rendered-pose', n, note: '耳機🙂'.repeat(35) }))
  const f = fixture(async body => {
    requests.push(body)
    if (new TextEncoder().encode(body).length >= 2_000_000) return new Response('Evidence too large', { status: 400 })
    return okay(body)
  })
  assert.equal(await f.saver.save(meta, rows), true)
  assert.ok(requests.length > 1)
  assert.deepEqual(requests.flatMap(body => (JSON.parse(body) as { records: Row[] }).records), rows)
  assert.equal(f.saver.savedThrough, rows.length)
  assert.equal(f.errors.length, 0)
})
test('HTTP failure reports status/body, leaves trace and lifecycle unchanged, and retains unsaved cursor', async () => {
  const rows: Row[] = [{ kind: 'cancel-accepted' }, { kind: 'barrier-open' }], before = structuredClone(rows)
  const lifecycle = new ScopeController({ runEpoch: 'epoch', robotId: 'A', now: () => 0, later: () => () => {}, record: () => {}, notify: () => {}, stop: async () => {} })
  const token = lifecycle.beginScope('one'); lifecycle.activate(token)
  const f = fixture(async () => new Response('Disk full', { status: 503 }))
  assert.equal(await f.saver.save({ ...meta, state: lifecycle.state }, rows), false)
  assert.equal(lifecycle.state, 'active'); assert.equal(lifecycle.permits(token), true); assert.deepEqual(rows, before); assert.equal(f.saver.savedThrough, 0)
  assert.match(f.errors[0]!, /503.*Disk full/)
})
test('partial failure retries identical unacknowledged chunk, without skipping acknowledged records', async () => {
  let fail = true; const bodies: string[] = [], persisted = new Map<string, Row[]>()
  const rows: Row[] = Array.from({ length: 12 }, (_, n) => ({ n, note: 'x'.repeat(90) }))
  const f = fixture(async body => {
    bodies.push(body); const v = JSON.parse(body) as { save: { id: string; chunk: number }; records: Row[] }
    persisted.set(`${v.save.id}:${v.save.chunk}`, v.records)
    if (v.save.chunk === 1 && fail) { fail = false; throw Error('ACK lost after append') }
    return okay(body)
  }, 600)
  assert.equal(await f.saver.save(meta, rows), false)
  const cursor = f.saver.savedThrough; assert.ok(cursor > 0 && cursor < rows.length)
  const failedBody = bodies.at(-1)
  assert.equal(await f.saver.save(meta, rows), true)
  assert.equal(bodies[2], failedBody)
  assert.deepEqual([...persisted.values()].flat(), rows); assert.equal(f.saver.savedThrough, rows.length)
})
test('records arriving while saving remain for the next save; concurrent clicks share one request', async () => {
  let release!: () => void; const gate = new Promise<void>(r => { release = r }), bodies: string[] = []
  const f = fixture(async body => { bodies.push(body); await gate; return okay(body) })
  const rows: Row[] = [{ n: 0 }], first = f.saver.save(meta, rows)
  rows.push({ n: 1 }); const second = f.saver.save(meta, rows)
  assert.equal(first, second); release(); assert.equal(await first, true)
  assert.equal(f.saver.savedThrough, 1)
  assert.equal(await f.saver.save(meta, rows), true)
  assert.deepEqual(bodies.flatMap(b => (JSON.parse(b) as { records: Row[] }).records), rows)
})
test('a single oversized record remains unsaved and is reported without sending', async () => {
  let calls = 0; const f = fixture(async body => { calls++; return okay(body) }, 400)
  assert.equal(await f.saver.save(meta, [{ note: 'x'.repeat(900) }]), false)
  assert.equal(calls, 0); assert.equal(f.saver.savedThrough, 0); assert.match(f.errors[0]!, /record|limit/i)
})
test('a mismatched receipt cannot advance the cursor', async () => {
  const f = fixture(async () => Response.json({ saved: true, id: 'wrong', chunk: 0, recordEnd: 1 }))
  assert.equal(await f.saver.save(meta, [{ n: 0 }]), false); assert.equal(f.saver.savedThrough, 0)
})

test('successful evidence save never unlocks an already quarantined Scope', async () => {
  const controller = new ScopeController({ runEpoch: 'epoch', robotId: 'A', now: () => 0, later: () => () => {}, record: () => {}, notify: () => {}, stop: async () => {} })
  const token = controller.beginScope('one'); controller.activate(token); controller.disconnect()
  const f = fixture(async body => okay(body))
  assert.equal(await f.saver.save({ ...meta, state: controller.state }, [{ kind: 'error' }]), true)
  assert.equal(controller.state, 'quarantined'); assert.equal(controller.permits(token), false)
})
