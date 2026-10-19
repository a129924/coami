import test from 'node:test'
import assert from 'node:assert/strict'
import { ScopeAudio, type ContextPort } from './audio-adapter.ts'
import type { Token } from './scope-controller.ts'
const token: Token = { runEpoch: 'epoch', robotId: 'A', scopeId: 'one' }
function fixture(delayedDecode = false) {
  let live = true, closeResolve!: () => void, decodeResolve!: (v: AudioBuffer) => void
  const events: string[] = []; let ended: (() => void) | null = null
  const source = { buffer: null, connect: () => {}, disconnect: () => events.push('disconnected'), start: () => events.push('started'), stop: () => events.push('stop-called'),
    get onended() { return ended }, set onended(v: (() => void) | null) { ended = v } }
  const context = { state: 'running', currentTime: 1, destination: {}, resume: async () => {},
    decodeAudioData: () => delayedDecode ? new Promise<AudioBuffer>(r => { decodeResolve = r }) : Promise.resolve({ duration: 10 } as AudioBuffer),
    createBufferSource: () => source, close: () => new Promise<void>(r => { events.push('context-close-requested'); closeResolve = () => { context.state = 'closed'; r() } }),
  }
  const audio = new ScopeAudio(token, () => live, row => events.push(row.kind), () => context as unknown as ContextPort)
  return { audio, events, invalidate: () => { live = false }, end: () => ended?.(), close: () => closeResolve(), decode: () => decodeResolve({ duration: 10 } as AudioBuffer) }
}
test('cancel waits for actual ended and context close; next scope requires a new adapter', async () => {
  const f = fixture(), play = f.audio.play(new ArrayBuffer(8)); await Promise.resolve(); await Promise.resolve()
  assert.ok(f.events.includes('started')); f.invalidate()
  let clean = false; const cancel = f.audio.cancel(() => {}).then(() => { clean = true })
  await Promise.resolve(); assert.equal(clean, false)
  assert.ok(f.events.includes('stop-called')); assert.ok(f.events.includes('disconnected'))
  assert.equal(f.events.includes('context-close-requested'), false)
  f.end(); for (let i = 0; i < 8; i++) await Promise.resolve(); assert.equal(clean, false)
  f.close(); await cancel; assert.equal(await play, false); assert.equal(clean, true)
  assert.equal(await f.audio.play(new ArrayBuffer(8)), false)
})
test('late decode cannot create playback after invalidation and is awaited by cleanup', async () => {
  const f = fixture(true), play = f.audio.play(new ArrayBuffer(8)); await Promise.resolve(); await Promise.resolve()
  f.invalidate(); let clean = false; const cancel = f.audio.cancel(() => {}).then(() => { clean = true })
  assert.equal(f.events.includes('context-close-requested'), false)
  f.decode(); for (let i = 0; i < 8; i++) await Promise.resolve(); f.close(); await cancel
  assert.equal(await play, false); assert.equal(f.events.includes('started'), false)
})
