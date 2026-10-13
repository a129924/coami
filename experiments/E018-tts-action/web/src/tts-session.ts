export const TEXT = { A: 'こんにちは。', B: 'おやすみなさい。' } as const
export type Choice = keyof typeof TEXT
export type RequestToken = Readonly<{ sessionId: string; runSeq: number; text: string }>
export type Outcome = 'completed' | 'failed' | 'unconfirmed'
export type Result = RequestToken & { outcome: Outcome; reason: string }
export type PlaybackPhase = 'started' | 'ended' | 'failed' | 'interrupted'
export type SessionEvent = { sessionId: string; kind: string; request?: RequestToken; detail?: string }
type Ports = {
  dispatch(button: 'a' | 'c'): void
  after(ms: number, callback: () => void): () => void
  changed(): void
  evidence(event: SessionEvent): void
}
type Pending = { token: RequestToken; bound: boolean; playing: boolean; ended: boolean;
  sdkSuccess: boolean; sdkSeen: boolean; cancelTimer(): void }

export class TtsSession {
  private readonly sessionId: string
  private readonly ports: Ports
  private status: 'initializing' | 'idle' | 'speaking' | 'locked' = 'initializing'
  private sequence = 0
  private pending: Pending | null = null
  private readonly results: Result[] = []

  constructor(sessionId: string, ports: Ports) { this.sessionId = sessionId; this.ports = ports }
  ready(): void {
    if (this.status !== 'initializing') return
    this.status = 'idle'; this.emit('ready'); this.ports.changed()
  }
  snapshot() {
    return { status: this.status, current: this.pending?.token ?? null,
      results: this.results.map(result => ({ ...result })) }
  }
  request(choice: Choice): RequestToken | null {
    if (this.status !== 'idle') { this.emit('rejected', undefined, this.status); return null }
    const token = Object.freeze({ sessionId: this.sessionId, runSeq: ++this.sequence, text: TEXT[choice] })
    const pending: Pending = { token, bound: false, playing: false, ended: false,
      sdkSuccess: false, sdkSeen: false, cancelTimer: () => {} }
    this.pending = pending; this.status = 'speaking'
    pending.cancelTimer = this.ports.after(30_000, () => {
      if (this.pending === pending) this.finish('unconfirmed', '30 秒內未取得可確認終態；重新載入後再試')
    })
    this.emit('accepted', token); this.ports.changed()
    try { this.ports.dispatch(choice === 'A' ? 'a' : 'c') }
    catch (error) { this.finish('unconfirmed', `dispatch: ${String(error)}`) }
    return token
  }
  started(runSeq: number, text: string): void {
    const p = this.match(runSeq, text)
    if (!p || p.bound) { this.emit('ignored-start', undefined, `${runSeq}: ${text}`); return }
    p.bound = true; this.emit('mod-started', p.token)
  }
  playbackToken(): RequestToken | null { return this.pending?.bound ? this.pending.token : null }
  playback(token: RequestToken, phase: PlaybackPhase, reason = ''): void {
    const p = this.pending
    if (!p?.bound || token.sessionId !== this.sessionId || token.runSeq !== p.token.runSeq || token.text !== p.token.text) {
      this.emit('ignored-playback', token, phase); return
    }
    this.emit(`playback-${phase}`, token, reason)
    if (phase === 'interrupted') { this.finish('unconfirmed', reason || '播放中斷'); return }
    if (phase === 'started') { if (!p.ended) p.playing = true }
    else if (phase === 'ended') {
      if (!p.playing || p.ended) return
      p.playing = false; p.ended = true
    } else if (phase === 'failed') p.playing = false
    this.tryComplete()
  }
  sdk(runSeq: number, text: string, success: boolean, valueOrReason: string): void {
    const p = this.match(runSeq, text)
    if (!p?.bound || p.sdkSeen) { this.emit('ignored-sdk', undefined, `${runSeq}: ${text}`); return }
    p.sdkSeen = true
    this.emit('sdk-result', p.token, JSON.stringify({ success, valueOrReason }))
    if (!success || valueOrReason !== p.token.text) {
      this.finish(p.playing ? 'unconfirmed' : 'failed', success ? 'SDK 回傳文字不符' : valueOrReason)
      return
    }
    p.sdkSuccess = true; this.tryComplete()
  }
  fatal(reason: string): void {
    if (this.pending) this.finish('unconfirmed', reason)
    else { this.status = 'locked'; this.emit('runtime-error', undefined, reason); this.ports.changed() }
  }
  private match(runSeq: number, text: string): Pending | null {
    return this.pending?.token.runSeq === runSeq && this.pending.token.text === text ? this.pending : null
  }
  private tryComplete(): void {
    if (this.pending?.sdkSuccess && this.pending.ended) this.finish('completed', 'SDK 成功且已自然播放結束；內容仍待真人聽辨')
  }
  private finish(outcome: Outcome, reason: string): void {
    const p = this.pending
    if (!p) return
    p.cancelTimer(); this.results.push({ ...p.token, outcome, reason })
    this.pending = null; this.status = outcome === 'unconfirmed' ? 'locked' : 'idle'
    this.emit(outcome, p.token, reason); this.ports.changed()
  }
  private emit(kind: string, request?: RequestToken, detail?: string): void {
    this.ports.evidence({ sessionId: this.sessionId, kind, request, detail })
  }
}

export function parseModTrace(message: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = []
  for (const line of message.split('\n')) {
    if (!line.startsWith('COAMI18|')) continue
    let record: unknown
    try { record = JSON.parse(line.slice(8)) } catch { throw Error('Malformed E018 MOD trace') }
    if (typeof record !== 'object' || record === null || Array.isArray(record)) throw Error('Invalid E018 MOD trace')
    records.push(record as Record<string, unknown>)
  }
  return records
}
