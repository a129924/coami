export type State = 'idle' | 'starting' | 'recording' | 'finalizing' | 'ready' | 'blocked'
export type Run = { first(): Promise<void>; next(): Promise<void>; cleanup(): void }
export type Playback = { dispose(): void }
export type RecorderEvents = { started(): void; data(blob: Blob): void; stopped(): void; error(error: Error): void }
export type RecorderPort = { start(): void; stop(): void; release(): void; mimeType: string }
export type SessionPorts = {
  now(): number
  schedule(callback: () => void, ms: number): number
  unschedule(id: number): void
  openRun(signal: AbortSignal, failed: (error: Error) => void): Promise<Run>
  createRecorder(events: RecorderEvents): RecorderPort
  load(blob: Blob, signal: AbortSignal): Promise<Playback>
  clear(): void
  changed(): void
}
type Session = { capture: AbortController; final: AbortController; run?: Run; recorder?: RecorderPort;
  chunks: Blob[]; timers: Set<number>; cleaned: boolean; stopped: boolean; loading: boolean; playback?: Playback }

export class RecordingSession {
  state: State = 'idle'
  error = ''
  durationMs = 0
  bytes = 0
  private startedAt = 0
  private current: Session | null = null
  private readonly ports: SessionPorts
  constructor(ports: SessionPorts) { this.ports = ports }

  start(): void {
    if (this.state !== 'idle' && this.state !== 'ready') return
    if (this.current) {
      try { this.destroy(this.current) } catch (error) { this.discard(asError(error).message); return }
    }
    this.ports.clear()
    this.error = ''; this.durationMs = 0; this.bytes = 0
    const s: Session = { capture: new AbortController(), final: new AbortController(), chunks: [],
      timers: new Set(), cleaned: false, stopped: false, loading: false }
    this.current = s; this.setState('starting')
    void this.prepare(s)
  }

  private async prepare(s: Session): Promise<void> {
    try {
      const run = await this.ports.openRun(s.capture.signal, (error) => this.fail(s, error))
      if (!this.is(s) || s.capture.signal.aborted) { run.cleanup(); return }
      s.run = run
      await run.first()
      if (!this.is(s) || s.capture.signal.aborted) return
      s.recorder = this.ports.createRecorder({
        started: () => {
          if (!this.is(s) || this.state !== 'starting') return
          this.startedAt = this.ports.now(); this.setState('recording')
          this.timer(s, 60000, () => this.fail(s, Error('60 秒資源上限；本段已取消')))
          this.pump(s)
        },
        data: (blob) => { if (this.is(s) && !s.final.signal.aborted && blob.size) s.chunks.push(blob) },
        stopped: () => {
          if (!this.is(s)) return
          if (this.state !== 'finalizing') { this.fail(s, Error('recorder stopped unexpectedly')); return }
          s.stopped = true; this.publish(s)
        },
        error: (error) => this.fail(s, error),
      })
      s.recorder.start()
      // A recorder that never emits start must not leave the page stuck in Starting.
      this.timer(s, 5000, () => { if (this.state === 'starting') this.fail(s, Error('recorder start timeout')) })
    } catch (error) { this.fail(s, asError(error)) }
  }

  private pump(s: Session): void {
    this.timer(s, 100, () => {
      if (!this.is(s) || this.state !== 'recording') return
      void s.run!.next().then(() => {
        if (this.is(s) && this.state === 'recording') this.pump(s)
      }).catch((error: unknown) => {
        if (this.is(s) && this.state === 'recording') this.fail(s, asError(error))
      })
    })
  }

  stop(): void {
    const s = this.current
    if (!s || this.state !== 'recording') return
    this.durationMs = this.ports.now() - this.startedAt
    this.clearTimers(s); this.setState('finalizing')
    this.timer(s, 5000, () => this.fail(s, Error('finalization timeout (5 秒)')))
    try {
      s.recorder!.stop()
      this.cleanupCapture(s)
      s.recorder!.release()
      s.cleaned = true
      this.publish(s)
    } catch (error) { this.fail(s, asError(error)) }
  }

  private publish(s: Session): void {
    if (!this.is(s) || this.state !== 'finalizing' || !s.stopped || !s.cleaned || s.loading) return
    s.loading = true
    const blob = new Blob(s.chunks, { type: s.recorder!.mimeType })
    s.chunks = []
    if (!blob.size) { this.fail(s, Error('empty recording')); return }
    void this.ports.load(blob, s.final.signal).then((playback) => {
      if (!this.is(s) || this.state !== 'finalizing' || s.final.signal.aborted) { playback.dispose(); return }
      s.playback = playback; this.bytes = blob.size; this.clearTimers(s); this.setState('ready')
    }).catch((error: unknown) => this.fail(s, asError(error)))
  }

  cancel(): void {
    if (this.state !== 'starting' && this.state !== 'recording') return
    this.discard('本段已取消')
  }
  dispose(): void { this.discard('') }
  private is(s: Session): boolean { return this.current === s && !s.final.signal.aborted }
  private fail(s: Session, error: Error): void {
    if (this.is(s) && this.state !== 'ready') this.discard(error.message, error instanceof CleanupFailure)
  }
  private discard(message: string, cleanupFailed = false): void {
    const s = this.current
    this.current = null // Invalidate before stop can synchronously call back.
    this.error = message
    if (s) {
      try { this.destroy(s) } catch (error) { cleanupFailed = true; this.error = `${message}; ${asError(error).message}` }
    }
    try { this.ports.clear() } catch (error) { cleanupFailed = true; this.error += `; ${asError(error).message}` }
    this.bytes = 0
    if (cleanupFailed) this.error += '；資源清理未完成，請重新整理頁面'
    this.setState(cleanupFailed ? 'blocked' : 'idle')
  }
  private cleanupCapture(s: Session): void {
    s.capture.abort()
    s.run?.cleanup()
  }
  private destroy(s: Session): void {
    s.final.abort(); this.clearTimers(s); s.chunks = []
    const errors: string[] = []
    for (const cleanup of [() => this.cleanupCapture(s), () => s.recorder?.stop(),
      () => s.recorder?.release(), () => s.playback?.dispose()]) {
      try { cleanup() } catch (error) { errors.push(asError(error).message) }
    }
    if (errors.length) throw Error(errors.join('; '))
  }
  private timer(s: Session, ms: number, callback: () => void): void {
    const id = this.ports.schedule(() => { s.timers.delete(id); if (this.is(s)) callback() }, ms)
    s.timers.add(id)
  }
  private clearTimers(s: Session): void {
    for (const id of s.timers) this.ports.unschedule(id)
    s.timers.clear()
  }
  private setState(state: State): void { this.state = state; this.ports.changed() }
}
function asError(value: unknown): Error { return value instanceof Error ? value : Error(String(value)) }

export class CleanupFailure extends Error {}

/** Constructor failure owns a stream even though no recorder port exists yet. */
export function guardRecorderCreation<T>(stream: { getTracks(): { stop(): void }[] }, create: () => T): T {
  try { return create() }
  catch (error) {
    const failures: string[] = []
    for (const track of stream.getTracks()) {
      try { track.stop() } catch (cleanupError) { failures.push(asError(cleanupError).message) }
    }
    if (failures.length) throw new CleanupFailure(`${asError(error).message}; cleanup: ${failures.join('; ')}`)
    throw error
  }
}
