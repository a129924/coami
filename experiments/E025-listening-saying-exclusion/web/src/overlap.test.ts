import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze, nextOperation, type Evidence, type Playback } from './overlap.ts'
const play = (start: number, end: number, id = 's1'): Playback => ({ start, end, sourceId: id, token: 'case:say', natural: true, clockAdvanced: true, interrupted: false })
const valid = (): Evidence => ({ expectedSayToken: 'case:say', capture: { start: 20, end: 80 }, recordBytes: 128, recordDone: true, sayDone: true, saySuccess: true, playback: [play(0, 100)], issues: [] })
test('actual intervals with nonempty recording establish 60ms overlap', () => {
  const result = analyze(valid()); assert.equal(result.status, 'overlap-observed'); assert.equal(result.overlapMs, 60)
})
test('separate TTS segments do not fill the gap or prove exclusion', () => {
  const e = valid(); e.capture = { start: 35, end: 65 }; e.playback = [play(0, 20), play(80, 100, 's2')]
  assert.equal(analyze(e).status, 'no-overlap-observed'); assert.equal(analyze(e).overlapMs, 0)
})
test('intersections use a union rather than double counting segments', () => {
  const e = valid(); e.playback = [play(10, 60), play(40, 90, 's2')]; assert.equal(analyze(e).overlapMs, 60)
})
test('SDK completion, empty capture or missing terminal cannot prove overlap', () => {
  for (const patch of [{ recordBytes: 0 }, { recordDone: false }, { sayDone: false }, { saySuccess: false }, { playback: [] }, { capture: null }]) {
    assert.equal(analyze({ ...valid(), ...patch }).status, 'unconfirmed')
  }
})
test('fallback, frozen clock, interruption and mismatched tokens remain unknown', () => {
  for (const patch of [{ natural: false }, { clockAdvanced: false }, { interrupted: true }, { token: 'old:say' }]) {
    const e = valid(); e.playback = [{ ...play(0, 100), ...patch }]; assert.equal(analyze(e).status, 'unconfirmed')
  }
})
test('invalid timestamps, duplicate sources or run errors remain unknown', () => {
  for (const p of [play(Number.NaN, 100), play(100, 20)]) { const e = valid(); e.playback = [p]; assert.equal(analyze(e).status, 'unconfirmed') }
  const e = valid(); e.playback = [play(0, 100), play(0, 100)]; assert.equal(analyze(e).status, 'unconfirmed')
  assert.equal(analyze({ ...valid(), issues: ['timeout'] }).status, 'unconfirmed')
})
test('only observed capture start / advancing playback triggers the second operation, once', () => {
  assert.equal(nextOperation('record-say', 'capture-start', false), 'say')
  assert.equal(nextOperation('say-record', 'playback-running', false), 'record')
  for (const event of ['sdk-called', 'playback-scheduled'] as const) {
    assert.equal(nextOperation('record-say', event, false), null); assert.equal(nextOperation('say-record', event, false), null)
  }
  assert.equal(nextOperation('record-say', 'capture-start', true), null)
  assert.equal(nextOperation('say-record', 'playback-running', true), null)
})
