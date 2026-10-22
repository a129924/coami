import test from 'node:test'
import assert from 'node:assert/strict'
import { Adapter, type Host } from './adapter.ts'
import type { Action, Identity } from './state.ts'
function setup() {
 const calls:Action[]=[]
 const host:Host={button(action){calls.push(action)},async replay(){calls.push('replay');
  return true}}
 const adapter=new Adapter('epoch',host)
 return {adapter,calls}
}
function request(adapter:Adapter,action:Action):Identity {
 const result=adapter.request(action)
 assert.equal(result.accepted,true)
 if(!result.accepted)throw Error('rejected')
 return result.identity
}
test('accepted dispatch once, denied dispatch zero, no-buffer replay preflight',()=>{
 const {adapter,calls}=setup()
 assert.equal(adapter.request('replay').accepted,false)
 request(adapter,'record')
 assert.deepEqual(calls,['record'])
 assert.equal(adapter.request('say').accepted,false)
 assert.deepEqual(calls,['record'])
})
test('called ack binds identity; duplicate/stale ack cannot bind latest pending command',()=>{
 const {adapter}=setup();
  const id=request(adapter,'record')
 assert.equal(adapter.tokenFor('record'),null)
 adapter.mod({kind:'called',op:'record',seq:1})
 assert.deepEqual(adapter.tokenFor('record'),id)
 adapter.audio({kind:'capture-start',token:id})
 adapter.audio({kind:'capture-stop',token:id})
 assert.equal(adapter.kernel.snapshot().activities.recording,'active')
 adapter.audio({kind:'capture-ended',token:id})
 request(adapter,'record')
 adapter.mod({kind:'called',op:'record',seq:1})
 assert.equal(adapter.tokenFor('record'),null)
 adapter.mod({kind:'called',op:'record',seq:2})
 assert.notDeepEqual(adapter.tokenFor('record'),id)
})
test('output requires producer success plus every scheduled source natural end and advancing start',()=>{
 const {adapter}=setup();
  const id=request(adapter,'say')
 adapter.mod({kind:'called',op:'say',seq:1})
 adapter.audio({kind:'source-scheduled',token:id,sourceId:'a'})
 adapter.audio({kind:'source-scheduled',token:id,sourceId:'b'})
 adapter.audio({kind:'playback-running',token:id,sourceId:'a'})
 adapter.audio({kind:'playback-ended',token:id,sourceId:'a',natural:true,clockAdvanced:true,interrupted:false})
 adapter.mod({kind:'terminal',op:'say',seq:1,success:true})
 assert.notEqual(adapter.kernel.snapshot().activities.output,'inactive')
 adapter.audio({kind:'playback-running',token:id,sourceId:'b'})
 adapter.audio({kind:'playback-ended',token:id,sourceId:'b',natural:true,clockAdvanced:true,interrupted:false})
 assert.equal(adapter.kernel.snapshot().activities.output,'inactive')
})
for(const reason of ['absent','interrupted','failed','unmatched'] as const)test(`output ${reason} stays unknown and does not release`,()=>{
 const {adapter}=setup();
  const id=request(adapter,'say');
  adapter.mod({kind:'called',op:'say',seq:1})
 if(reason!=='absent'){
 adapter.audio({kind:'source-scheduled',token:id,sourceId:'a'})
 adapter.audio({kind:'playback-ended',token:id,sourceId:reason==='unmatched'?'wrong':'a',natural:reason!=='interrupted',clockAdvanced:true,interrupted:reason==='interrupted'})
 }
 adapter.mod({kind:'terminal',op:'say',seq:1,success:reason!=='failed'})
 assert.equal(adapter.kernel.snapshot().activities.output,'unknown')
 assert.equal(adapter.request('record').accepted,false)
})
test('sequence-end frees head but pose/motor unknown; timeout/failure do not',()=>{
 const {adapter}=setup();
  const id=request(adapter,'head.nod')
 adapter.mod({kind:'called',op:'head.nod',seq:1});
  adapter.mod({kind:'sequence-start',op:'head.nod',seq:1})
 assert.equal(adapter.kernel.snapshot().activities.head,'active')
 adapter.timeout(id);
  adapter.mod({kind:'terminal',op:'head.nod',seq:1,success:false})
 assert.equal(adapter.kernel.snapshot().activities.head,'unknown')
 adapter.mod({kind:'sequence-end',op:'head.nod',seq:1})
 assert.equal(adapter.kernel.snapshot().activities.head,'inactive')
 assert.equal(adapter.kernel.snapshot().pose,'unknown')
})

