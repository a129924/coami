import type { PlaybackPhase, RequestToken } from './turn-session.ts'

export type Playback = { stop(): void; disconnect(): void }
export type DecodedAudio = { length: number; duration: number; channels: number;
  start(onEnded: () => void): Playback }
export type AudioPort = { state(): string; resume(): Promise<void>; decode(bytes: ArrayBuffer): Promise<DecodedAudio>;
  observe(callback: () => void): () => void; close(): void }
export type PlaybackEvent = { token: RequestToken; phase: PlaybackPhase; reason?: string }
type Active = { token: RequestToken; settled: boolean; source?: Playback;
  detach(): void; finish(success: boolean, phase: PlaybackPhase, reason?: string): void }

export class StrictAudioBridge {
  private readonly port: AudioPort
  private readonly request: () => RequestToken | null
  private readonly evidence: (event: PlaybackEvent) => void
  private active: Active | null = null
  private closed = false
  private injectFailure = false
  constructor(port: AudioPort, request: () => RequestToken | null, evidence: (event: PlaybackEvent) => void) {
    this.port = port; this.request = request; this.evidence = evidence
  }
  async unlock(): Promise<void> {
    if (this.closed) throw Error('audio bridge closed')
    await this.port.resume()
    if (this.port.state() !== 'running') throw Error('音訊未解鎖；請檢查瀏覽器音訊權限')
  }
  failNext(): void { this.injectFailure = true }
  play(bytes: ArrayBuffer): Promise<boolean> {
    // Capture identity before decode/await; never relabel a late callback.
    const token = this.request()
    if (this.closed || this.active || !token) return Promise.resolve(false)
    return new Promise(resolve => {
      const active: Active = { token, settled: false, detach: () => {},
        finish: (success, phase, reason) => {
          if (active.settled) return
          active.settled = true; active.detach()
          if (this.active === active) this.active = null
          if (!success) { try { active.source?.stop() } catch { /* Already invalidated; never becomes ended evidence. */ } }
          try { active.source?.disconnect() } catch { /* Evidence outcome is already settled. */ }
          this.evidence({ token, phase, reason }); resolve(success)
        } }
      this.active = active
      active.detach = this.port.observe(() => {
        if (this.port.state() !== 'running') active.finish(false, 'interrupted', `AudioContext ${this.port.state()}`)
      })
      if (this.port.state() !== 'running') { active.finish(false, 'interrupted', 'AudioContext 未執行'); return }
      if (this.injectFailure) { this.injectFailure = false; active.finish(false, 'failed', 'injected playback failure'); return }
      if (!(bytes instanceof ArrayBuffer) || !bytes.byteLength) { active.finish(false, 'failed', 'empty audio buffer'); return }
      void this.port.decode(bytes.slice(0)).then(decoded => {
        if (active.settled) return
        if (this.port.state() !== 'running') { active.finish(false, 'interrupted', 'AudioContext 中斷'); return }
        if (!Number.isFinite(decoded.duration) || decoded.duration <= 0 || decoded.length <= 0 || decoded.channels <= 0) {
          active.finish(false, 'failed', 'empty decoded audio'); return
        }
        try {
          active.source = decoded.start(() => {
            if (this.port.state() !== 'running') active.finish(false, 'interrupted', 'AudioContext 中斷')
            else active.finish(true, 'ended')
          })
          if (!active.settled) this.evidence({ token, phase: 'started' })
        } catch (error) { active.finish(false, 'failed', String(error)) }
      }, error => { active.finish(false, 'failed', String(error)) })
    })
  }
  close(): void {
    if (this.closed) return
    this.closed = true
    this.active?.finish(false, 'interrupted', 'audio bridge closed')
    this.port.close()
  }
}

export function browserAudioPort(context: AudioContext): AudioPort {
  return {
    state: () => context.state,
    resume: () => context.resume(),
    observe: callback => { context.addEventListener('statechange', callback); return () => context.removeEventListener('statechange', callback) },
    close: () => { void context.close().catch(() => {}) },
    decode: async bytes => {
      const decoded = await context.decodeAudioData(bytes)
      return { length: decoded.length, duration: decoded.duration, channels: decoded.numberOfChannels,
        start: onEnded => {
          const source = context.createBufferSource()
          source.buffer = decoded; source.onended = onEnded; source.connect(context.destination)
          try { source.start(0) } catch (error) { source.disconnect(); throw error }
          return { stop: () => source.stop(), disconnect: () => source.disconnect() }
        } }
    },
  }
}
