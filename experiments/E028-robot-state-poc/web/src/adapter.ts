import { Kernel, type Action, type Admission, type Identity } from './state.ts'
export type AudioEvent = { kind: 'capture-start' | 'capture-stop' | 'capture-ended' | 'capture-bytes' | 'source-scheduled' | 'playback-running' | 'playback-ended' | 'audio-issue'; token: Identity | null; sourceId?: string; bytes?: number; natural?: boolean; clockAdvanced?: boolean; interrupted?: boolean; reason?: string; resource?: 'microphone' | 'output' }
export type ModEvent = { kind: 'called' | 'sequence-start' | 'sequence-end' | 'terminal'; op: Action; seq: number; success?: boolean }
export type Host = { button(action: Exclude<Action,'replay'>): void; replay(buffer: ArrayBuffer, identity: Identity): Promise<boolean> }
type Work = { identity: Identity; action: Action; seq?: number; producer: boolean; poisoned: boolean; finished: boolean; sources: Map<string,{ started: boolean; ended: boolean }> }
const token = (id: Identity): string => JSON.stringify([id.sessionEpoch,id.operationId])
export class Adapter {
  readonly kernel: Kernel
  private host: Host
  private pending = new Map<Action,Work>()
  private bound = new Map<Action,Work>()
  private bySequence = new Map<number,Work>()
  private works = new Map<string,Work>()
  private lastSequence = 0
  private buffer: ArrayBuffer | null = null
  private latestRecord: Work | null = null

  constructor(epoch: string, host: Host) { this.kernel = new Kernel(epoch); this.host = host }

  request(action: Action): Admission {
    if (action === 'replay' && !this.buffer?.byteLength) return { accepted:false, reason:'No current in-memory recording', conflicts:[] }
    const result = this.kernel.admit(action)
    if (!result.accepted) return result
    const work: Work = { identity:result.identity, action, producer:false, poisoned:false, finished:false, sources:new Map() }
    this.works.set(token(result.identity),work)
    if (action === 'record') { this.buffer = null; this.latestRecord = work }
    if (action === 'replay') {
      const bytes = this.buffer
      if (!bytes) throw Error('Replay precondition changed synchronously')
      this.bound.set(action,work)
      void this.host.replay(bytes,result.identity).then(success => this.terminal(work,success),() => this.terminal(work,false))
    } else {
      this.pending.set(action,work)
      try { this.host.button(action) } catch { this.uncertain(work,'dispatch failed') }
    }
    return result
  }

  tokenFor(action: Action): Identity | null { return this.bound.get(action)?.identity ?? null }

  mod(event: ModEvent): void {
    if (!Number.isSafeInteger(event.seq) || event.seq <= 0) return
    if (event.kind === 'called') {
      const work = this.pending.get(event.op)
      if (!work || event.seq <= this.lastSequence) return
      this.lastSequence = event.seq
      work.seq = event.seq
      this.pending.delete(event.op)
      this.bound.set(event.op,work)
      this.bySequence.set(event.seq,work)
      return
    }
    const work = this.bySequence.get(event.seq)
    if (!work || work.action !== event.op) return
    if (event.kind === 'sequence-start' && event.op === 'head.nod') this.kernel.observe({kind:'start',identity:work.identity})
    else if (event.kind === 'sequence-end' && event.op === 'head.nod') this.end(work)
    else if (event.kind === 'terminal') this.terminal(work,event.success === true)
  }

  captured(identity: Identity | null, buffer: ArrayBuffer): void {
    if (!identity) return
    const work = this.works.get(token(identity))
    if (work?.action === 'record' && this.latestRecord === work && buffer.byteLength) this.buffer = buffer
  }

  audio(event: AudioEvent): void {
    const work = event.token ? this.works.get(token(event.token)) : undefined
    if (!work) {
      const resources = event.kind === 'audio-issue' ? event.resource ? [event.resource] : ['microphone', 'output'] as const : [event.kind.startsWith('capture') ? 'microphone' : 'output'] as const
      for (const resource of resources) this.kernel.observe({kind:'unattributed',resource,reason:'unmatched audio lifecycle'})
      return
    }
    if (event.kind.startsWith('capture') && work.action !== 'record' || !event.kind.startsWith('capture') && event.kind !== 'audio-issue' && work.action !== 'say' && work.action !== 'replay') {
      this.kernel.observe({kind:'unattributed',resource:event.kind.startsWith('capture')?'microphone':'output',reason:'mismatched audio action'})
      return
    }
    if (event.kind === 'capture-start') this.kernel.observe({kind:'start',identity:work.identity})
    else if (event.kind === 'capture-ended') this.end(work)
    else if (event.kind === 'audio-issue') { work.poisoned=true; this.uncertain(work,event.reason ?? 'observer interruption') }
    else if (event.kind === 'source-scheduled') {
      const finished = work.finished
      if (finished && event.sourceId && !work.sources.has(event.sourceId)) {
        this.kernel.observe({kind:'unattributed',resource:'output',reason:'new source after producer tombstone'})
        return
      }

      if (!event.sourceId || work.sources.has(event.sourceId) || work.producer) { work.poisoned=true; this.uncertain(work,'unexpected/duplicate source'); return }
      work.sources.set(event.sourceId,{started:false,ended:false})
    } else if (event.kind === 'playback-running' || event.kind === 'playback-ended') {
      const source = event.sourceId ? work.sources.get(event.sourceId) : undefined
      if (!source) { work.poisoned=true; this.uncertain(work,'unmatched source'); return }
      if (event.kind === 'playback-running') {
        if (!source.ended) { source.started=true; this.kernel.observe({kind:'start',identity:work.identity}) }
      } else {
        if (source.ended) return
        source.ended=true
        if (!source.started || !event.natural || !event.clockAdvanced || event.interrupted) { work.poisoned=true; this.uncertain(work,'incomplete/interrupted playback') }
        this.settle(work)
      }
    }
  }

  timeout(identity: Identity): void {
    const work=this.works.get(token(identity))
    if(work) this.uncertain(work,'30 second diagnostic timeout; not a stop')
  }

  private uncertain(work:Work,reason:string):void { this.kernel.observe({kind:'uncertain',identity:work.identity,reason}) }
  private end(work:Work):void {
    work.finished = true
    this.kernel.observe({kind:'end',identity:work.identity})
    if(this.bound.get(work.action)===work) this.bound.delete(work.action)
  }
  private terminal(work:Work,success:boolean):void {
    if(!success) { work.poisoned=true; this.uncertain(work,'producer failed; result does not release'); return }
    if(work.action==='say'||work.action==='replay') {
      work.producer=true
      if(!work.sources.size) this.uncertain(work,'producer finished without source evidence')
      this.settle(work)
    }
    if ((work.action === 'record' || work.action === 'head.nod') && !work.finished) {
      this.uncertain(work,'producer result without reliable lifecycle end')
    }
    // A later reliable correlated end can resolve this uncertainty.
  }
  private settle(work:Work):void {
    if(work.producer && !work.poisoned && work.sources.size && [...work.sources.values()].every(s=>s.started&&s.ended)) this.end(work)
  }
}
