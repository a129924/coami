import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RecordingSession, type RecorderEvents, type Run, type Playback, CleanupFailure } from './recording-session.ts'

const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
function harness(options: { lateRun?: boolean; cleanupFails?: boolean; loadFails?: boolean; constructorCleanupFails?: boolean } = {}) {
  let now = 100
  let callbacks: RecorderEvents | undefined
  let cleaned = 0, released = 0, stopped = 0, loads = 0, disposed = 0, cleared = 0, opened = 0
  let openResolve: (run: Run) => void = () => {}
  let loadResolve: (result: Playback) => void = () => {}
  const timers = new Map<number, { callback: () => void; ms: number }>(); let timerId = 0
  const run: Run = { first: async () => {}, next: async () => {}, cleanup: () => {
    cleaned++; if (options.cleanupFails) throw Error('cleanup failed')
  } }
  const session = new RecordingSession({ now: () => now,
    schedule: (callback, ms) => { timers.set(++timerId, { callback, ms }); return timerId },
    unschedule: (id) => { timers.delete(id) },
    openRun: async () => { opened++; return options.lateRun ? new Promise<Run>((resolve) => { openResolve = resolve }) : run },
    createRecorder: (events) => { if (options.constructorCleanupFails) throw new CleanupFailure('encoder track cleanup failed'); callbacks = events; return { start() {}, stop() { stopped++ },
      release() { released++ }, mimeType: 'video/webm' } },
    load: async () => { loads++; if (options.loadFails) throw Error('player media error'); return new Promise<Playback>((resolve) => { loadResolve = resolve }) },
    clear: () => { cleared++ }, changed() {} })
  return { session, run, timers, callbacks: () => { assert.ok(callbacks); return callbacks },
    now: (value: number) => { now = value }, counts: () => ({ cleaned, released, stopped, loads, disposed, cleared, opened }),
    open: () => openResolve(run), loaded: () => loadResolve({ dispose() { disposed++ } }),
    fire: (ms: number) => { const entry = [...timers.entries()].find(([, t]) => t.ms === ms); assert.ok(entry);
      timers.delete(entry[0]); entry[1].callback() } }
}
async function recording(f: ReturnType<typeof harness>) {
  f.session.start(); await tick(); assert.equal(f.session.state, 'starting')
  f.callbacks().started(); assert.equal(f.session.state, 'recording')
}

test('start event starts the clock; stop retains final chunk and waits for loaded player', async () => {
  const f = harness(); await recording(f)
  f.now(3100); f.session.stop()
  assert.equal(f.session.state, 'finalizing')
  assert.equal(f.counts().cleaned, 1); assert.equal(f.counts().released, 1)
  f.callbacks().data(new Blob(['final'])); f.callbacks().stopped(); await tick()
  assert.equal(f.counts().loads, 1); assert.equal(f.session.state, 'finalizing')
  f.loaded(); await tick()
  assert.equal(f.session.state, 'ready'); assert.equal(f.session.durationMs, 3000)
  assert.equal(f.session.bytes, 5); assert.equal(f.timers.size, 0)
})

test('cancel discards chunks and late callbacks, then permits a fresh recording', async () => {
  const f = harness(); await recording(f); const old = f.callbacks()
  old.data(new Blob(['old'])); f.session.cancel()
  old.stopped(); old.data(new Blob(['late'])); await tick()
  assert.equal(f.counts().loads, 0); assert.equal(f.session.state, 'idle')
  await recording(f); old.error(Error('old recorder error'))
  assert.equal(f.session.state, 'recording'); f.session.cancel()
})

test('Starting cancellation releases a late authorized run', async () => {
  const f = harness({ lateRun: true }); f.session.start(); await tick(); f.session.cancel()
  f.open(); await tick()
  assert.equal(f.counts().cleaned, 1); assert.equal(f.session.state, 'idle')
})

test('finalization timeout ignores late stop/chunk and disposes late player result', async () => {
  const f = harness(); await recording(f); f.session.stop()
  f.callbacks().data(new Blob(['x'])); f.callbacks().stopped(); await tick()
  f.fire(5000); assert.equal(f.session.state, 'idle')
  f.loaded(); f.callbacks().data(new Blob(['late'])); f.callbacks().stopped(); await tick()
  assert.equal(f.session.state, 'idle'); assert.equal(f.counts().disposed, 1)
})

test('finalizing buttons are no-ops; cleanup failure cannot publish a result', async () => {
  const f = harness(); await recording(f); f.session.stop()
  f.session.start(); f.session.stop(); f.session.cancel()
  assert.equal(f.session.state, 'finalizing'); assert.equal(f.counts().stopped, 1)
  f.fire(5000)
  const broken = harness({ cleanupFails: true }); await recording(broken); broken.session.stop()
  broken.callbacks().data(new Blob(['x'])); broken.callbacks().stopped(); await tick()
  assert.equal(broken.session.state, 'blocked'); assert.equal(broken.counts().loads, 0)
  broken.session.start(); await tick(); assert.equal(broken.counts().opened, 1)
  assert.match(broken.session.error, /cleanup/)
})

test('recorder error and 60 second cap discard rather than publish partial output', async () => {
  const f = harness(); await recording(f); f.callbacks().error(Error('encoder failed'))
  assert.equal(f.session.state, 'idle'); assert.match(f.session.error, /encoder/)
  await recording(f); f.fire(60000)
  assert.equal(f.session.state, 'idle'); assert.equal(f.counts().loads, 0)
})

test('player load error discards instead of treating a URL as playable', async () => {
  const f = harness({ loadFails: true }); await recording(f); f.session.stop()
  f.callbacks().data(new Blob(['x'])); f.callbacks().stopped(); await tick()
  assert.equal(f.session.state, 'idle'); assert.equal(f.session.bytes, 0)
  assert.match(f.session.error, /player media error/); assert.equal(f.timers.size, 0)
})

test('recorder construction failure stops every newly created canvas track', async () => {
  const { guardRecorderCreation } = await import('./recording-session.ts')
  const stops: number[] = []
  const stream = { getTracks: () => [{ stop() { stops.push(1); throw Error('first track failed') } },
    { stop() { stops.push(2) } }] }
  assert.throws(() => guardRecorderCreation(stream, () => { throw Error('encoder constructor failed') }), /encoder constructor failed/)
  assert.deepEqual(stops, [1, 2])
})

test('constructor cleanup failure blocks the next run even without a recorder port', async () => {
  const f = harness({ constructorCleanupFails: true }); f.session.start(); await tick()
  assert.equal(f.session.state, 'blocked'); f.session.start(); await tick()
  assert.equal(f.counts().opened, 1); assert.equal(f.counts().loads, 0)
})
