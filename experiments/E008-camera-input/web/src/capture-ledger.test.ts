/// <reference path="../../mod/host.d.ts" />
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { onContextCreated } from '../../mod/mod.ts'
import { CaptureLedger } from './capture-ledger.ts'

const host = { source: 'webcam' as const, sequence: 1, width: 2, height: 2,
  byteLength: 8, digest: 'abcd1234', meanLuma: 70 }
const mod = { kind: 'frame' as const, captureSeq: 1, width: 2, height: 2,
  imageType: 'rgb565le' as const, byteLength: 8, digest: 'abcd1234', meanLuma: 70 }

describe('E008 capture ledger', () => {
  it('requires a unique same-generation host and MOD pair', () => {
    const ledger = new CaptureLedger()
    assert.equal(ledger.begin(4), true)
    assert.equal(ledger.begin(4), false)
    ledger.addHost(4, host)
    assert.deepEqual(ledger.resolveMod(4, mod), { source: 'webcam', reason: 'matched', host, mod })
  })

  it('fails closed for interleaved host captures or changed frame bytes', () => {
    const ledger = new CaptureLedger()
    ledger.begin(2)
    ledger.addHost(2, host)
    const secondHost = { ...host, sequence: 2 }
    ledger.addHost(2, secondHost)
    assert.deepEqual(ledger.resolveMod(2, mod), {
      source: 'unverified', reason: 'ambiguous-host', hosts: [host, secondHost], mod,
    })
    ledger.begin(2)
    ledger.addHost(2, host)
    assert.equal(ledger.resolveMod(2, { ...mod, digest: '00000000' }).source, 'unverified')
  })

  it('rejects stale generations and clears a pending capture on restart', () => {
    const ledger = new CaptureLedger()
    ledger.begin(5)
    ledger.addHost(4, host)
    assert.equal(ledger.resolveMod(4, mod).source, 'unverified')
    ledger.invalidate()
    assert.equal(ledger.begin(6), true)
  })
})

it('rejects a self-consistent MOD frame with dimensions other than requested', async (t) => {
  const records: { kind: string; error?: string }[] = []
  const previousTrace = globalThis.trace
  globalThis.trace = (line: string) => { records.push(JSON.parse(line.slice('COAMI8|'.length))) }
  t.after(() => { globalThis.trace = previousTrace })
  const camera = {
    async start() {},
    async capture() { return { width: 1, height: 1, imageType: 'rgb565le', buffer: new ArrayBuffer(2) } },
    async stop() {},
  }
  const button = () => ({ onEvent(_event: { pressed: boolean }) {} })
  const robot = { camera, input: { button: { a: button(), b: button(), c: button() } } }
  onContextCreated(robot)
  robot.input.button.a.onEvent({ pressed: true })
  await new Promise((resolve) => setImmediate(resolve))
  robot.input.button.c.onEvent({ pressed: true })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(records.some((record) => record.kind === 'frame'), false)
  assert.equal(records.find((record) => record.kind === 'frame-error')?.error, 'invalid-frame')
})
