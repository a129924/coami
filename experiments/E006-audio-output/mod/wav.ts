const SAMPLE_RATE = 24_000
const SAMPLE_COUNT = SAMPLE_RATE / 2
const BYTES_PER_SAMPLE = 2
const HEADER_BYTES = 44

function ascii(bytes: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index)
}

function uint16(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
}

function uint32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

export function createProbeWav(): ArrayBuffer {
  const dataBytes = SAMPLE_COUNT * BYTES_PER_SAMPLE
  const wav = new Uint8Array(HEADER_BYTES + dataBytes)
  ascii(wav, 0, 'RIFF')
  uint32(wav, 4, wav.byteLength - 8)
  ascii(wav, 8, 'WAVE')
  ascii(wav, 12, 'fmt ')
  uint32(wav, 16, 16)
  uint16(wav, 20, 1)
  uint16(wav, 22, 1)
  uint32(wav, 24, SAMPLE_RATE)
  uint32(wav, 28, SAMPLE_RATE * BYTES_PER_SAMPLE)
  uint16(wav, 32, BYTES_PER_SAMPLE)
  uint16(wav, 34, 16)
  ascii(wav, 36, 'data')
  uint32(wav, 40, dataBytes)

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 660 * index) / SAMPLE_RATE) * 32767 * 0.35)
    uint16(wav, HEADER_BYTES + index * BYTES_PER_SAMPLE, sample)
  }
  return wav.buffer as ArrayBuffer
}
