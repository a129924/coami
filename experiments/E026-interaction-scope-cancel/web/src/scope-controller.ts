export type Token = Readonly<{ runEpoch: string; robotId: string; scopeId: string }>
export type Operation = Token & Readonly<{ cancelId: string }>
export type State = 'idle' | 'opening' | 'active' | 'cancelling' | 'restartable' | 'quarantined'
export type RecordRow = { kind: string; at: number; token?: Token; operation?: Operation; detail?: string }
type Dependencies = {
  runEpoch: string; robotId: string; now(): number
  later(run: () => void, milliseconds: number): () => void
  stop(token: Token, stopped: (at: number) => void): Promise<void>
  notify(operation: Operation): void
  record(row: RecordRow): void
}
export const sameToken = (a: Token, b: Token): boolean => a.runEpoch === b.runEpoch && a.robotId === b.robotId && a.scopeId === b.scopeId

/** Browser-owned two-party barrier. No dependency on Robot SDK or Python internals. */
export class ScopeController {
  state: State = 'idle'
  private token: Token | null = null
  private operation: Operation | null = null
  private readonly used = new Set<string>()
  private queue: { token: Token; run: () => Promise<void> }[] = []
  private busy = false
  private robotClean = false
  private serverClean = false
  private effectsStopped = false
  private t0 = 0
  private cancelTimers: (() => void)[] = []
  private readonly deps: Dependencies
  constructor(deps: Dependencies) { this.deps = deps }
  private mark(kind: string, detail?: string): void { this.deps.record({ kind, at: this.deps.now(), token: this.token ?? undefined, operation: this.operation ?? undefined, detail }) }
  beginScope(scopeId: string): Token {
    if (!['idle', 'restartable'].includes(this.state) || this.used.has(scopeId) || !scopeId) throw Error('Scope cannot open')
    this.used.add(scopeId)
    this.token = Object.freeze({ runEpoch: this.deps.runEpoch, robotId: this.deps.robotId, scopeId })
    this.operation = null; this.state = 'opening'; this.queue = []; this.busy = false
    this.mark('scope-opening'); return this.token
  }
  activate(token: Token): void {
    if (this.state !== 'opening' || !this.token || !sameToken(token, this.token)) throw Error('Scope open ACK mismatch')
    this.state = 'active'; this.mark('scope-active')
  }
  permits(token: Token): boolean { return this.state === 'active' && this.token !== null && sameToken(token, this.token) }
  apply(token: Token, effect: () => void): boolean {
    if (!this.permits(token)) { this.mark('stale-effect-rejected'); return false }
    effect(); return true
  }
  enqueue(token: Token, run: () => Promise<void>): boolean {
    if (!this.permits(token)) return false
    this.queue.push({ token, run }); this.mark('queued'); this.drain(); return true
  }
  private drain(): void {
    if (this.busy) return
    const job = this.queue.shift()
    if (!job || !this.permits(job.token)) return
    this.busy = true; this.mark('action-started')
    let promise: Promise<void>
    try { promise = job.run() } catch (error) { this.fail(String(error)); return }
    void promise.then(() => {
      if (!this.permits(job.token)) return
      this.busy = false; this.mark('action-complete'); this.drain()
    }, error => { if (this.permits(job.token)) this.fail(String(error)) })
  }
  cancel(cancelId: string): Operation | null {
    if (this.operation) return this.operation
    if (!this.token || !['active', 'opening'].includes(this.state)) return null
    this.t0 = this.deps.now(); this.state = 'cancelling'
    this.operation = Object.freeze({ ...this.token, cancelId }); this.robotClean = false; this.serverClean = false; this.effectsStopped = false
    const dropped = this.queue.length; this.queue = []; this.mark('cancel-accepted', `discarded=${dropped}`)
    this.cancelTimers = [
      this.deps.later(() => { if (!this.effectsStopped) this.fail('stop-deadline') }, 1000),
      this.deps.later(() => this.fail('cleanup-deadline'), 5000),
    ]
    let local: Promise<void>
    try { local = this.deps.stop(this.token, at => {
      if (this.state !== 'cancelling') return
      if (!Number.isFinite(at) || at < this.t0 || at - this.t0 > 1000) { this.fail('stop-deadline'); return }
      this.effectsStopped = true; this.mark('effects-stopped')
    }) } catch (error) { local = Promise.reject(error) }
    // The Server notification is not awaited by local cancellation.
    try { this.deps.notify(this.operation) } catch (error) { this.fail(String(error)) }
    void local.then(() => {
      if (this.state !== 'cancelling') return
      if (!this.effectsStopped || this.deps.now() - this.t0 > 5000) { this.fail('local-cleanup-unconfirmed'); return }
      this.robotClean = true; this.mark('robot-cleaned'); this.checkBarrier()
    }, error => this.fail(String(error)))
    return this.operation
  }
  serverAck(operation: Operation, okay: boolean): void {
    if (!this.operation || !sameToken(operation, this.operation) || operation.cancelId !== this.operation.cancelId || this.state !== 'cancelling') { this.mark('stale-ack-rejected'); return }
    if (!okay || this.deps.now() - this.t0 > 5000) { this.fail('server-cleanup-failed'); return }
    this.serverClean = true; this.mark('server-cleaned'); this.checkBarrier()
  }
  disconnect(): void { if (this.state !== 'idle') this.fail('control-disconnected') }
  private checkBarrier(): void {
    if (this.state !== 'cancelling' || !this.robotClean || !this.serverClean) return
    this.state = 'restartable'; this.clearTimers(); this.mark('barrier-open')
  }
  private clearTimers(): void { for (const cancel of this.cancelTimers) cancel(); this.cancelTimers = [] }
  private fail(reason: string): void {
    if (this.state === 'quarantined') return
    this.state = 'quarantined'; this.queue = []; this.clearTimers(); this.mark('quarantined', reason)
  }
}
