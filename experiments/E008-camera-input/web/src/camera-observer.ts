import { createHostCameraBridge } from '../../../../vendor/stack-chan/web/simulator/bridge.mjs'

export type CameraSource = 'webcam' | 'synthetic' | 'unavailable'
export type CameraFrame = { width: number; height: number; imageType: string; buffer: ArrayBuffer }
export type CaptureOptions = { width?: number; height?: number; imageType?: string }
export type HostCapture = {
  sequence: number
  source: CameraSource
  width: number
  height: number
  byteLength: number
  digest: string
  meanLuma: number
}

type Track = { readyState: string; stop(): void }
type Stream = { getTracks(): Track[] }
type Video = { srcObject: object | null }
type ImagePixels = { data: Uint8ClampedArray }
type Context = {
  drawImage(image: object, x: number, y: number, width: number, height: number): void
  getImageData(x: number, y: number, width: number, height: number): ImagePixels
}
type Canvas = { width: number; height: number; getContext(type: '2d', options?: object): Context | null }
type NavigatorLike = { mediaDevices?: { getUserMedia?: (constraints: object) => Promise<Stream> } }

export type ObservedBridge = {
  start(options?: CaptureOptions & { useBrowserCamera?: boolean }): Promise<void>
  stop(): void
  capture(options?: CaptureOptions): CameraFrame | undefined
  isStarted(): boolean
  isBrowserCameraStarted(): boolean
}

export function digestBytes(bytes: Uint8Array): string {
  let hash = 0x811c9dc5
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0
  return hash.toString(16).padStart(8, '0')
}

export function meanRgb565Luma(bytes: Uint8Array): number {
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

function rgb565FromPixels(pixels: Uint8ClampedArray): Uint8Array {
  const bytes = new Uint8Array(pixels.length / 2)
  for (let pixel = 0, offset = 0; pixel < pixels.length; pixel += 4, offset += 2) {
    const value = ((pixels[pixel]! >> 3) << 11) | ((pixels[pixel + 1]! >> 2) << 5) | (pixels[pixel + 2]! >> 3)
    bytes[offset] = value & 0xff
    bytes[offset + 1] = value >> 8
  }
  return bytes
}

function sameBytes(first: Uint8Array, second: Uint8Array): boolean {
  if (first.length !== second.length) return false
  for (let index = 0; index < first.length; index += 1) if (first[index] !== second[index]) return false
  return true
}

export function createObservedCameraBridge(options: {
  videoElement: object
  canvasElement: object
  navigatorObj?: object
  onCapture(record: HostCapture): void
}): { bridge: ObservedBridge; lastErrorName(): string | null; lastErrorPhase(): 'start' | 'capture' | null; trackStates(): string[];
  apiSupported(): boolean; captureCount(): number } {
  const video = options.videoElement as Video
  const canvas = options.canvasElement as Canvas
  const navigatorObj = (options.navigatorObj ?? globalThis.navigator) as NavigatorLike
  const context = canvas.getContext('2d', { willReadFrequently: true })
  let active = false
  let pixels: Uint8ClampedArray | null = null
  let captureWarning = false
  let errorName: string | null = null
  let errorPhase: 'start' | 'capture' | null = null
  let lastStream: Stream | null = null
  let sequence = 0

  const canvasAdapter = {
    get width() { return canvas.width },
    set width(value: number) { canvas.width = value },
    get height() { return canvas.height },
    set height(value: number) { canvas.height = value },
    getContext(type: string) {
      if (type !== '2d' || !context) return null
      return {
        drawImage(image: object, x: number, y: number, width: number, height: number) {
          context.drawImage(image, x, y, width, height)
        },
        getImageData(x: number, y: number, width: number, height: number) {
          const result = context.getImageData(x, y, width, height)
          if (active && result.data.length === width * height * 4) pixels = result.data
          return result
        },
      }
    },
  }

  const vendorFactory = createHostCameraBridge as unknown as (settings: {
    videoElement: object
    canvasElement: object
    navigatorObj: object
    logger: { warn(message: string, error?: unknown): void }
  }) => ObservedBridge
  const vendor = vendorFactory({
    videoElement: video,
    canvasElement: canvasAdapter,
    navigatorObj,
    logger: { warn(message: string, error?: unknown) {
      errorName = typeof error === 'object' && error !== null && 'name' in error
        ? String(error.name) : 'UnknownError'
      errorPhase = message.includes('capture failed') ? 'capture' : 'start'
      if (errorPhase === 'capture') captureWarning = true
    } },
  })

  const bridge: ObservedBridge = {
    async start(startOptions = {}) {
      errorName = null
      errorPhase = null
      await vendor.start(startOptions)
      if (video.srcObject && typeof (video.srcObject as Stream).getTracks === 'function') {
        lastStream = video.srcObject as Stream
      }
    },
    stop() { vendor.stop() },
    isStarted() { return vendor.isStarted() },
    isBrowserCameraStarted() { return vendor.isBrowserCameraStarted() },
    capture(captureOptions = {}) {
      active = true
      pixels = null
      captureWarning = false
      let frame: CameraFrame | undefined
      try { frame = vendor.capture(captureOptions) }
      finally { active = false }
      const capturedPixels = pixels as Uint8ClampedArray | null
      const valid = frame?.imageType === 'rgb565le' && frame.width > 0 && frame.height > 0
        && frame.buffer instanceof ArrayBuffer && frame.buffer.byteLength === frame.width * frame.height * 2
      const bytes = valid ? new Uint8Array(frame!.buffer) : new Uint8Array(0)
      const source: CameraSource = valid && capturedPixels && capturedPixels.length === frame!.width * frame!.height * 4
        && !captureWarning && sameBytes(bytes, rgb565FromPixels(capturedPixels)) ? 'webcam'
        : valid ? 'synthetic' : 'unavailable'
      options.onCapture({ sequence: ++sequence, source, width: frame?.width ?? 0, height: frame?.height ?? 0,
        byteLength: bytes.length, digest: digestBytes(bytes), meanLuma: meanRgb565Luma(bytes) })
      pixels = null
      return frame
    },
  }

  return {
    bridge,
    lastErrorName: () => errorName,
    lastErrorPhase: () => errorPhase,
    trackStates: () => lastStream?.getTracks().map((track) => track.readyState) ?? [],
    apiSupported: () => typeof navigatorObj.mediaDevices?.getUserMedia === 'function',
    captureCount: () => sequence,
  }
}
