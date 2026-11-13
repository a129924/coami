export type SaveTransport = (body: string) => Promise<Response>
export type ChunkStamp = { id: string; chunk: number; recordStart: number; recordEnd: number; snapshotEnd: number }
type Row = Record<string, unknown>
type Options = { transport: SaveTransport; id(): string; onError(value: string): void; onSaved(end: number, metadata: Row): void; maxBytes?: number }
type Pending = { bodies: { body: string; stamp: ChunkStamp }[]; next: number }
const bytes = (value: string): number => new TextEncoder().encode(value).length

export class EvidenceSaver {
  private cursor = 0
  private pending: Pending | null = null
  private flight: Promise<boolean> | null = null
  private readonly options: Options
  constructor(options: Options) { this.options = options }
  get savedThrough(): number { return this.cursor }
  save(metadata: Row, records: Row[]): Promise<boolean> {
    if (this.flight) return this.flight
    const target = records.length
    const task = this.perform(metadata, records, target)
    this.flight = task
    void task.finally(() => { this.flight = null })
    return task
  }
  private plan(metadata: Row, records: Row[], end: number): Pending {
    const limit = this.options.maxBytes ?? 1_900_000
    if (!Number.isSafeInteger(limit) || limit <= 0 || limit >= 2_000_000) throw Error('Invalid evidence request limit')
    const id = this.options.id(), bodies: Pending['bodies'] = []
    const meta = JSON.parse(JSON.stringify(metadata)) as Row
    let start = this.cursor, group: Row[] = [], size = 0
    const bodyFor = (part: Row[], stamp: ChunkStamp): string => JSON.stringify({ ...meta, records: part, save: stamp })
    const overhead = (chunk: number): number => bytes(bodyFor([], { id, chunk, recordStart: end, recordEnd: end, snapshotEnd: end }))
    let base = overhead(0)
    const flush = (): void => {
      const stamp = { id, chunk: bodies.length, recordStart: start, recordEnd: start + group.length, snapshotEnd: end }
      const body = bodyFor(group, stamp)
      if (bytes(body) > limit) throw Error('Evidence metadata exceeds request limit')
      bodies.push({ body, stamp }); start = stamp.recordEnd; group = []; size = 0; base = overhead(bodies.length)
    }
    for (let index = this.cursor; index < end; index++) {
      const encoded = JSON.stringify(records[index]), length = bytes(encoded)
      if (base + size + length + (group.length ? 1 : 0) > limit && group.length) flush()
      if (base + length > limit) throw Error(`Evidence record ${index} exceeds request limit; retained unsaved`)
      size += length + (group.length ? 1 : 0); group.push(JSON.parse(encoded) as Row)
    }
    if (group.length) flush()
    return { bodies, next: 0 }
  }
  private async perform(metadata: Row, records: Row[], target: number): Promise<boolean> {
    try {
      while (this.pending || this.cursor < target) {
        this.pending ??= this.plan(metadata, records, target)
        const pending = this.pending
        while (pending.next < pending.bodies.length) {
          const entry = pending.bodies[pending.next]!
          const response = await this.options.transport(entry.body)
          if (!response.ok) throw Error(`HTTP ${response.status}: ${await response.text()}`)
          const ack = await response.json() as { saved?: boolean; id?: string; chunk?: number; recordEnd?: number }
          if (ack.saved !== true || ack.id !== entry.stamp.id || ack.chunk !== entry.stamp.chunk || ack.recordEnd !== entry.stamp.recordEnd) throw Error('Evidence receipt mismatch; retained unsaved')
          this.cursor = entry.stamp.recordEnd; pending.next++
        }
        this.pending = null
      }
      this.options.onSaved(this.cursor, metadata); return true
    } catch (error) {
      this.options.onError(`Evidence save failed: ${String(error)}`); return false
    }
  }
}
