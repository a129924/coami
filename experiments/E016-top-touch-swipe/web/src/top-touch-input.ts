export type RawSample = { channels: number[]; ticks: number; operation: number; sample: number; kind: 'start' | 'move' | 'end' | 'release' }
export function positionSample(x: number): number[] {
  if (!Number.isFinite(x)) throw new Error('Non-finite pointer position')
  const p = 2 * Math.round(100 * Math.min(1, Math.max(0, x))) - 100
  return [Math.max(-p, 0), 100 - Math.abs(p), Math.max(p, 0)]
}

/** Experiment-only raw driver. It has no gesture-name injection API. */
export class TopTouchInput {
  state: 'initializing' | 'ready' | 'fault' | 'unavailable' = 'initializing'
  error = ''
  operation = 0
  initialPosition = 0
  position = 0
  private active: { pointer: number; operation: number } | null = null
  private queue: RawSample[] = []
  private current: RawSample = { channels: [0,0,0], ticks: 0, operation: 0, sample: 0, kind: 'release' }
  private locked = false
  private serial = 0
  private lastTicks = 0
  private lastAck = 0
  private pendingSince: number | null = null
  readonly session: number
  private readonly limit: number
  private readonly epoch = performance.now()
  constructor(session: number, limit = 4096) { this.session = session; this.limit = limit }
  now(): number { return Math.floor(performance.now() - this.epoch) }
  get pending(): number { return this.queue.length }
  setReady(): void { if (this.state === 'initializing') this.state = 'ready' }
  fail(reason: string): void { this.state = 'fault'; this.error = reason; this.active = null; this.queue = [] }
  unavailable(reason: string): void { this.fail(reason); this.state = 'unavailable' }
  private enqueue(channels: number[], time: number, operation: number, kind: RawSample['kind']): void {
    if (!Number.isFinite(time) || time < 0 || time > 0x7fffffff) { this.fail('invalid session timestamp'); return }
    if (this.queue.length >= this.limit) { this.fail('raw input FIFO overflow; reset required'); return }
    this.lastTicks = Math.max(this.lastTicks, Math.floor(time))
    if (!this.queue.length) this.pendingSince = this.lastTicks
    this.queue.push({ channels, ticks: this.lastTicks, operation, sample: ++this.serial, kind })
  }
  down(pointer: number, primary: boolean, x: number, time: number): boolean {
    if (this.state !== 'ready' || !primary || this.active) return false
    const channels = positionSample(x)
    this.active = { pointer, operation: ++this.operation }
    this.initialPosition = this.position = this.toPosition(channels)
    this.enqueue(channels, time, this.operation, 'start')
    return this.state === 'ready'
  }
  move(pointer: number, x: number, time: number): void {
    if (this.state !== 'ready' || this.active?.pointer !== pointer) return
    const channels = positionSample(x)
    this.position = this.toPosition(channels)
    this.enqueue(channels, time, this.active.operation, 'move')
  }
  up(pointer: number, x: number, time: number): void {
    if (this.state !== 'ready' || this.active?.pointer !== pointer) return
    const operation = this.active.operation
    this.move(pointer, x, time)
    if (this.state !== 'ready') return
    this.enqueue([0,0,0], time, operation, 'release')
    this.active = null
  }
  cancel(pointer: number, time: number): void {
    if (this.state !== 'ready' || this.active?.pointer !== pointer) return
    const operation = this.active.operation
    this.queue = this.queue.filter(s => s.operation !== operation || s.kind === 'start')
    this.enqueue([0,0,0], time, operation, 'release')
    this.active = null
  }
  private toPosition(channels: number[]): number { return (channels[2] ?? 0) - (channels[0] ?? 0) }
  beginSample(): void {
    if (this.locked) { this.fail('sample lock re-entry'); return }
    if (this.state === 'fault' || this.state === 'unavailable') return
    this.current = this.queue.shift() ?? this.current
    this.locked = true
  }
  read(channel: number): number { return this.current.channels[channel] ?? 0 }
  ticks(): number { return this.current.ticks }
  meta(slot: number): number { return [this.session, this.current.operation, this.current.sample][slot] ?? 0 }
  completeSample(): void {
    if (!this.locked) return
    this.locked = false
    this.lastAck = this.now()
    if (!this.queue.length) this.pendingSince = null
  }
  checkHealth(now: number): void {
    if (this.state !== 'ready' || this.pendingSince === null) return
    if (now - Math.max(this.lastAck, this.pendingSince) > 2500) this.fail('raw input ack timeout; reset required')
  }
}
