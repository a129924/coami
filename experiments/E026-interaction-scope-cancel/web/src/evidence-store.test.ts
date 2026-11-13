import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { EvidenceStore } from './evidence-store.ts'
async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'e026-evidence-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'records.jsonl')
  return { file, store: new EvidenceStore(file) }
}
const chunk = (index = 0, start = 0, end = 1, snapshotEnd = 2) => ({ caseId: 'case', records: [{ n: start, note: '耳機🙂' }], save: { id: 'save-one', chunk: index, recordStart: start, recordEnd: end, snapshotEnd } })
test('retry after append or store restart acknowledges original chunk without duplicate rows', async t => {
  const f = await fixture(t), v = chunk()
  assert.equal((await f.store.append(v)).saved, true)
  await f.store.append(v)
  await new EvidenceStore(f.file).append(v)
  assert.deepEqual((await readFile(f.file, 'utf8')).trim().split('\n').map(x => JSON.parse(x)), [v])
})
test('conflicting retry and out-of-order chunk are rejected without appending', async t => {
  const f = await fixture(t)
  await assert.rejects(f.store.append(chunk(1, 1, 2)), /order/)
  await f.store.append(chunk())
  await assert.rejects(f.store.append({ ...chunk(), records: [{ n: 999 }] }), /Conflicting/)
  await f.store.append(chunk(1, 1, 2))
  assert.equal((await readFile(f.file, 'utf8')).trim().split('\n').length, 2)
})
test('concurrent retries append once; legacy harness saves remain compatible', async t => {
  const f = await fixture(t)
  await Promise.all([f.store.append(chunk()), f.store.append(chunk())])
  const legacy = { caseId: 'legacy', records: [{ kind: 'note' }] }
  await f.store.append(legacy)
  const rows = (await readFile(f.file, 'utf8')).trim().split('\n').map(x => JSON.parse(x) as unknown)
  assert.deepEqual(rows, [chunk(), legacy])
})
test('invalid chunk ranges never claim success', async t => {
  const f = await fixture(t)
  await assert.rejects(f.store.append({ ...chunk(), records: [] }), /range/)
  await assert.rejects(f.store.append({ ...chunk(), save: { ...chunk().save, chunk: -1 } }), /identity/)
})
