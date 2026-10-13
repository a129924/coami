type Gesture = 'press' | 'release' | 'forwardSwipe' | 'backwardSwipe'
export type Observation = { kind: 'touch'; session: number; operation: number; sample: number; gesture: Gesture; ticks: number }
export class TouchFeedback {
  session = 0
  forward = 0
  backward = 0
  readonly records: Observation[] = []
  readonly operations = new Map<string, { forward: number; backward: number }>()
  start(session: number): void { this.session = session }
  ingest(line: string): boolean {
    if (!line.startsWith('COAMI16|')) return false
    let value: unknown
    try { value = JSON.parse(line.slice(8)) } catch { return false }
    if (!value || typeof value !== 'object') return false
    const e = value as Record<string, unknown>
    if (e.kind !== 'touch' || e.session !== this.session ||
      !['press','release','forwardSwipe','backwardSwipe'].includes(String(e.gesture)) ||
      !Number.isSafeInteger(e.operation) || Number(e.operation) <= 0 ||
      !Number.isSafeInteger(e.sample) || Number(e.sample) <= 0 ||
      !Number.isSafeInteger(e.ticks) || Number(e.ticks) < 0) return false
    const record = e as unknown as Observation
    this.records.push(record)
    const key = `${record.session}:${record.operation}`
    const count = this.operations.get(key) ?? { forward: 0, backward: 0 }
    if (record.gesture === 'forwardSwipe') { count.forward++; this.forward++ }
    if (record.gesture === 'backwardSwipe') { count.backward++; this.backward++ }
    this.operations.set(key, count)
    return true
  }
}
