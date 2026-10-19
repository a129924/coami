import type { Token } from './scope-controller.ts'
export type ContextPort = Pick<AudioContext, 'state' | 'currentTime' | 'destination' | 'resume' | 'close' | 'decodeAudioData' | 'createBufferSource'>
export type AudioRow = { kind: string; token: Token; at: number; sourceId?: number; reason?: string; clock?: number }
type Source = { node: AudioBufferSourceNode; ended: Promise<void>; cancelled: boolean; id: number; poll?: ReturnType<typeof setTimeout> }

/** Scope-local Host port: no duration fallback may claim playback ended. */
export class ScopeAudio {
  readonly context: ContextPort
  private readonly token: Token
  private readonly live: () => boolean
  private readonly emit: (row: AudioRow) => void
  private readonly sources = new Set<Source>()
  private readonly pending = new Set<Promise<boolean>>()
  private closed = false
  private serial = 0
  private cancellation: Promise<void> | null = null
  constructor(token: Token, live: () => boolean, emit: (row: AudioRow) => void, factory: () => ContextPort = () => new AudioContext()) {
    this.token = Object.freeze({ ...token }); this.live = live; this.emit = emit; this.context = factory()
  }
  private mark(kind: string, extra: Partial<AudioRow> = {}): void { this.emit({ ...extra, kind, token: this.token, at: performance.now(), clock: this.context.currentTime }) }
  unlock(): Promise<void> { return this.context.resume() }
  play(buffer: ArrayBuffer): Promise<boolean> {
    if (this.closed || !this.live() || buffer.byteLength === 0) return Promise.resolve(false)
    const result = this.playOwned(buffer); this.pending.add(result)
    void result.then(() => this.pending.delete(result), () => this.pending.delete(result))
    return result
  }
  private async playOwned(buffer: ArrayBuffer): Promise<boolean> {
    if (this.context.state === 'suspended') await this.context.resume()
    const decoded = await this.context.decodeAudioData(buffer.slice(0))
    if (this.closed || !this.live()) { this.mark('late-decode-discarded'); return false }
    const node = this.context.createBufferSource(); node.buffer = decoded; node.connect(this.context.destination)
    let finish!: () => void
    const ended = new Promise<void>(resolve => { finish = resolve })
    const source: Source = { node, ended, cancelled: false, id: ++this.serial }; this.sources.add(source)
    node.onended = () => {
      clearTimeout(source.poll)
      this.mark('source-ended', { sourceId: source.id, reason: source.cancelled ? 'cancelled' : 'natural' })
      node.disconnect(); node.onended = null; this.sources.delete(source); finish()
    }
    try {
      node.start(0); this.mark('source-started', { sourceId: source.id })
      const startClock = this.context.currentTime
      const observe = () => {
        if (!this.sources.has(source) || source.cancelled) return
        if (this.context.state === 'running' && this.context.currentTime > startClock) this.mark('source-running', { sourceId: source.id })
        else source.poll = setTimeout(observe, 10)
      }
      source.poll = setTimeout(observe, 10)
    }
    catch (error) { this.sources.delete(source); node.disconnect(); node.onended = null; finish(); throw error }
    await ended
    return !source.cancelled && !this.closed && this.live()
  }
  cancel(stopped: (at: number) => void): Promise<void> {
    if (this.cancellation) return this.cancellation
    this.closed = true; this.mark('audio-cancel-requested')
    const active = [...this.sources]
    for (const source of active) {
      source.cancelled = true; source.node.stop(); this.mark('source-stop-requested', { sourceId: source.id })
      clearTimeout(source.poll)
      source.node.disconnect(); this.mark('source-disconnected', { sourceId: source.id })
    }
    // Close starts immediately, but its Promise and every owned decode/play are awaited.
    const closing = this.context.close()
    const ended = Promise.all(active.map(source => source.ended)).then(() => { stopped(performance.now()); this.mark('audio-effects-stopped') })
    this.cancellation = Promise.all([ended, closing, ...this.pending]).then(() => {
      if (this.context.state !== 'closed') throw Error('AudioContext did not close')
      this.mark('audio-context-closed')
    })
    return this.cancellation
  }
}
