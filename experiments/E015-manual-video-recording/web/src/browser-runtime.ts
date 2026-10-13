import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { createObservedCameraBridge, digestBytes, type ObservedBridge } from '../../../E008-camera-input/web/src/camera-observer.ts'
import type { ModFrame } from '../../../E008-camera-input/web/src/capture-ledger.ts'
import { CapturePump, RuntimeSignals, asError } from './capture-pump.ts'
import { guardRecorderCreation, type RecorderEvents, type RecorderPort, type Run, type Playback } from './recording-session.ts'

type Elements = { viewport: HTMLCanvasElement; screen: HTMLCanvasElement; canvas: HTMLCanvasElement;
  player: HTMLVideoElement; evidence(message: string): void }
const PIN = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const FRAME = { width: 96, height: 96, imageType: 'rgb565le' as const }

export class BrowserRuntime {
  private readonly elements: Elements
  private playback: Playback | null = null
  constructor(elements: Elements) { this.elements = elements }

  async open(signal: AbortSignal, failed: (error: Error) => void): Promise<Run> {
    if (typeof MediaRecorder === 'undefined' || typeof this.elements.canvas.captureStream !== 'function') {
      throw Error('此瀏覽器缺少 MediaRecorder／canvas.captureStream')
    }
    if (!navigator.mediaDevices?.getUserMedia) throw Error('此環境無 webcam API；請使用 localhost')
    // Never request camera permission before the served pinned assets are verified.
    await verifyRuntime(signal)
    const response = await fetch('/coami-mod.xsa', { signal })
    if (!response.ok) throw Error('缺少 E015 MOD；請執行 npm run prepare:poc')
    const bytes = new Uint8Array(await response.arrayBuffer())
    const installed = { name: 'coami-mod.xsa', bytes, size: bytes.length, storage: 'memory' as const }
    const video = document.createElement('video'); video.muted = true; video.playsInline = true
    const sourceCanvas = document.createElement('canvas')
    const { canvas, viewport, screen } = this.elements
    canvas.width = 96; canvas.height = 96
    const ctx = canvas.getContext('2d')
    if (!ctx) throw Error('recording canvas unavailable')
    let engine: SimulatorEngine | undefined
    let closed = false, pairs = 0
    let cleanupFailure: Error | null = null
    const digests = new Set<string>()
    const readiness = new RuntimeSignals()
    const observer = createObservedCameraBridge({ videoElement: video, canvasElement: sourceCanvas,
      onCapture: (record) => pump.host(record) })
    const pump = new CapturePump({ capture: (options) => observer.bridge.capture(options),
      request: () => engine!.pushButton('c'), onFailure: failed })
    const bridge: ObservedBridge = { ...observer.bridge,
      start: async (options) => {
        if (closed) throw Error('camera run cancelled')
        await observer.bridge.start(options)
        if (closed) observer.bridge.stop()
      }, capture: (options) => pump.capture(options) }
    const cleanup = () => {
      if (closed) { if (cleanupFailure) throw cleanupFailure; return }
      closed = true; pump.invalidate()
      signal.removeEventListener('abort', onAbort)
      readiness.close(Error('run cancelled'))
      const errors: string[] = []
      for (const action of [() => observer.bridge.stop(), () => engine?.dispose()]) {
        try { action() } catch (error) { errors.push(asError(error).message) }
      }
      const states = observer.trackStates()
      const count = observer.captureCount()
      this.elements.evidence(`停止取像：pairs=${pairs}, distinct=${digests.size}, tracks=${states.join(',') || 'none'}, captures=${count}`)
      // No frames/pixels are retained in the evidence transcript.
      setTimeout(() => this.elements.evidence(`停止後 250ms：captures=${observer.captureCount()}, stationary=${count === observer.captureCount()}`), 250)
      if (states.some((state) => state !== 'ended')) errors.push('webcam track not ended')
      if (errors.length) { cleanupFailure = Error(errors.join('; ')); throw cleanupFailure }
    }
    const onAbort = () => { try { cleanup() } catch (error) { cleanupFailure = asError(error) } }
    signal.addEventListener('abort', onAbort, { once: true })
    const fatal = (error: Error) => {
      if (closed) return
      readiness.close(error); failed(error)
    }
    try {
      signal.throwIfAborted()
      engine = new SimulatorEngine({ viewport, screen, runtimeBaseUrl: new URL('/simulator/', location.href).href,
        modStorage: { async loadInstalledMod() { return installed }, async clearInstalledMod() {},
          async saveInstalledMod(mod: { name: string; bytes: Uint8Array }) { return { ...mod, size: mod.bytes.length, storage: 'memory' as const } } },
        onModStatus: ({ status }) => { if (!closed) this.elements.evidence(`MOD 安裝狀態：${status}`) },
        onReady: ({ installationStatus }) => {
          if (closed) return
          if (installationStatus !== 'prepared' && installationStatus !== 'installed') fatal(Error(`MOD install: ${installationStatus}`))
          else { this.elements.evidence(`runtime ready：${installationStatus}`); readiness.deliver('installed') }
        },
        onTrace: (message) => {
          if (closed) return
          for (const line of message.split('\n')) {
            if (!line.startsWith('COAMI15|')) continue
            let record: unknown
            try { record = JSON.parse(line.slice(8)) } catch { fatal(Error('malformed MOD trace')); return }
            if (!isRecord(record)) { fatal(Error('invalid MOD trace')); return }
            if (record.kind === 'digest-probe') {
              const probe = new Uint8Array([0, 1, 127, 128, 255, 13, 42, 99])
              if (record.digest !== digestBytes(probe) || record.empty !== digestBytes(new Uint8Array())
                || record.zero !== digestBytes(new Uint8Array([0])) || record.length !== 8 || record.first !== 0 || record.last !== 99) {
                fatal(Error('cross-runtime digest probe mismatch')); return
              }
              this.elements.evidence('固定 digest 探針一致'); readiness.deliver('probe')
            } else if (record.kind === 'started') readiness.deliver('camera-started')
            else if (record.kind === 'frame') {
              if (!isFrame(record)) { fatal(Error('invalid MOD frame trace')); return }
              pump.receive(record)
            } else if (record.kind === 'frame-error' || record.kind === 'start-error' || record.kind === 'stop-error') {
              fatal(Error(`MOD ${String(record.kind)}: ${String(record.error)}`))
            }
          }
        }, onError: (error) => fatal(asError(error)),
      })
      const injectable = engine as SimulatorEngine & { cameraBridge: ObservedBridge; hostBridge: { Camera: ObservedBridge } }
      injectable.cameraBridge = bridge; injectable.hostBridge.Camera = bridge
      await engine.start(); signal.throwIfAborted()
      await readiness.wait('installed'); await readiness.wait('probe')
      await bridge.start({ ...FRAME, useBrowserCamera: true }); signal.throwIfAborted()
      if (!bridge.isBrowserCameraStarted()) throw Error(`webcam unavailable: ${observer.lastErrorName() ?? 'no usable device'}`)
      const stream = video.srcObject as MediaStream | null
      for (const track of stream?.getTracks() ?? []) {
        track.addEventListener('ended', () => { if (!closed) fatal(Error('camera track ended')) }, { once: true })
      }
      engine.pushButton('a'); await readiness.wait('camera-started')
      const capture = async () => {
        const confirmed = await pump.next()
        signal.throwIfAborted()
        drawRgb565(ctx, confirmed.frame.buffer)
        pairs++; digests.add(confirmed.metadata.digest)
        this.elements.evidence(`MOD #${confirmed.metadata.captureSeq} webcam matched · digest=${confirmed.metadata.digest} · luma=${confirmed.metadata.meanLuma} · pairs=${pairs} · distinct=${digests.size}`)
      }
      return { first: capture, next: capture, cleanup }
    } catch (error) {
      try { cleanup() } catch (cleanupError) { throw Error(`${asError(error).message}; ${asError(cleanupError).message}`) }
      throw error
    }
  }

