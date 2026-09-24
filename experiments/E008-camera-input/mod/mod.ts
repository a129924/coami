type ButtonEvent = { kind: 'button'; name: 'a' | 'b' | 'c' | 'power'; pressed: boolean }
type CameraFrame = { width: number; height: number; imageType: string; buffer: ArrayBuffer }
type Robot = {
  camera: {
    start(options: { width: number; height: number; imageType: 'rgb565le' }): Promise<void> | void
    capture(options: { width: number; height: number; imageType: 'rgb565le' }): Promise<CameraFrame | undefined>
    stop(): Promise<void> | void
  }
  input: { button: {
    a: { onEvent: (event: ButtonEvent) => void }
    b: { onEvent: (event: ButtonEvent) => void }
    c: { onEvent: (event: ButtonEvent) => void }
  } }
}

const FRAME_OPTIONS = { width: 96, height: 96, imageType: 'rgb565le' as const }
const emit = (value: Record<string, unknown>): void => trace(`COAMI8|${JSON.stringify({ schemaVersion: 1, ...value })}\n`)

function digest(bytes: Uint8Array): string {
  let hash = 0x811c9dc5
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0
  return hash.toString(16).padStart(8, '0')
}

function meanLuma(bytes: Uint8Array): number {
  if (bytes.length < 2 || bytes.length % 2 !== 0) return 0
  let total = 0
  for (let index = 0; index < bytes.length; index += 2) {
    const pixel = bytes[index]! | (bytes[index + 1]! << 8)
    const red = ((pixel >> 11) & 0x1f) * 255 / 31
    const green = ((pixel >> 5) & 0x3f) * 255 / 63
    const blue = (pixel & 0x1f) * 255 / 31
    total += (299 * red + 587 * green + 114 * blue) / 1000
  }
  return Math.round(total / (bytes.length / 2))
}

export function onContextCreated(robot: Robot): void {
  let generation = 0
  let started = false
  let starting = false
  let capturing = false
  let captureSeq = 0

  robot.input.button.a.onEvent = (event) => {
    if (!event.pressed || started || starting) return
    const current = ++generation
    starting = true
    void (async () => {
      try {
        await robot.camera.start(FRAME_OPTIONS)
        if (generation !== current) { await robot.camera.stop(); return }
        started = true
        emit({ kind: 'started' })
      } catch (error) {
        if (generation === current) emit({ kind: 'start-error', error: String(error) })
      } finally {
        starting = false
      }
    })()
  }

  robot.input.button.c.onEvent = (event) => {
    if (!event.pressed || !started || capturing) return
    const current = generation
    capturing = true
    void (async () => {
      try {
        const frame = await robot.camera.capture(FRAME_OPTIONS)
        if (generation !== current) return
        if (!frame || frame.imageType !== 'rgb565le' || !(frame.buffer instanceof ArrayBuffer)
          || frame.width <= 0 || frame.height <= 0 || frame.buffer.byteLength !== frame.width * frame.height * 2) {
          emit({ kind: 'frame-error', captureSeq: ++captureSeq, error: 'invalid-frame' })
          return
        }
        const bytes = new Uint8Array(frame.buffer)
        emit({ kind: 'frame', captureSeq: ++captureSeq, width: frame.width, height: frame.height,
          imageType: frame.imageType, byteLength: bytes.length, digest: digest(bytes), meanLuma: meanLuma(bytes) })
      } catch (error) {
        if (generation === current) emit({ kind: 'frame-error', captureSeq: ++captureSeq, error: String(error) })
      } finally {
        capturing = false
      }
    })()
  }

  robot.input.button.b.onEvent = (event) => {
    if (!event.pressed) return
    const current = ++generation
    started = false
    void (async () => {
      try {
        await robot.camera.stop()
        if (generation === current) emit({ kind: 'stopped', captureCount: captureSeq })
      } catch (error) {
        if (generation === current) emit({ kind: 'stop-error', error: String(error) })
      }
    })()
  }

  emit({ kind: 'ready' })
}
