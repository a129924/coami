export type RequestToken = Readonly<{session_id: string; run_seq: number}>
export type PlaybackPhase = 'started' | 'ended' | 'failed' | 'interrupted'
export type State = 'idle' | 'busy' | 'completed' | 'failed' | 'unconfirmed' | 'closed'
export class TurnSession {
  state: State = 'idle'
  private sequence = 0
  private active: RequestToken | null = null
  private started = false
  private ended = false
  private sdkOk = false
  constructor(readonly id: string) {}
  begin(_context: string): RequestToken {
    if (this.state === 'busy') throw Error('busy')
    if (this.state === 'unconfirmed' || this.state === 'closed') throw Error('reload required')
    this.started = this.ended = this.sdkOk = false
    this.active = Object.freeze({session_id: this.id, run_seq: ++this.sequence})
    this.state = 'busy'
    return this.active
  }
  token(): RequestToken | null { return this.state === 'busy' ? this.active : null }
  accept(t: RequestToken): boolean {
    return this.state === 'busy' && this.active?.session_id === t.session_id && this.active.run_seq === t.run_seq
  }
  sdk(t: RequestToken, ok: boolean): void {
    if (!this.accept(t)) return
    if (!ok) { this.timeout(t); return }
    this.sdkOk = true; this.complete()
  }
  playback(t: RequestToken, phase: PlaybackPhase): void {
    if (!this.accept(t)) return
    if (phase === 'started') this.started = true
    else if (phase === 'ended') { this.ended = true; this.complete() }
    else this.timeout(t)
  }
  timeout(t: RequestToken): void {
    if (!this.accept(t)) return
    this.state = this.started && !this.ended ? 'unconfirmed' : 'failed'
    this.active = null
  }
  close(): void { this.state = 'closed'; this.active = null }
  private complete(): void {
    if (this.ended && this.sdkOk) { this.state = 'completed'; this.active = null }
  }
}

/** Accepted host operations count even if microphone/upload fails; never reset on reload. */
export class OperationBudget {
  constructor(private readonly store: Pick<Storage,'getItem'|'setItem'>,
    private readonly today: () => string = () => new Date().toISOString().slice(0,10)) {}
  accept(): void {
    const key='coami:E027:accepted-operations', raw=this.store.getItem(key)
    const value: unknown=raw===null?{count:0,started:this.today()}:JSON.parse(raw)
    if(typeof value!=='object'||value===null||!('count' in value)||!('started' in value)
      ||typeof value.count!=='number'||!Number.isInteger(value.count)||value.count<0
      ||value.count>=20||value.started!==this.today())throw Error('operation/day limit reached or invalid ledger; return to planning')
    this.store.setItem(key,JSON.stringify({count:value.count+1,started:value.started}))
  }
}
