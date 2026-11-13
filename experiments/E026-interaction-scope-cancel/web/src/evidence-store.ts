import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import type { ChunkStamp } from './evidence-save.ts'
type Row = Record<string, unknown>
type Receipt = { saved: true } & Partial<ChunkStamp>
const object = (value: unknown): value is Row => typeof value === 'object' && value !== null && !Array.isArray(value)
function stamp(value: Row): ChunkStamp | null {
  if (value.save === undefined) return null // Keep existing E026 harness saves compatible.
  const s = value.save
  if (!object(s) || typeof s.id !== 'string' || !s.id || s.id.length > 100 ||
    !['chunk', 'recordStart', 'recordEnd', 'snapshotEnd'].every(k => typeof s[k] === 'number' && Number.isSafeInteger(s[k]) && s[k] >= 0)) throw Error('Invalid evidence chunk identity')
  const v = s as unknown as ChunkStamp
  if (!Array.isArray(value.records) || v.recordEnd - v.recordStart !== value.records.length || v.recordEnd > v.snapshotEnd || v.recordEnd <= v.recordStart) throw Error('Invalid evidence record range')
  return v
}
export class EvidenceStore {
  private readonly file: string
  private loaded = false
  private tail: Promise<unknown> = Promise.resolve()
  private readonly accepted = new Map<string, { hash: string; end: number; snapshotEnd: number }>()
  constructor(file: string) { this.file = file }
  append(value: unknown): Promise<Receipt> {
    const task = this.tail.then(() => this.persist(value))
    this.tail = task.catch(() => {})
    return task
  }
  private key(s: ChunkStamp): string { return JSON.stringify([s.id, s.chunk]) }
  private hash(body: string): string { return createHash('sha256').update(body).digest('hex') }
  private remember(s: ChunkStamp, body: string): void { this.accepted.set(this.key(s), { hash: this.hash(body), end: s.recordEnd, snapshotEnd: s.snapshotEnd }) }
  private async load(): Promise<void> {
    if (this.loaded) return
    let text: string
    try { text = await readFile(this.file, 'utf8') }
    catch (error) { if (object(error) && error.code === 'ENOENT') text = ''; else throw error }
    for (const line of text.split('\n')) {
      if (!line) continue
      const value: unknown = JSON.parse(line)
      if (object(value)) { const s = stamp(value); if (s) this.remember(s, JSON.stringify(value)) }
    }
    this.loaded = true
  }
  private async persist(value: unknown): Promise<Receipt> {
    if (!object(value) || typeof value.caseId !== 'string' || !value.caseId || !Array.isArray(value.records)) throw Error('Invalid evidence')
    const s = stamp(value), body = JSON.stringify(value)
    await this.load()
    if (s) {
      const old = this.accepted.get(this.key(s))
      if (old) {
        if (old.hash !== this.hash(body)) throw Error('Conflicting evidence retry')
        return { saved: true, ...s }
      }
      if (s.chunk > 0) {
        const previous = this.accepted.get(this.key({ ...s, chunk: s.chunk - 1 }))
        if (!previous || previous.end !== s.recordStart || previous.snapshotEnd !== s.snapshotEnd) throw Error('Evidence chunk out of order')
      }
    }
    await mkdir(path.dirname(this.file), { recursive: true })
    await appendFile(this.file, body + '\n')
    if (s) this.remember(s, body)
    return { saved: true, ...(s ?? {}) }
  }
}
