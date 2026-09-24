import type { CameraSource, HostCapture } from './camera-observer.ts'

export type ModFrame = {
  kind: 'frame'
  captureSeq: number
  width: number
  height: number
  imageType: 'rgb565le'
  byteLength: number
  digest: string
  meanLuma: number
}

export type PairResult = {
  source: CameraSource | 'unverified'
  reason: 'matched' | 'no-pending' | 'ambiguous-host' | 'mismatch'
  host?: HostCapture
  mod?: ModFrame
}

export class CaptureLedger {
  private pending: { generation: number; hosts: HostCapture[] } | null = null

  begin(generation: number): boolean {
    if (this.pending) return false
    this.pending = { generation, hosts: [] }
    return true
  }

  addHost(generation: number, host: HostCapture): void {
    if (this.pending?.generation === generation) this.pending.hosts.push(host)
  }

  resolveMod(generation: number, mod: ModFrame): PairResult {
    const pending = this.pending
    if (!pending || pending.generation !== generation) return { source: 'unverified', reason: 'no-pending' }
    this.pending = null
    if (pending.hosts.length !== 1) return { source: 'unverified', reason: 'ambiguous-host', mod }
    const [host] = pending.hosts
    if (!host || host.width !== mod.width || host.height !== mod.height || host.byteLength !== mod.byteLength
      || host.digest !== mod.digest || host.meanLuma !== mod.meanLuma || mod.imageType !== 'rgb565le') {
      return { source: 'unverified', reason: 'mismatch', host, mod }
    }
    return { source: host.source, reason: 'matched', host, mod }
  }

  invalidate(): void { this.pending = null }
  get busy(): boolean { return this.pending !== null }
}
