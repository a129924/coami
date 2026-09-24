import assert from 'node:assert/strict'
import test from 'node:test'

import { createProbeWav } from './wav.ts'

test('probe WAV is a non-silent half-second 24 kHz mono PCM16 file', () => {
  const wav = createProbeWav()
  const bytes = new Uint8Array(wav)
  const view = new DataView(wav)
  const ascii = (start: number, length: number): string =>
    String.fromCharCode(...bytes.subarray(start, start + length))

  assert.equal(bytes.length, 44 + 24_000)
  assert.equal(ascii(0, 4), 'RIFF')
  assert.equal(view.getUint32(4, true), bytes.length - 8)
  assert.equal(ascii(8, 4), 'WAVE')
  assert.equal(ascii(12, 4), 'fmt ')
  assert.equal(view.getUint32(16, true), 16)
  assert.equal(view.getUint16(20, true), 1)
  assert.equal(view.getUint16(22, true), 1)
  assert.equal(view.getUint32(24, true), 24_000)
  assert.equal(view.getUint32(28, true), 48_000)
  assert.equal(view.getUint16(32, true), 2)
  assert.equal(view.getUint16(34, true), 16)
  assert.equal(ascii(36, 4), 'data')
  assert.equal(view.getUint32(40, true), 24_000)
  assert.notEqual(view.getInt16(44 + 2, true), 0)
})
