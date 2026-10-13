export type State = 'initializing' | 'ready' | 'active' | 'cleaning' | 'unavailable' | 'error'
export type Metadata = { session: number; operation: number; sampleId: number; ticks: number; terminal: boolean; queued: boolean }
export type Tuple = { sample: number[]; meta: Metadata }
type Entry = Tuple & { phase: 'press' | 'move' | 'zero' }

export function positionSample(position: number): number[] {
  if (!Number.isFinite(position)) throw new Error('non-finite pointer position')
  const p = Math.round(Math.max(-100, Math.min(100, position)))
  return [Math.max(0, -p), 100 - Math.abs(p), Math.max(0, p)]
}

/** Raw input only. The pinned SDK owns every gesture decision. */
export class TopSwipeInput {
  readonly session: number
  state: State = 'initializing'
  reason = ''
  private readonly clock: () => number
  private readonly emit: (record: Record<string, unknown>) => void
  private queue: Entry[] = []
  private current: Tuple
  private pointer: number | null = null
  private operation = 0
  private sequence = 0
  private lastTicks = 0
  private barrier: number | null = null
  private readySeen = false

  constructor(session: number, clock: () => number, emit: (record: Record<string, unknown>) => void = () => {}) {
    this.session = session
    this.clock = clock
    this.emit = emit
    this.current = { sample: [0,0,0], meta: { session, operation: 0, sampleId: 0, ticks: 0, terminal: true, queued: false } }
  }
  get pending(): number { return this.queue.length }

  private ticks(): number {
    this.lastTicks = Math.max(this.lastTicks, Math.floor(this.clock()))
    return this.lastTicks
  }
  private enqueue(sample: number[], phase: Entry['phase'], replaceTail = false): Entry {
    const entry: Entry = { sample, phase, meta: { session: this.session, operation: this.operation,
      sampleId: ++this.sequence, ticks: this.ticks(), terminal: phase === 'zero', queued: true } }
    if (replaceTail) {
      const replaced = this.queue.pop()!
      this.emit({ kind: 'coalesced', session: this.session, sampleId: replaced.meta.sampleId,
        replacementSampleId: entry.meta.sampleId })
    }
    this.queue.push(entry)
    this.emit({ kind: 'raw', ...entry })
    return entry
  }
  modReady(): void {
    if (this.state !== 'initializing' || this.readySeen) return
    this.readySeen = true
    this.barrier = this.enqueue([0,0,0], 'zero').meta.sampleId
  }
  begin(pointerId: number, position: number): boolean {
    if (this.state !== 'ready') return false
    const sample = positionSample(position)
    this.operation++
    this.pointer = pointerId
    this.state = 'active'
    this.enqueue(sample, 'press')
    return true
  }
  move(pointerId: number, position: number): void {
    if (this.state !== 'active' || pointerId !== this.pointer) return
    const sample = positionSample(position)
    const tail = this.queue.at(-1)
    const previous = this.queue.at(-2) ?? this.current
    const axis = (value: number[]) => value[2]! - value[0]!
    // Keep press, every turning point, and the latest endpoint. Intermediate
    // monotonic positions cannot change this SDK's displacement-based decision.
    const replaceTail = tail?.phase === 'move'
      && (axis(tail.sample) - axis(previous.sample)) * (axis(sample) - axis(tail.sample)) >= 0
    if (!replaceTail && this.queue.length >= 128) { this.fail('input FIFO exceeded 128 entries'); return }
    this.enqueue(sample, 'move', replaceTail)
  }
  end(pointerId: number): void {
    if (this.state !== 'active' || pointerId !== this.pointer) return
    if (this.queue.length >= 128) { this.fail('input FIFO exceeded 128 entries'); return }
    this.state = 'cleaning'
    this.pointer = null
    this.barrier = this.enqueue([0,0,0], 'zero').meta.sampleId
  }
  cancel(pointerId?: number): void {
    if (this.state !== 'active' || (pointerId !== undefined && pointerId !== this.pointer)) return
    this.cleanup()
  }
  private cleanup(): void {
    this.queue = this.queue.filter(entry => entry.phase === 'press')
    this.pointer = null
    if (this.state !== 'error' && this.state !== 'unavailable') this.state = 'cleaning'
    this.barrier = this.enqueue([0,0,0], 'zero').meta.sampleId
  }
  fail(reason: string, unavailable = false): void {
    this.state = unavailable ? 'unavailable' : 'error'
    this.reason = reason
    this.cleanup()
    this.emit({ kind: 'input-error', session: this.session, reason })
  }
  take(): Tuple {
    const entry = this.queue.shift()
    this.current = entry
      ? { sample: [...entry.sample], meta: { ...entry.meta } }
      : { sample: [...this.current.sample], meta: { ...this.current.meta, ticks: this.ticks(), queued: false } }
    if (entry) this.emit({ kind: 'consuming', ...this.current })
    return { sample: [...this.current.sample], meta: { ...this.current.meta } }
  }
  /** Called only after SDK update and synchronous MOD event callbacks. */
  consumed(session: number, sampleId: number): void {
    const meta = this.current.meta
    if (session !== this.session || !meta.queued || sampleId !== meta.sampleId) return
    this.emit({ kind: 'consumed', ...meta })
    meta.queued = false
    if (meta.terminal && sampleId === this.barrier) {
      this.barrier = null
      if (this.state === 'initializing' || this.state === 'cleaning') this.state = 'ready'
    }
  }
}
