import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
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
    ledger.addHost(2, { ...host, sequence: 2 })
    assert.equal(ledger.resolveMod(2, mod).source, 'unverified')
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
