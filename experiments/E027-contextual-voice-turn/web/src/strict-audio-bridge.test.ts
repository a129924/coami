import { test } from 'vitest'
import assert from 'node:assert/strict'
import { StrictAudioBridge, type AudioPort, type DecodedAudio, type PlaybackEvent } from './strict-audio-bridge.ts'

function setup() {
  let state = 'running', ended: (() => void) | undefined, listener: (() => void) | undefined
  let stops = 0, failStart = false, failDecode = false
  const events: PlaybackEvent[] = []
  const decoded: DecodedAudio = { length: 16000, duration: 1, channels: 1,
    start: callback => {
      if (failStart) throw Error('start failed')
      ended = callback
      return { stop: () => { stops++; ended?.() }, disconnect: () => {} }
    } }
  const port: AudioPort = { state: () => state, resume: async () => {}, close: () => {},
    decode: async () => { if (failDecode) throw Error('decode failed'); return decoded },
    observe: callback => { listener = callback; return () => { listener = undefined } } }
  const token = Object.freeze({ session_id: 's1', run_seq: 1, text: 'こんにちは。' })
  const bridge = new StrictAudioBridge(port, () => token, event => { events.push(event) })
  return { bridge, token, events, decoded, port, end: () => ended?.(),
    state: (value: string) => { state = value; listener?.() }, stops: () => stops,
    failStart: () => { failStart = true }, failDecode: () => { failDecode = true } }
}
const tick = async () => { await Promise.resolve(); await Promise.resolve() }

test('only natural ended resolves success, with immutable request evidence', async () => {
  const f = setup()
  let settled = false
  const result = f.bridge.play(new ArrayBuffer(8)).then(value => { settled = true; return value })
  await tick()
  assert.equal(settled, false)
  assert.deepEqual(f.events.map(e => e.phase), ['started'])
  f.end()
  assert.equal(await result, true)
  assert.deepEqual(f.events.map(e => e.phase), ['started', 'ended'])
  assert.equal(f.events[1]?.token, f.token)
})

test('empty/invalid decoded audio, decode error and start error never succeed', async () => {
  for (const mode of ['empty', 'samples', 'duration', 'decode', 'start']) {
    const f = setup()
    if (mode === 'samples') f.decoded.length = 0
    if (mode === 'duration') f.decoded.duration = 0
    if (mode === 'decode') f.failDecode()
    if (mode === 'start') f.failStart()
    assert.equal(await f.bridge.play(new ArrayBuffer(mode === 'empty' ? 0 : 8)), false)
    assert.deepEqual(f.events.map(e => e.phase), ['failed'])
  }
})

test('suspension and close stop cannot be confused with natural ended', async () => {
  for (const mode of ['suspended', 'closed', 'close']) {
    const f = setup(), result = f.bridge.play(new ArrayBuffer(8))
    await tick()
    if (mode === 'close') f.bridge.close()
    else f.state(mode)
    assert.equal(await result, false)
    f.end()
    assert.equal(f.events.some(e => e.phase === 'ended'), false)
    assert.equal(f.events.filter(e => e.phase === 'interrupted').length, 1)
    assert.equal(f.stops(), 1)
  }
})

test('close while decoding invalidates late decode so no audio can start', async () => {
  const f = setup()
  let resolve!: (value: DecodedAudio) => void
  f.port.decode = () => new Promise(r => { resolve = r })
  const result = f.bridge.play(new ArrayBuffer(8))
  f.bridge.close()
  resolve(f.decoded)
  assert.equal(await result, false)
  assert.equal(f.events.some(e => e.phase === 'started'), false)
})

test('busy play rejected without overwriting active playback; injected failure skips decoding', async () => {
  const f = setup(), result = f.bridge.play(new ArrayBuffer(8))
  await tick()
  assert.equal(await f.bridge.play(new ArrayBuffer(8)), false)
  f.end(); assert.equal(await result, true)
  f.bridge.failNext()
  assert.equal(await f.bridge.play(new ArrayBuffer(8)), false)
  assert.match(f.events.at(-1)!.reason ?? '', /injected/)
})

test('no request token means no TTS playback; suspended context cannot start speech', async () => {
  const f = setup()
  const bridge = new StrictAudioBridge(f.port, () => null, () => {})
  assert.equal(await bridge.play(new ArrayBuffer(8)), false)
  f.state('suspended')
  assert.equal(await f.bridge.play(new ArrayBuffer(8)), false)
  assert.equal(f.events.at(-1)?.phase, 'interrupted')
})