  recorder(events: RecorderEvents): RecorderPort {
    const mimeType = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
    if (!mimeType) throw Error('瀏覽器不支援本實驗的影片 MIME')
    const stream = this.elements.canvas.captureStream(10)
    const recorder = guardRecorderCreation(stream, () => new MediaRecorder(stream, { mimeType }))
    recorder.addEventListener('start', events.started)
    recorder.addEventListener('dataavailable', (event) => events.data(event.data))
    recorder.addEventListener('stop', events.stopped)
    recorder.addEventListener('error', () => events.error(Error('MediaRecorder error')))
    this.elements.evidence(`recorder mime=${recorder.mimeType}, audioTracks=${stream.getAudioTracks().length}`)
    return { mimeType: recorder.mimeType, start: () => recorder.start(),
      stop: () => { if (recorder.state !== 'inactive') recorder.stop() },
      release: () => {
        for (const track of stream.getTracks()) track.stop()
        const states = stream.getTracks().map((track) => track.readyState)
        this.elements.evidence(`canvas tracks=${states.join(',')}`)
        if (states.some((state) => state !== 'ended')) throw Error('canvas track not ended')
      } }
  }

  load(blob: Blob, signal: AbortSignal): Promise<Playback> {
    const player = this.elements.player
    const url = URL.createObjectURL(blob)
    let disposed = false
    const result: Playback = { dispose: () => {
      if (disposed) return
      disposed = true; URL.revokeObjectURL(url)
      if (player.getAttribute('src') === url) { player.pause(); player.removeAttribute('src'); player.load() }
    } }
    this.playback = result
    return new Promise((resolve, reject) => {
      const detach = () => {
        player.removeEventListener('loadeddata', loaded); player.removeEventListener('error', error)
        signal.removeEventListener('abort', abort)
      }
      const loaded = () => {
        if (player.error || player.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
        detach(); resolve(result)
      }
      const error = () => { detach(); result.dispose(); reject(Error('播放器無法載入影片')) }
      const abort = () => { detach(); result.dispose(); reject(Error('player load cancelled')) }
      player.addEventListener('loadeddata', loaded); player.addEventListener('error', error)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) { abort(); return }
      player.src = url; player.load()
    })
  }
  clear(): void {
    this.playback?.dispose(); this.playback = null
    const ctx = this.elements.canvas.getContext('2d'); ctx?.clearRect(0, 0, 96, 96)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function isFrame(value: Record<string, unknown>): value is ModFrame & Record<string, unknown> {
  return value.kind === 'frame' && Number.isInteger(value.captureSeq) && Number.isInteger(value.width)
    && Number.isInteger(value.height) && value.imageType === 'rgb565le' && Number.isInteger(value.byteLength)
    && typeof value.digest === 'string' && typeof value.meanLuma === 'number'
}
function drawRgb565(ctx: CanvasRenderingContext2D, buffer: ArrayBuffer): void {
  const bytes = new Uint8Array(buffer), image = ctx.createImageData(96, 96)
  for (let offset = 0, pixel = 0; offset < bytes.length; offset += 2, pixel += 4) {
    const value = bytes[offset]! | (bytes[offset + 1]! << 8)
    image.data[pixel] = Math.round(((value >> 11) & 31) * 255 / 31)
    image.data[pixel + 1] = Math.round(((value >> 5) & 63) * 255 / 63)
    image.data[pixel + 2] = Math.round((value & 31) * 255 / 31); image.data[pixel + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
}
async function verifyRuntime(signal: AbortSignal): Promise<void> {
  const response = await fetch('/runtime-provenance.json', { signal })
  if (!response.ok) throw Error('缺少 pinned runtime；請依 README 設定工具鏈並執行 npm run prepare:poc')
  const data: unknown = await response.json()
  if (!isRecord(data) || data.sourceCommit !== PIN || !isRecord(data.sha256)) throw Error('runtime provenance mismatch')
  for (const name of ['mc.js', 'mc.wasm']) {
    const asset = await fetch(`/simulator/${name}`, { signal })
    if (!asset.ok) throw Error(`missing ${name}`)
    const hash = await crypto.subtle.digest('SHA-256', await asset.arrayBuffer())
    const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
    if (hex !== data.sha256[name]) throw Error(`${name} SHA-256 mismatch`)
  }
}
