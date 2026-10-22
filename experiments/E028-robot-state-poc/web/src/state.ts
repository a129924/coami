export type Activity = 'recording' | 'output' | 'head'
export type Resource = 'microphone' | 'output' | 'appearance' | 'head'
export type Action = 'record' | 'say' | 'replay' | 'head.nod'
export type State = 'inactive' | 'requested' | 'active' | 'unknown'
export type Identity = Readonly<{ sessionEpoch: string; operationId: string }>
export const RESOURCES: Readonly<Record<Action, readonly Resource[]>> = Object.freeze({ record: Object.freeze(['microphone'] as const), say: Object.freeze(['output','appearance'] as const), replay: Object.freeze(['output'] as const), 'head.nod': Object.freeze(['head','appearance'] as const) })
export type Operation = Readonly<{ identity: Identity; action: Action; resources: readonly Resource[]; state: State; external: boolean }>
export type Observation = { kind: 'start' | 'end' | 'uncertain'; identity: Identity; reason?: string } | { kind: 'external'; identity: Identity; action: Action } | { kind: 'unattributed'; resource: Resource; reason: string }
export type Admission = { accepted: true; identity: Identity } | { accepted: false; reason: string; conflicts: readonly Identity[] }
export type Snapshot = { scope: 'managed-session'; sessionEpoch: string; activities: Record<Activity,State>; operations: readonly Operation[]; unknownOccupancy: readonly Resource[]; diagnostics: readonly string[]; pose: 'unknown'; motorStop: 'unknown' }
const activity = (action: Action): Activity => action === 'record' ? 'recording' : action === 'head.nod' ? 'head' : 'output'
const key = (id: Identity): string => JSON.stringify([id.sessionEpoch, id.operationId])
const clashes = (a: readonly Resource[], b: readonly Resource[]): boolean =>
  a.some(r => b.includes(r) || r === 'microphone' && b.includes('output') || r === 'output' && b.includes('microphone'))
function immutable<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) immutable(child)
    Object.freeze(value)
  }
  return value
}
export class Kernel {
  readonly sessionEpoch: string
  private serial = 0
  private operations = new Map<string, Operation>()
  private tombstones = new Set<string>()
  private occupancy = new Set<Resource>()
  private diagnostics: string[] = []

  constructor(sessionEpoch: string) { this.sessionEpoch = sessionEpoch }

  private note(message: string): void {
    this.diagnostics.push(message)
    if (this.diagnostics.length > 256) this.diagnostics.shift()
  }

  admit(action: Action): Admission {
    const resources = RESOURCES[action]
    const conflicts = [...this.operations.values()].filter(o => o.state !== 'inactive' && clashes(resources, o.resources))
    if (conflicts.length || clashes(resources, [...this.occupancy])) {
      return immutable({ accepted: false, reason: 'busy or unknown occupancy', conflicts: conflicts.map(o => ({ ...o.identity })) })
    }
    const identity = immutable({ sessionEpoch: this.sessionEpoch, operationId: `managed-${++this.serial}` })
    this.operations.set(key(identity), immutable({ identity, action, resources, state: 'requested', external: false }))
    return immutable({ accepted: true, identity })
  }

  observe(event: Observation): void {
    if (event.kind === 'unattributed') {
      this.occupancy.add(event.resource)
      this.note(`unattributed ${event.resource}: ${event.reason}`)
      return
    }
    if (event.identity.sessionEpoch !== this.sessionEpoch) { this.note('stale epoch ignored'); return }
    const token = key(event.identity), old = this.operations.get(token)
    if (event.kind === 'external') {
      if (old || this.tombstones.has(token)) { this.note('duplicate external identity ignored'); return }
      const resources = RESOURCES[event.action]
      if ([...this.operations.values()].some(o => o.state !== 'inactive' && clashes(resources, o.resources)) || clashes(resources, [...this.occupancy])) {
        this.note('policy violation: externally observed resource overlap retained')
      }
      this.operations.set(token, immutable({ identity: { ...event.identity }, action: event.action, resources, state: 'active', external: true }))
      return
    }
    if (!old) { this.note('unmatched identity ignored; adapter must report unattributed occupancy'); return }
    if (old.state === 'inactive') { this.note('tombstone ignored late lifecycle'); return }
    const state: State = event.kind === 'end' ? 'inactive' : event.kind === 'uncertain' ? 'unknown' : old.state === 'unknown' ? 'unknown' : 'active'
    this.operations.set(token, immutable({ ...old, state }))
    if (state === 'inactive') {
      this.tombstones.add(token)
      const finished = [...this.operations.entries()].filter(([, op]) => op.state === 'inactive')
      for (const [id] of finished.slice(0, Math.max(0, finished.length - 128))) this.operations.delete(id)
    }
    if (event.reason) this.note(event.reason)
  }

  snapshot(): Snapshot {
    const activities: Record<Activity, State> = { recording: 'inactive', output: 'inactive', head: 'inactive' }
    const precedence: Record<State, number> = { inactive: 0, requested: 1, active: 2, unknown: 3 }
    for (const op of this.operations.values()) {
      const a = activity(op.action)
      if (precedence[op.state] > precedence[activities[a]]) activities[a] = op.state
    }
    for (const r of this.occupancy) {
      if (r === 'microphone') activities.recording = 'unknown'
      if (r === 'output' || r === 'appearance') activities.output = 'unknown'
      if (r === 'head' || r === 'appearance') activities.head = 'unknown'
    }
    return immutable({ scope: 'managed-session', sessionEpoch: this.sessionEpoch, activities,
      operations: [...this.operations.values()].map(o => ({ ...o, identity: { ...o.identity }, resources: [...o.resources] })),
      unknownOccupancy: [...this.occupancy], diagnostics: [...this.diagnostics], pose: 'unknown', motorStop: 'unknown' })
  }
}
