import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { ScopeAudio } from './audio-adapter.ts'
import { ScopeController, sameToken, type Token, type Operation } from './scope-controller.ts'
import { runOpening } from './opening.ts'

type Pose = { y: number; p: number; r: number }
type Engine = { start(): Promise<void>; dispose(): void; pushButton(name: string): void; audioOutBridge: unknown; hostBridge: { AudioOut: unknown }; scene: { driverRotation: Pose; render(t: number): void } }
type Job = { token: Token; op: 'say' | 'greet'; seq?: number; promise: Promise<void>; resolve(): void }
type Frame = { kind: string; token?: Token; operation?: Operation; okay?: boolean; detail?: string; id?: string }
const el = <T extends HTMLElement>(id: string): T => { const v = document.getElementById(id); if (!v) throw Error(`Missing ${id}`); return v as T }
const records: Record<string, unknown>[] = [], jobs: Job[] = []
const runEpoch = crypto.randomUUID()
const bToken: Token = Object.freeze({ runEpoch, robotId: 'B', scopeId: 'background' })
let scopeSerial = 0, current: Token | null = null, engine: Engine | null = null, audio: ScopeAudio | null = null
let socket: WebSocket | null = null, robotB: WebSocket | null = null, ready = false
let readyMod: (() => void) | null = null, motionActive = false, cancelling = false
let stableSince: number | null = null, stableDone: number | null = null, motionStopResolve: (() => void) | null = null
let audioStopped = false, motionStopped = false, stopMark: ((at: number) => void) | null = null
let caseId = crypto.randomUUID(), lastSave = 0
type Boot = { token: Token; engine: Engine | null; audio: ScopeAudio | null; active: boolean; done: Promise<void>; complete(): void }
let boot: Boot | null = null
const waiters: { test: (v: Frame) => boolean; resolve(v: Frame): void; reject(e: Error): void; timer: ReturnType<typeof setTimeout> }[] = []
function log(row: Record<string, unknown>): void {
  records.push({ at: performance.now(), utc: new Date().toISOString(), ...row })
  el('trace').textContent = records.slice(-12).map(r => JSON.stringify(r)).join('\n')
  render()
}
function render(): void {
  for (const id of ['say', 'greet', 'both']) el<HTMLButtonElement>(id).disabled = !ready || controller.state !== 'active'
  el<HTMLButtonElement>('cancel').disabled = !['active', 'opening', 'cancelling'].includes(controller.state)
  el<HTMLButtonElement>('new').disabled = controller.state !== 'restartable'
  el<HTMLButtonElement>('ping').disabled = socket?.readyState !== WebSocket.OPEN
  el('status').textContent = `${controller.state} · ${current?.scopeId ?? '尚無 Scope'} · 本輪整體結果仍需真人確認`
}
function send(value: object): void { if (socket?.readyState !== WebSocket.OPEN) throw Error('Control channel unavailable'); socket.send(JSON.stringify(value)) }
function waitFrame(test: (v: Frame) => boolean): Promise<Frame> {
  return new Promise((resolve, reject) => {
    const item = { test, resolve, reject, timer: setTimeout(() => { const i = waiters.indexOf(item); if (i >= 0) waiters.splice(i, 1); reject(Error('Control ACK timeout')) }, 5000) }; waiters.push(item)
  })
}
function message(event: MessageEvent<string>): void {
  const frame = JSON.parse(event.data) as Frame; log({ kind: 'server-frame', frame })
  if (frame.kind === 'server-cleaned' && frame.operation && typeof frame.okay === 'boolean') controller.serverAck(frame.operation, frame.okay)
  if (frame.kind === 'server-failure') controller.disconnect()
  if (frame.kind === 'result' && frame.token) controller.apply(frame.token, () => log({ kind: 'accepted-result', token: frame.token }))
  for (const item of [...waiters]) if (item.test(frame)) { clearTimeout(item.timer); waiters.splice(waiters.indexOf(item), 1); item.resolve(frame) }
}
async function connect(id: 'A' | 'B'): Promise<WebSocket> {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/${id}`)
  await new Promise<void>((resolve, reject) => { ws.onopen = () => resolve(); ws.onerror = () => reject(Error(`Robot ${id} connect failed`)) })
  if (id === 'A') { ws.onmessage = message; ws.onclose = () => { controller.disconnect(); render() } }
  else ws.onmessage = event => log({ kind: 'robot-b-frame', frame: JSON.parse(String(event.data)) as unknown })
  return ws
}
function checkStopped(): void { if (audioStopped && motionStopped) stopMark?.(performance.now()) }
function observePose(token: Token): void {
  if (!engine || !current || !sameToken(token, current)) return
  const pose = { ...engine.scene.driverRotation }, now = performance.now()
  logPose({ kind: 'rendered-pose', at: now, token, pose })
  if (!cancelling || !motionActive) return
  const neutral = Object.values(pose).every(value => Math.abs(value) <= 0.02)
  if (!neutral) {
    if (stableDone !== null) controller.disconnect()
    stableSince = null; return
  }
  stableSince ??= now
  if (stableDone === null && now - stableSince >= 300) {
    stableDone = now; motionStopped = true; log({ kind: 'motion-stable-300ms', token }); checkStopped()
  }
  if (stableDone !== null && now - stableDone >= 2000 && motionStopResolve) { motionStopResolve(); motionStopResolve = null; log({ kind: 'motion-tail-complete', token }) }
}
let lastPoseAt = 0
function logPose(row: Record<string, unknown> & { at: number }): void { if (row.at - lastPoseAt >= 20) { records.push(row); lastPoseAt = row.at } }
const controller = new ScopeController({ runEpoch, robotId: 'A', now: () => performance.now(),
  later: (run, ms) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer) },
  record: row => log({ ...row }), notify: operation => send({ kind: 'cancel', operation }),
  stop: async (token, mark) => {
    const opening = boot
    if (opening && sameToken(opening.token, token) && !opening.active) {
      mark(performance.now())
      opening.engine?.pushButton('c')
      await Promise.all([opening.audio?.cancel(() => {}), opening.done])
      log({ kind: 'opening-drained', token })
      return
    }
    cancelling = true; stableSince = null; stableDone = null; stopMark = mark
    audioStopped = false; motionStopped = !motionActive
    const localAudio = audio
    if (!localAudio || !engine) throw Error('Local resources unavailable')
    const pending = jobs.filter(j => sameToken(j.token, token)).map(j => j.promise)
    const motion = motionActive ? new Promise<void>(resolve => { motionStopResolve = resolve }) : Promise.resolve()
    engine.pushButton('c')
    const close = localAudio.cancel(() => { audioStopped = true; checkStopped() })
    await Promise.all([close, motion, ...pending])
    log({ kind: 'sdk-work-drained', token })
  },
})
function trace(token: Token, text: string): void {
  for (const line of text.split('\n')) {
    if (!line.startsWith('COAMI26|')) continue
    const row = JSON.parse(line.slice(8)) as { kind: string; op?: 'say' | 'greet'; seq?: number; success?: boolean }
    log({ kind: 'mod-trace', token, record: row })
    if (row.kind === 'ready') { readyMod?.(); readyMod = null }
    if (row.kind === 'started') { const job = jobs.find(j => sameToken(j.token, token) && j.op === row.op && j.seq === undefined); if (job) job.seq = row.seq }
    if (row.kind === 'settled' || row.kind === 'discarded') {
      const job = jobs.find(j => sameToken(j.token, token) && (row.kind === 'discarded' ? j.op === row.op && j.seq === undefined : j.seq === row.seq))
      job?.resolve()
    }
    if (row.kind === 'stop-error') controller.disconnect()
  }
}
function dispatch(op: 'say' | 'greet', token: Token): Promise<void> {
  if (!controller.permits(token) || !engine) return Promise.resolve()
  if (op === 'greet') motionActive = true
  let resolve!: () => void
  const promise = new Promise<void>(r => { resolve = r })
  jobs.push({ token, op, promise, resolve }); engine.pushButton(op === 'say' ? 'a' : 'b')
  log({ kind: 'dispatch', token, op }); return promise
}
async function verifyRuntime(): Promise<Uint8Array> {
  const response = await fetch('/runtime-provenance.json', { cache: 'no-store' })
  if (!response.ok) throw Error('Run npm run prepare:poc first')
  const p = await response.json() as { sourceCommit: string; sha256: Record<string, string>; mod: { sha256: string } }
  if (p.sourceCommit !== 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322' || !p.mod?.sha256) throw Error('Wrong runtime provenance')
  let mod: Uint8Array | null = null
  for (const [url, expected] of [['/simulator/mc.js', p.sha256['mc.js']], ['/simulator/mc.wasm', p.sha256['mc.wasm']], ['/coami-mod.xsa', p.mod.sha256]]) {
    const r = await fetch(url!, { cache: 'no-store' }); if (!r.ok) throw Error(`Missing ${url}`)
    const bytes = await r.arrayBuffer(), digest = await crypto.subtle.digest('SHA-256', bytes)
    const actual = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
    if (actual !== expected) throw Error(`Served-byte mismatch ${url}`)
    log({ kind: 'served-asset', url, sha256: actual, bytes: bytes.byteLength }); if (url === '/coami-mod.xsa') mod = new Uint8Array(bytes)
  }
  if (!mod) throw Error('Missing MOD'); return mod
}
async function newScope(): Promise<void> {
  const token = controller.beginScope(`scope-${++scopeSerial}`); current = token; ready = false; cancelling = false; motionActive = false
  let complete!: () => void
  const own: Boot = { token, engine: null, audio: null, active: false, done: new Promise<void>(resolve => { complete = resolve }), complete: () => complete() }
  boot = own
  const valid = () => controller.state === 'opening' && current !== null && sameToken(current, token)
  let bytes: Uint8Array | null = null
  try {
    const okay = await runOpening([
      async () => { const opened = waitFrame(v => v.kind === 'opened' && !!v.token && sameToken(v.token, token)); send({ kind: 'open', token }); await opened },
      async () => {
        engine?.dispose(); engine = null
        own.audio = new ScopeAudio(token, () => controller.permits(token), row => log({ ...row })); audio = own.audio
        await own.audio.unlock()
      },
      async () => { bytes = await verifyRuntime() },
      async () => {
        if (!bytes || !own.audio) throw Error('Opening resources missing')
        const archive = { name: 'coami-mod.xsa', bytes, size: bytes.length, storage: 'memory' as const }, scopedAudio = own.audio
        const modReady = new Promise<void>(resolve => { readyMod = resolve })
        const next = new SimulatorEngine({ viewport: el<HTMLCanvasElement>('viewport'), screen: el<HTMLCanvasElement>('screen'), runtimeBaseUrl: new URL('/simulator/', location.href).href,
          modStorage: { async loadInstalledMod() { return archive }, async clearInstalledMod() {}, async saveInstalledMod(value: typeof archive) { return value } },
          onTrace: (value: string) => trace(token, value), onError: (error: unknown) => { log({ kind: 'engine-error', reason: String(error) }); controller.disconnect() },
        }) as unknown as Engine
        own.engine = next
        const port = { play: (buffer: ArrayBuffer) => scopedAudio.play(buffer), tone: async () => {}, close: () => { void scopedAudio.cancel(() => {}).catch(error => log({ kind: 'dispose-error', reason: String(error) })) } }
        next.audioOutBridge = port; next.hostBridge.AudioOut = port; engine = next
        const renderScene = next.scene.render.bind(next.scene); next.scene.render = time => { renderScene(time); observePose(token) }
        await next.start()
        if (!valid()) return
        await Promise.race([modReady, new Promise<never>((_, reject) => setTimeout(() => reject(Error('MOD ready timeout')), 15000))])
      },
    ], valid, async () => { if (own.audio) await own.audio.cancel(() => {}); own.engine?.dispose(); log({ kind: 'opening-resources-disposed', token }) })
    if (!okay || !valid()) return
    controller.activate(token); own.active = true; ready = true; log({ kind: 'scope-ready', token })
  } finally { own.complete() }
}
function run(op: 'say' | 'greet', both = false, serverMode: 'blocked' | 'cleanup_hold' = 'blocked'): void {
  if (!current || !controller.permits(current)) return
  caseId = crypto.randomUUID(); const token = current
  log({ kind: 'case-start', caseId, mode: both ? 'both' : op })
  send({ kind: 'work', token, id: `active-${scopeSerial}`, mode: serverMode }); send({ kind: 'work', token, id: `queued-${scopeSerial}`, mode: 'blocked' })
  controller.enqueue(token, () => dispatch(op, token))
  if (both) void dispatch(op === 'say' ? 'greet' : 'say', token)
  else controller.enqueue(token, () => dispatch(op === 'say' ? 'greet' : 'say', token))
}
async function save(): Promise<void> {
  const value = { caseId, runEpoch, scope: current, utc: new Date().toISOString(), state: controller.state, human: { tester: el<HTMLInputElement>('tester').value, equipment: el<HTMLInputElement>('equipment').value, verdict: el<HTMLSelectElement>('human').value, note: el<HTMLInputElement>('note').value }, records: records.slice(lastSave) }
  const response = await fetch('/__e026/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
  if (!response.ok) throw Error('Evidence save failed'); lastSave = records.length; log({ kind: 'evidence-saved', caseId })
}
const guarded = (run: () => Promise<void>) => { void run().catch(error => { log({ kind: 'error', reason: String(error) }); controller.disconnect(); render() }) }
el<HTMLButtonElement>('start').onclick = () => guarded(async () => { el<HTMLButtonElement>('start').disabled = true; socket = await connect('A'); robotB = await connect('B'); robotB.send(JSON.stringify({ kind: 'open', token: bToken })); await newScope() })
el<HTMLButtonElement>('say').onclick = () => run('say')
el<HTMLButtonElement>('greet').onclick = () => run('greet')
el<HTMLButtonElement>('both').onclick = () => run('say', true)
el<HTMLButtonElement>('cancel').onclick = () => { controller.cancel(crypto.randomUUID()); render() }
el<HTMLButtonElement>('new').onclick = () => guarded(newScope)
function ping(): void {
  send({ kind: 'ping' })
  robotB?.send(JSON.stringify({ kind: 'ping' }))
  robotB?.send(JSON.stringify({ kind: 'work', token: bToken, id: `b-${crypto.randomUUID()}`, mode: 'quick' }))
}
el<HTMLButtonElement>('ping').onclick = ping
el<HTMLButtonElement>('save').onclick = () => guarded(save)
// Bounded local harness entry point; it cannot write a human confirmation.
Object.assign(globalThis, { e026: { records, controller, run, cancel: () => controller.cancel(crypto.randomUUID()), newScope, save, ping, get token() { return current }, get workId() { return `active-${scopeSerial}` }, send } })
render()
