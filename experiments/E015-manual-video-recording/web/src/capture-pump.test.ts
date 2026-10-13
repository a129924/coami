import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CapturePump } from './capture-pump.ts'
import type { HostCapture, CameraFrame } from '../../../E008-camera-input/web/src/camera-observer.ts'
import type { ModFrame } from '../../../E008-camera-input/web/src/capture-ledger.ts'

function setup(source: HostCapture['source'] = 'webcam') {
  const frame: CameraFrame = { width: 96, height: 96, imageType: 'rgb565le', buffer: new ArrayBuffer(18432) }
  const host: HostCapture = { sequence: 1, source, width: 96, height: 96, byteLength: 18432,
    digest: '00000001', meanLuma: 0, errorName: null, errorPhase: null }
  const mod: ModFrame = { kind: 'frame', captureSeq: 1, width: 96, height: 96, imageType: 'rgb565le',
    byteLength: 18432, digest: host.digest, meanLuma: 0 }
  let requests = 0
  const failures: string[] = []
  const pump = new CapturePump({ capture: () => { pump.host(host); return frame }, request: () => {
    requests++; pump.capture({ width: 96, height: 96, imageType: 'rgb565le' })
  }, onFailure: (error) => failures.push(error.message) })
  return { pump, frame, host, mod, failures, requests: () => requests }
}

test('pending/ledger exists before synchronous request; confirmed frame owns a copied buffer', async () => {
  const f = setup(); const pending = f.pump.next()
  assert.equal(f.requests(), 1)
  f.pump.receive(f.mod)
  const accepted = await pending
  assert.equal(accepted.metadata.digest, f.host.digest)
  assert.notEqual(accepted.frame.buffer, f.frame.buffer)
  new Uint8Array(f.frame.buffer)[0] = 42
  assert.equal(new Uint8Array(accepted.frame.buffer)[0], 0)
  assert.equal(f.pump.busy, false)
  assert.deepEqual(f.failures, [])
})

for (const scenario of ['sequence', 'duplicate-host', 'mismatch', 'synthetic', 'invalid-buffer'] as const) {
  test(`rejects ${scenario} without accepting a frame`, async () => {
    const f = setup(scenario === 'synthetic' ? 'synthetic' : 'webcam')
    if (scenario === 'invalid-buffer') f.frame.buffer = new ArrayBuffer(2)
    const pending = f.pump.next()
    if (scenario === 'duplicate-host') f.pump.host(f.host)
    f.pump.receive({ ...f.mod, ...(scenario === 'sequence' ? { captureSeq: 2 } : {}),
      ...(scenario === 'mismatch' ? { digest: 'different' } : {}) })
    await assert.rejects(pending)
    assert.equal(f.failures.length, 1)
  })
}

test('invalidate rejects pending and ignores old frames; a new run is independent', async () => {
  const old = setup(); const pending = old.pump.next(); old.pump.invalidate()
  await assert.rejects(pending, /cancel/i)
  old.pump.receive(old.mod)
  const fresh = setup(); const newPending = fresh.pump.next()
  old.pump.receive(old.mod)
  assert.equal(fresh.pump.busy, true)
  fresh.pump.receive(fresh.mod); await newPending
})

test('duplicate MOD trace between requests is fatal, not paired with the next slot', async () => {
  const f = setup(); const pending = f.pump.next(); f.pump.receive(f.mod); await pending
  f.pump.receive(f.mod)
  assert.equal(f.failures.length, 1)
  await assert.rejects(f.pump.next())
})

test('frame timeout clears pending and stops further requests', async () => {
  const f = setup(); const pending = f.pump.next(5)
  await assert.rejects(pending, /timeout/i)
  assert.equal(f.pump.busy, false)
  await assert.rejects(f.pump.next())
})
