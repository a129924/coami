import { CaptureLedger, type ModFrame } from '../../../E008-camera-input/web/src/capture-ledger.ts'
import type { CameraFrame, CaptureOptions, HostCapture } from '../../../E008-camera-input/web/src/camera-observer.ts'

export type ConfirmedFrame = { frame: CameraFrame; metadata: ModFrame }
type Pending = { expected: number; frame?: CameraFrame; timer: ReturnType<typeof setTimeout>;
  resolve(frame: ConfirmedFrame): void; reject(error: Error): void }

/** A single-runtime pump. Invalidated instances are never reused by another run. */
export class CapturePump {
  private readonly ledger = new CaptureLedger()
  private pending: Pending | null = null
  private sequence = 0
  private active = true
  private readonly ports: { capture(options?: CaptureOptions): CameraFrame | undefined; request(): void; onFailure(error: Error): void }
  constructor(ports: { capture(options?: CaptureOptions): CameraFrame | undefined; request(): void; onFailure(error: Error): void }) { this.ports = ports }
  get busy(): boolean { return this.pending !== null }

  next(timeoutMs = 5000): Promise<ConfirmedFrame> {
    if (!this.active || this.pending) return Promise.reject(Error('capture inactive or busy'))
    return new Promise((resolve, reject) => {
      this.ledger.begin(1)
      this.pending = { expected: ++this.sequence, resolve, reject,
        timer: setTimeout(() => this.fail(Error('frame timeout')), timeoutMs) }
      try { this.ports.request() } catch (error) { this.fail(asError(error)) }
    })
  }

  /** Called synchronously by the injected Host.Camera wrapper. */
  capture(options?: CaptureOptions): CameraFrame | undefined {
    if (!this.active || !this.pending) return undefined
    const slot = this.pending
    const frame = this.ports.capture(options)
    if (frame && this.active && this.pending === slot) {
      slot.frame = { ...frame, buffer: frame.buffer.slice(0) }
    }
    return frame
  }

  host(record: HostCapture): void {
    if (!this.active) return
    if (!this.pending) { this.fail(Error('unsolicited host capture')); return }
    this.ledger.addHost(1, record)
  }

  receive(frame: ModFrame): void {
    if (!this.active) return
    const pending = this.pending
    if (!pending || frame.captureSeq !== pending.expected) { this.fail(Error('unexpected MOD sequence')); return }
    const pair = this.ledger.resolveMod(1, frame)
    const pixels = pending.frame
    if (pair.reason !== 'matched' || pair.source !== 'webcam' || !pixels
      || pixels.width !== 96 || pixels.height !== 96 || pixels.imageType !== 'rgb565le'
      || pixels.buffer.byteLength !== 18432) {
      this.fail(Error(`unverified frame: ${pair.reason}/${pair.source}`)); return
    }
    clearTimeout(pending.timer)
    this.pending = null
    pending.resolve({ frame: pixels, metadata: frame })
  }

  fail(error: Error): void {
    if (!this.active) return
    this.invalidate(error)
    this.ports.onFailure(error)
  }

  invalidate(error = Error('capture cancelled')): void {
    this.active = false
    this.ledger.invalidate()
    const pending = this.pending
    this.pending = null
    if (pending) { clearTimeout(pending.timer); pending.reject(error) }
  }
}
export function asError(value: unknown): Error { return value instanceof Error ? value : Error(String(value)) }