test('new source on completed token reserves unknown occupancy without clearing newer work', () => {
  const { adapter } = setup()
  const id = request(adapter, 'say')
  adapter.mod({ kind: 'called', op: 'say', seq: 1 })
  adapter.audio({ kind: 'source-scheduled', token: id, sourceId: 'first' })
  adapter.audio({ kind: 'playback-running', token: id, sourceId: 'first' })
  adapter.audio({ kind: 'playback-ended', token: id, sourceId: 'first', natural: true, clockAdvanced: true, interrupted: false })
  adapter.mod({ kind: 'terminal', op: 'say', seq: 1, success: true })
  const next = request(adapter, 'record')
  adapter.audio({ kind: 'source-scheduled', token: id, sourceId: 'unexpected-new-source' })
  assert.ok(adapter.kernel.snapshot().unknownOccupancy.includes('output'))
  assert.equal(adapter.kernel.snapshot().operations.find(o => o.identity.operationId === next.operationId)?.state, 'requested')
  assert.equal(adapter.request('say').accepted, false)
})

test('capture-ended precedes bytes; current buffer survives end while older bytes cannot replace new recording', () => {
  const { adapter } = setup()
  const id = request(adapter, 'record')
  adapter.mod({ kind: 'called', op: 'record', seq: 1 })
  adapter.audio({ kind: 'capture-ended', token: id })
  adapter.captured(id, new ArrayBuffer(8))
  assert.equal(adapter.request('replay').accepted, true)
})

test('previous record bytes cannot supply replay after newer recording begins', () => {
  const { adapter } = setup()
  const id = request(adapter, 'record')
  adapter.mod({ kind: 'called', op: 'record', seq: 1 })
  adapter.audio({ kind: 'capture-ended', token: id })
  const next = request(adapter, 'record')
  adapter.mod({ kind: 'called', op: 'record', seq: 2 })
  adapter.captured(id, new ArrayBuffer(8))
  adapter.audio({ kind: 'capture-ended', token: next })
  assert.equal(adapter.request('replay').accepted, false)
})

