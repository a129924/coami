import { ACTION_CATALOG, type ActionCommand, type ActionId, type ActionRecord, type ActionResult, type ModTrace } from './action-contract.ts'

export type ButtonName = 'a' | 'b' | 'c'
type Event = { seq: number; trace: ModTrace }
type Waiter = { after: number; match: (trace: ModTrace) => boolean; resolve: (event: Event) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
class DispatchError extends Error {
  readonly code: string
  constructor(code: string, message: string) { super(message); this.code = code }
}

export class ActionDispatcher {
  readonly records: ActionRecord[] = []
  readonly catalog = ACTION_CATALOG
  private readonly events: Event[] = []
  private readonly waiters = new Set<Waiter>()
  private readonly pushButton: (name: ButtonName) => void
  private readonly now: () => string
  private readonly makeId: () => string
  private readonly timeoutMs: number
  private eventSeq = 0
  private generation = 0
  private ready = false
  private catalogReady = false
  private selectedIndex = -1
  private selectionSeq = 0
  private actionBusy = false
  private stopBusy = false
  private internalResetBusy = false
  private locked = false
  private activeAction: Promise<ActionResult> | null = null
  private pendingStopId: string | null = null
  private actionPhase: 'idle' | 'selecting' | 'running' = 'idle'

  constructor(
    pushButton: (name: ButtonName) => void,
    now: () => string = () => new Date().toISOString(),
    makeId: () => string = () => crypto.randomUUID(),
    timeoutMs = 7000,
  ) {
    this.pushButton = pushButton
    this.now = now
    this.makeId = makeId
    this.timeoutMs = timeoutMs
  }

  get canRun(): boolean { return this.ready && this.catalogReady && !this.actionBusy && !this.stopBusy && !this.internalResetBusy && !this.locked }
  get canStop(): boolean { return this.ready && this.catalogReady && !this.stopBusy && !this.internalResetBusy && !this.locked }
  get canDownload(): boolean { return this.records.length > 0 && !this.actionBusy && !this.stopBusy && !this.internalResetBusy }
  get simulatorGeneration(): number { return this.generation }
  get isLocked(): boolean { return this.locked }

  setReady(ready: boolean): void { this.ready = ready }

  ingest(trace: ModTrace): void {
    if (trace.catalog_version !== 1) return
    if (trace.kind === 'catalog') {
      this.catalogReady = trace.selected_index === -1 && trace.action_ids.length === ACTION_CATALOG.length &&
        trace.action_ids.every((id, index) => id === ACTION_CATALOG[index].id)
      if (this.catalogReady) { this.selectedIndex = -1; this.selectionSeq = 0 }
    }
    const event = { seq: ++this.eventSeq, trace }
    this.events.push(event)
    if (this.events.length > 300) this.events.shift()
    for (const waiter of [...this.waiters]) {
      if (event.seq <= waiter.after || !waiter.match(trace)) continue
      clearTimeout(waiter.timer)
      this.waiters.delete(waiter)
      waiter.resolve(event)
    }
  }

  restart(): void {
    this.generation += 1
    this.ready = false
    this.catalogReady = false
    this.selectedIndex = -1
    this.selectionSeq = 0
    this.locked = false
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer)
      waiter.reject(new DispatchError('simulator_restarted', 'Simulator restarted'))
    }
    this.waiters.clear()
    this.events.length = 0
  }

  run(actionId: ActionId): Promise<ActionResult> {
    const spec = ACTION_CATALOG.find((action) => action.id === actionId)
    const command = this.command(actionId, spec?.category ?? 'control')
    if (!spec || !this.canRun) return Promise.resolve(this.result(command, 'failed', null, null, spec ? 'unavailable' : 'unknown_action'))
    this.actionBusy = true
    this.actionPhase = 'selecting'
    const task = this.execute(command)
    this.activeAction = task
    void task.then(() => {
      if (this.activeAction === task) this.activeAction = null
      this.actionBusy = false
      this.actionPhase = 'idle'
    })
    return task
  }

  async stop(): Promise<ActionResult> {
    const command = this.command('control.stop', 'control')
    if (!this.canStop) return this.result(command, 'failed', null, null, 'unavailable')
    this.stopBusy = true
    this.pendingStopId = command.request_id
    const startedAt = this.now()
    const active = this.activeAction
    const generation = this.generation
    if (this.actionPhase === 'selecting') {
      for (const waiter of this.waiters) {
        clearTimeout(waiter.timer)
        waiter.reject(new DispatchError('cancelled', 'Action interrupted during selection'))
      }
      this.waiters.clear()
    }
    const cursor = this.eventSeq
    try {
      this.pushButton('b')
      const [reset] = await Promise.all([
        this.wait((trace) => trace.kind === 'reset' && (trace.phase === 'completed' || trace.phase === 'failed'), cursor),
        this.wait((trace) => trace.kind === 'reset' && trace.phase === 'released', cursor),
      ])
      if (active) await active
      if (this.generation !== generation) return this.result(command, 'failed', null, null, 'simulator_restarted')
      if (reset.trace.kind === 'reset' && reset.trace.phase === 'failed') {
        this.locked = true
        return this.result(command, 'failed', null, startedAt, 'reset_failed', reset.trace.error ?? null)
      }
      this.selectedIndex = -1
      this.selectionSeq = 0
      return this.result(command, 'completed', null, startedAt)
    } catch (error) {
      if (active) await active
      const failure = this.failure(error)
      if (this.generation === generation && failure.code !== 'simulator_restarted') this.locked = true
      return this.result(command, failure.status, null, startedAt, failure.code, failure.detail)
    } finally {
      if (this.pendingStopId === command.request_id) this.pendingStopId = null
      this.stopBusy = false
    }
  }

  private command(actionId: ActionCommand['action_id'], category: ActionCommand['category']): ActionCommand {
    const command: ActionCommand = { record_type: 'command', schema_version: 1, request_id: this.makeId(), action_id: actionId,
      category, source: 'human_button', simulator_generation: this.generation, requested_at: this.now() }
    this.records.push(command)
    return command
  }

  private result(command: ActionCommand, status: ActionResult['status'], runSeq: number | null, startedAt: string | null,
    errorCode: string | null = null, detail: string | null = null, cancelledBy: string | null = null): ActionResult {
    const { requested_at: _requestedAt, ...common } = command
    void _requestedAt
    const result: ActionResult = { ...common, record_type: 'result', mod_run_seq: runSeq, started_at: startedAt,
      finished_at: this.now(), status, error_code: errorCode, detail, cancelled_by_request_id: cancelledBy }
    this.records.push(result)
    return result
  }

  private async execute(command: ActionCommand): Promise<ActionResult> {
    const generation = this.generation
    let runSeq: number | null = null
    let startedAt: string | null = null
    try {
      const target = ACTION_CATALOG.findIndex((action) => action.id === command.action_id)
      const presses = this.selectedIndex < 0 ? target + 1 :
        (target - this.selectedIndex + ACTION_CATALOG.length) % ACTION_CATALOG.length
      for (let i = 0; i < presses; i += 1) {
        this.requireSelectionActive(generation)
        const next = (this.selectedIndex + 1) % ACTION_CATALOG.length
        const seq = this.selectionSeq + 1
        const cursor = this.eventSeq
        this.pushButton('a')
        const pressed = await this.wait((trace) => trace.kind === 'selection' && trace.phase === 'pressed', cursor)
        this.requireSelectionActive(generation)
        const selection = pressed.trace
        if (selection.kind !== 'selection' || selection.selection_seq !== seq || selection.selected_index !== next || selection.action_id !== ACTION_CATALOG[next].id) {
          throw new DispatchError('selection_mismatch', 'MOD selected an unexpected action')
        }
        const released = await this.wait((trace) => trace.kind === 'selection' && trace.phase === 'released', pressed.seq)
        this.requireSelectionActive(generation)
        const release = released.trace
        if (release.kind !== 'selection' || release.selection_seq !== seq || release.selected_index !== selection.selected_index ||
          release.action_id !== selection.action_id) {
          throw new DispatchError('selection_mismatch', 'A release did not match the selection')
        }
        this.selectedIndex = next
        this.selectionSeq = seq
      }
      this.requireSelectionActive(generation)
      if (this.selectedIndex !== target) throw new DispatchError('selection_mismatch', 'Target not selected')
      const cursor = this.eventSeq
      this.pushButton('c')
      const started = await this.wait((trace) => trace.kind === 'run' && trace.phase === 'started', cursor)
      this.requireGeneration(generation)
      const start = started.trace
      if (start.kind !== 'run' || start.action_id !== command.action_id) throw new DispatchError('run_mismatch', 'MOD started another action')
      runSeq = start.run_seq
      startedAt = this.now()
      this.actionPhase = 'running'
      const terminal = await this.wait((trace) => trace.kind === 'run' && trace.phase !== 'started' && trace.run_seq === runSeq, started.seq)
      this.requireGeneration(generation)
      const end = terminal.trace
      if (end.kind !== 'run' || end.action_id !== command.action_id || end.phase === 'started') throw new DispatchError('run_mismatch', 'MOD ended another action')
      if (end.phase === 'failed' && !this.stopBusy) await this.internalReset()
      return this.result(command, end.phase, runSeq, startedAt, end.phase === 'failed' ? 'mod_failed' : null,
        end.error ?? null, end.phase === 'cancelled' ? this.pendingStopId : null)
    } catch (error) {
      const failure = this.failure(error)
      if (failure.code !== 'simulator_restarted' && !this.stopBusy) await this.internalReset()
      return this.result(command, failure.status, runSeq, startedAt, failure.status === 'cancelled' ? null : failure.code,
        failure.detail, failure.status === 'cancelled' ? this.pendingStopId : null)
    }
  }

  private async internalReset(): Promise<void> {
    this.internalResetBusy = true
    const generation = this.generation
    const cursor = this.eventSeq
    try {
      this.pushButton('b')
      const [reset] = await Promise.all([
        this.wait((trace) => trace.kind === 'reset' && (trace.phase === 'completed' || trace.phase === 'failed'), cursor),
        this.wait((trace) => trace.kind === 'reset' && trace.phase === 'released', cursor),
      ])
      if (this.generation !== generation) return
      if (reset.trace.kind !== 'reset' || reset.trace.phase === 'failed') this.locked = true
      else { this.selectedIndex = -1; this.selectionSeq = 0 }
    } catch { if (this.generation === generation) this.locked = true }
    finally { this.internalResetBusy = false }
  }

  private requireGeneration(generation: number): void {
    if (generation !== this.generation) throw new DispatchError('simulator_restarted', 'Simulator restarted')
  }

  private requireSelectionActive(generation: number): void {
    this.requireGeneration(generation)
    if (this.stopBusy) throw new DispatchError('cancelled', 'Action interrupted during selection')
  }

  private failure(error: unknown): { status: 'failed' | 'timeout' | 'cancelled'; code: string; detail: string } {
    if (error instanceof DispatchError) return { status: error.code === 'timeout' ? 'timeout' : error.code === 'cancelled' ? 'cancelled' : 'failed', code: error.code, detail: error.message }
    return { status: 'failed', code: 'dispatch_error', detail: String(error) }
  }

  private wait(match: (trace: ModTrace) => boolean, after: number): Promise<Event> {
    const seen = this.events.find((event) => event.seq > after && match(event.trace))
    if (seen) return Promise.resolve(seen)
    return new Promise((resolve, reject) => {
      const waiter: Waiter = { after, match, resolve, reject, timer: setTimeout(() => {
        this.waiters.delete(waiter)
        reject(new DispatchError('timeout', 'MOD acknowledgement timed out'))
      }, this.timeoutMs) }
      this.waiters.add(waiter)
    })
  }
}
