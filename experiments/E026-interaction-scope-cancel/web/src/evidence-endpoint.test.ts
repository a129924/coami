import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { EvidenceStore } from './evidence-store.ts'
import { EvidenceSaver } from './evidence-save.ts'
import { evidenceEndpoint } from './evidence-endpoint.ts'
async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'e026-http-')), file = path.join(dir, 'records.jsonl')
  const server = createServer(evidenceEndpoint(new EvidenceStore(file)))
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
  t.after(async () => { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await rm(dir, { recursive: true, force: true }) })
  const address = server.address(); if (!address || typeof address === 'string') throw Error('Missing address')
  return { file, url: `http://127.0.0.1:${address.port}` }
}
test('actual HTTP endpoint saves oversized total trace in bounded UTF-8 chunks, with receipt retry', async t => {
  const f = await fixture(t), errors: string[] = [], bodies: string[] = []
  const rows = Array.from({ length: 9000 }, (_, n) => ({ n, note: '耳機🙂'.repeat(40) }))
  const saver = new EvidenceSaver({ id: () => 'http-test', onError: x => errors.push(x), onSaved: () => {}, transport: async body => {
    bodies.push(body); return fetch(f.url, { method: 'POST', headers: { Origin: f.url, 'Content-Type': 'application/json' }, body })
  } })
  assert.equal(await saver.save({ caseId: 'http-test', human: { verdict: 'unobserved' } }, rows), true)
  assert.deepEqual(errors, []); assert.ok(bodies.length > 1)
  const retry = await fetch(f.url, { method: 'POST', headers: { Origin: f.url }, body: bodies[0] })
  assert.equal(retry.status, 200)
  const saved = (await readFile(f.file, 'utf8')).trim().split('\n').flatMap(line => (JSON.parse(line) as { records: typeof rows }).records)
  assert.deepEqual(saved, rows)
})
test('endpoint retains same-origin checks and rejects oversized request with detailed response', async t => {
  const f = await fixture(t)
  const denied = await fetch(f.url, { method: 'POST', headers: { Origin: 'http://wrong' }, body: '{}' })
  assert.equal(denied.status, 403); assert.match(await denied.text(), /Same-origin/)
  const large = await fetch(f.url, { method: 'POST', headers: { Origin: f.url }, body: 'x'.repeat(2_000_001) })
  assert.equal(large.status, 400); assert.match(await large.text(), /Evidence too large/)
})
