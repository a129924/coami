export type Snapshot = { session: number; operation: number; sampleId: number; ticks: number; terminal: boolean; queued: boolean }
export type TouchEvent = { kind: string; gesture: string; ticks: number; position?: number; intensity?: number; tap?: unknown }
export type EventRecord = { kind: 'event'; event: TouchEvent; meta: Snapshot; count: number }
export class SwipeObserver {
  private session: number | undefined
  private count = 0
  receive(event: TouchEvent, snapshot: Snapshot | undefined): EventRecord {
    if (!snapshot || !Number.isInteger(snapshot.session) || !Number.isInteger(snapshot.sampleId)
      || !Number.isInteger(snapshot.operation) || snapshot.ticks !== event.ticks)
      throw new Error('missing or incoherent E017 metadata')
    if (this.session !== undefined && snapshot.session !== this.session) throw new Error('E017 session mismatch')
    this.session = snapshot.session
    if (event.gesture === 'forwardSwipe' || event.gesture === 'backwardSwipe') this.count++
    return { kind: 'event', event: { ...event }, meta: { ...snapshot }, count: this.count }
  }
}