test('adopted MOD executes full head body including neutral and resource declaration', async () => {
  const { readFile } = await import('node:fs/promises')
  const { stripTypeScriptTypes } = await import('node:module')
  const source = await readFile(new URL('../../mod/mod.ts', import.meta.url), 'utf8')
  const js = stripTypeScriptTypes(source.replace("import Timer from 'timer'", 'const Timer = { set(callback) { queueMicrotask(callback) } }'))
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`) as { headNod(robot: unknown): Promise<void> }
  const effects: unknown[] = []
  await mod.headNod({
    motion: { async setPose(pose: unknown, duration: number) { effects.push(['pose', pose, duration]) } },
    face: { setEmotion(value: number) { effects.push(['emotion', value]) },
      setEyeOpen(key: string, value: number) { effects.push(['eye', key, value]) },
      setMouthOpen(value: number) { effects.push(['mouth', value]) } },
  })
  assert.deepEqual(effects, [
    ['pose', { rotation: { y: 0, p: 0.28, r: 0 }, position: { x: 0, y: 0, z: 0 } }, 0.35],
    ['emotion', 0], ['eye', 'left', 1], ['eye', 'right', 1], ['mouth', 0],
    ['pose', { rotation: { y: 0, p: 0, r: 0 }, position: { x: 0, y: 0, z: 0 } }, 0.25],
  ])
  const { RESOURCES } = await import('./state.ts')
  assert.deepEqual(RESOURCES['head.nod'], ['head', 'appearance'])
})

test('stock observer keeps per-call identity across out-of-order async decoding', async () => {
  const { ObservedAudio } = await import('./observed-audio.ts')
  const events: import('./adapter.ts').AudioEvent[] = []
  const decodes: ((value: { duration: number }) => void)[] = []
  class FakeSource extends EventTarget {
    buffer: { duration: number } | null = null
    loop = false
    onended: (() => void) | null = null
    connect(): void {}
    start(): void { queueMicrotask(() => { this.dispatchEvent(new Event('ended'));
   this.onended?.() }) }
    stop(): void {}
  }
  const context = {
    state: 'running', currentTime: 0, destination: {}, addEventListener() {},
    decodeAudioData() { return new Promise<{ duration: number }>(resolve => decodes.push(resolve)) },
    createBufferSource() { return new FakeSource() }, async resume() {}, async close() {},
  } as unknown as AudioContext
  let current: Identity = { sessionEpoch: 'e', operationId: 'first' }
  const audio = new ObservedAudio(() => current, event => events.push(event), () => {}, {
    context, recorder: class {} as unknown as typeof MediaRecorder, mediaDevices: {} as MediaDevices,
  })
  const first = audio.output.play(new ArrayBuffer(4))
  current = { sessionEpoch: 'e', operationId: 'second' }
  const second = audio.output.play(new ArrayBuffer(4))
  assert.equal(decodes.length, 2)
  decodes[1]!({ duration: 0.001 })
  await second
  decodes[0]!({ duration: 0.001 })
  await first
  assert.deepEqual(events.filter(e => e.kind === 'source-scheduled').map(e => e.token?.operationId), ['second', 'first'])
  assert.equal(events.some(e => e.kind === 'playback-running'), false, 'start call with frozen clock is not active evidence')
  audio.dispose()
})

test('stock input observer freezes identity before deferred getUserMedia and ends before bytes', async () => {
  const { ObservedAudio } = await import('./observed-audio.ts')
  const events: import('./adapter.ts').AudioEvent[] = []
  const order: string[] = []
  let release: ((stream: MediaStream) => void) | undefined
  const stream = { getTracks: () => [] } as unknown as MediaStream
  class Recorder extends EventTarget {
    static isTypeSupported(): boolean { return true }
    state = 'inactive'
    onstop: (() => void) | null = null
    ondataavailable: ((event: { data: Blob }) => void) | null = null
    start(): void {
      this.state = 'recording'
      this.dispatchEvent(new Event('start'))
      this.ondataavailable?.({ data: new Blob([new Uint8Array([0x1a,0x45,0xdf,0xa3,0,0,0,0])]) })
    }
    stop(): void { this.state = 'inactive';
   this.dispatchEvent(new Event('stop'));
   this.onstop?.() }
  }
  const context = { state:'running', addEventListener() {}, async close() {} } as unknown as AudioContext
  let current: Identity = { sessionEpoch:'e', operationId:'original' }
  const audio = new ObservedAudio(() => current, event => { events.push(event);
   order.push(event.kind) }, (id) => {
    assert.equal(id?.operationId, 'original');
   order.push('buffer')
  }, { context, recorder:Recorder as unknown as typeof MediaRecorder,
    mediaDevices:{ getUserMedia: () => new Promise<MediaStream>(resolve => { release=resolve }) } as MediaDevices })
  const promise = audio.input.record(0)
  current = { sessionEpoch:'e', operationId:'newer' }
  assert.ok(release)
  release(stream)
  await promise
  assert.ok(events.every(e => e.token?.operationId === 'original'))
  assert.ok(order.indexOf('capture-ended') < order.indexOf('buffer'))
  audio.dispose()
})

test('out-of-scope tone explicitly rejects rather than resolving a silent noop', async () => {
  const { ObservedAudio } = await import('./observed-audio.ts')
  const events: import('./adapter.ts').AudioEvent[] = []
  const audio = new ObservedAudio(() => null, event => events.push(event), () => {}, {
    context: { addEventListener() {}, state: 'closed' } as unknown as AudioContext,
    recorder: class {} as unknown as typeof MediaRecorder, mediaDevices: {} as MediaDevices,
  })
  await assert.rejects(audio.output.tone(), /unsupported/)
  assert.equal(events[0]?.kind, 'audio-issue')
})

test('late new source remains unknown after bounded finished display rows were evicted', () => {
  const { adapter } = setup()
  const id = request(adapter, 'say')
  adapter.mod({ kind: 'called', op: 'say', seq: 1 })
  adapter.audio({ kind: 'source-scheduled', token: id, sourceId: 'first' })
  adapter.audio({ kind: 'playback-running', token: id, sourceId: 'first' })
  adapter.audio({ kind: 'playback-ended', token: id, sourceId: 'first', natural: true, clockAdvanced: true, interrupted: false })
  adapter.mod({ kind: 'terminal', op: 'say', seq: 1, success: true })
  for (let index = 0; index < 129; index++) {
    const later = request(adapter, 'record')
    adapter.mod({ kind: 'called', op: 'record', seq: index + 2 })
    adapter.audio({ kind: 'capture-ended', token: later })
  }
  assert.equal(adapter.kernel.snapshot().operations.length, 128)
  adapter.audio({ kind: 'source-scheduled', token: id, sourceId: 'late-after-eviction' })
  assert.ok(adapter.kernel.snapshot().unknownOccupancy.includes('output'))
})

test('unattributed microphone issues retain recording unknown, generic issues retain both', () => {
  const { adapter } = setup()
  adapter.audio({ kind: 'audio-issue', token: null, resource: 'microphone', reason: 'unmatched recorder' })
  assert.equal(adapter.kernel.snapshot().activities.recording, 'unknown')
  assert.equal(adapter.kernel.snapshot().activities.output, 'inactive')
  const { adapter: generic } = setup()
  generic.audio({ kind: 'audio-issue', token: null, reason: 'ambiguous' })
  assert.equal(generic.kernel.snapshot().activities.recording, 'unknown')
  assert.equal(generic.kernel.snapshot().activities.output, 'unknown')
})

test('successful record/head producer without reliable lifecycle end immediately becomes unknown', () => {
  for (const action of ['record', 'head.nod'] as const) {
    const { adapter } = setup()
    const id = request(adapter, action)
    adapter.mod({ kind: 'called', op: action, seq: 1 })
    adapter.mod({ kind: 'terminal', op: action, seq: 1, success: true })
    assert.equal(adapter.kernel.snapshot().activities[action === 'record' ? 'recording' : 'head'], 'unknown')
    if (action === 'record') adapter.audio({ kind: 'capture-ended', token: id })
    else adapter.mod({ kind: 'sequence-end', op: action, seq: 1 })
    assert.equal(adapter.kernel.snapshot().activities[action === 'record' ? 'recording' : 'head'], 'inactive')
  }
})
