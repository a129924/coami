// Local evidence transport check; never starts a simulator or fills human confirmation.
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { EvidenceSaver } from '../src/evidence-save.ts'
import { EvidenceStore } from '../src/evidence-store.ts'
import { evidenceEndpoint } from '../src/evidence-endpoint.ts'
const [source, receipt] = process.argv.slice(2)
if (!source || !receipt) throw Error('Usage: node scripts/check-evidence-rescue.mjs <rescued-json> <receipt-json>')
const raw = await readFile(source), value = JSON.parse(raw.toString('utf8'))
assert.ok(Array.isArray(value.records))
const dir = await mkdtemp(path.join(os.tmpdir(), 'e026-rescue-')), file = path.join(dir, 'saved.jsonl')
const server = createServer(evidenceEndpoint(new EvidenceStore(file)))
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw Error('Missing address')
  const origin = `http://127.0.0.1:${address.port}`, requests = [], errors = []
  const saver = new EvidenceSaver({ id: () => 'rescue-transport-check', onSaved: () => {}, onError: error => errors.push(error), transport: async body => {
    requests.push(body)
    return fetch(origin, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body })
  } })
  assert.equal(await saver.save({ caseId: 'rescue-infrastructure-check', sourceScope: value.token, stateAtExport: value.state, human: { verdict: 'unobserved' }, purpose: 'transport verification only; not a new Action/human trial' }, value.records), true)
  assert.deepEqual(errors, [])
  const beforeRetry = await readFile(file)
  const retry = await fetch(origin, { method: 'POST', headers: { Origin: origin }, body: requests[0] })
  assert.equal(retry.status, 200)
  assert.deepEqual(await readFile(file), beforeRetry)
  const persisted = beforeRetry.toString('utf8').trim().split('\n').flatMap(line => JSON.parse(line).records)
  assert.deepEqual(persisted, value.records)
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  const result = { checkedUtc: new Date().toISOString(), result: 'passed', source, sourceBytes: raw.length, sourceSha256: hash(raw), inputRecords: value.records.length, persistedRecords: persisted.length, chunkCount: requests.length, chunkBytes: requests.map(body => Buffer.byteLength(body)), exactRecordValuesAndOrder: true, retryDidNotAppendDuplicate: true, recordValueSha256: hash(JSON.stringify(persisted)), outputBytes: beforeRetry.length, outputSha256: hash(beforeRetry), temporaryOutputRemovedAfterCheck: true, simulatedActionsStarted: 0, humanConfirmationWritten: false }
  await writeFile(receipt, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
} finally {
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  await rm(dir, { recursive: true, force: true })
}
