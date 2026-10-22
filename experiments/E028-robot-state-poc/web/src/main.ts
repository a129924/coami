import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { Adapter, type ModEvent } from './adapter.ts'
import { ObservedAudio } from './observed-audio.ts'
import type { Action, Identity } from './state.ts'
import './style.css'

type Engine = { start(): Promise<void>; pushButton(name: 'a' | 'b' | 'c'): void; dispose(): void; audioInBridge: unknown; audioOutBridge: unknown; hostBridge: { AudioIn: unknown; AudioOut: unknown } }
const element = (id: string): HTMLElement => {
  const value = document.getElementById(id)
  if (!value) throw Error(`Missing ${id}`)
  return value
}
const button = (id: string): HTMLButtonElement => element(id) as HTMLButtonElement
const epoch = crypto.randomUUID(), events: Record<string, unknown>[] = []
let droppedEvents = 0
let ready = false, engine: Engine | null = null, audio: ObservedAudio | null = null
const timers = new Set<ReturnType<typeof setTimeout>>()
const adapter = new Adapter(epoch, {
  button(action) {
    if (!engine) throw Error('Engine unavailable')
    engine.pushButton(action === 'record' ? 'a' : action === 'say' ? 'c' : 'b')
  },
  async replay(buffer, identity) {
    if (!audio) throw Error('Audio unavailable')
    log({ kind: 'host-replay', identity, bytes: buffer.byteLength })
    const success = await audio.play(buffer, identity)
    // Adapter settles producer after this return, render in following task.
    setTimeout(render, 0)
    return success
  },
})
function log(record: Record<string, unknown>): void {
  if (events.length >= 2000) { events.shift(); droppedEvents++ }
  events.push(structuredClone({ epoch, utc: new Date().toISOString(), at: performance.now(), droppedEvents, ...record }))
  element('trace').textContent = events.slice(-30).map(e => JSON.stringify(e)).join('\n')
}
function render(): void {
  element('state').textContent = JSON.stringify(adapter.kernel.snapshot(), null, 2)
  for (const action of ['record', 'replay', 'say', 'head.nod']) button(action).disabled = !ready
}
function trace(message: string): void {
  for (const line of message.split('\n')) {
    if (!line.startsWith('COAMI28|')) continue
    try {
      const event = JSON.parse(line.slice(8)) as Record<string, unknown>
      log({ kind: 'mod-trace', event })
      if (event.kind === 'ready') { ready = true; element('status').textContent = '就緒；初始 inactive 僅限本 managed session。' }
      else if (['called', 'sequence-start', 'sequence-end', 'terminal'].includes(String(event.kind)) &&
        ['record', 'say', 'head.nod'].includes(String(event.op)) && Number.isSafeInteger(event.seq)) {
        adapter.mod(event as unknown as ModEvent)
      } else throw Error('Unrecognized MOD lifecycle')
      log({ kind: 'snapshot', state: adapter.kernel.snapshot() })
      render()
    } catch (error) { issue(String(error)) }
  }
}
function issue(reason: string): void {
  for (const operation of adapter.kernel.snapshot().operations) {
    if (operation.state !== 'inactive') adapter.timeout(operation.identity)
  }
  element('status').textContent = `證據健康問題：${reason}；不代表停止。`
  log({ kind: 'issue', reason })
  render()
}
async function verifyRuntime(): Promise<Uint8Array> {
  const response = await fetch('/runtime-provenance.json', { cache: 'no-store' })
  if (!response.ok) throw Error('先執行 npm run prepare:poc')
  const provenance = await response.json() as { experiment: string; sourceCommit: string; sha256: Record<string, string>; mod: { sha256: string } }
  if (provenance.experiment !== 'E028' || provenance.sourceCommit !== 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322' || !provenance.mod?.sha256) throw Error('Provenance mismatch')
  let mod: Uint8Array | null = null
  for (const [path, expected] of [...Object.entries(provenance.sha256), ['coami-mod.xsa', provenance.mod.sha256]]) {
    const asset = await fetch(`/${path}`, { cache: 'no-store' })
    if (!asset.ok) throw Error(`Missing ${path}`)
    const bytes = await asset.arrayBuffer()
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('')
    if (hash !== expected) throw Error(`Served bytes mismatch ${path}`)
    log({ kind: 'served-asset', path, sha256: hash, bytes: bytes.byteLength })
    if (path === 'coami-mod.xsa') mod = new Uint8Array(bytes)
  }
  if (!mod) throw Error('No MOD')
  return mod
}
button('start').onclick = async () => {
  button('start').disabled = true
  try {
    audio = new ObservedAudio(kind => kind === 'record' ? adapter.tokenFor('record') : adapter.tokenFor('say'), event => {
      adapter.audio(event)
      log({ kind: 'audio-observation', event, state: adapter.kernel.snapshot() })
      render()
    }, (identity, buffer) => adapter.captured(identity, buffer))
    await audio.unlock()
    const bytes = await verifyRuntime(), mod = { name: 'coami-mod.xsa', bytes, size: bytes.length, storage: 'memory' as const }
    engine = new SimulatorEngine({ viewport: element('viewport') as HTMLCanvasElement, screen: element('screen') as HTMLCanvasElement,
      runtimeBaseUrl: new URL('/simulator/', location.href).href,
      modStorage: { async loadInstalledMod() { return mod }, async clearInstalledMod() {}, async saveInstalledMod(next: typeof mod) { return next } },
      onTrace: trace, onError: (error: unknown) => issue(String(error)), onReady: () => log({ kind: 'engine-ready' }),
    }) as unknown as Engine
    engine.audioInBridge = audio.input
    engine.audioOutBridge = audio.output
    engine.hostBridge.AudioIn = audio.input
    engine.hostBridge.AudioOut = audio.output
    await engine.start()
  } catch (error) { issue(String(error)) }
}
for (const action of ['record', 'replay', 'say', 'head.nod'] as const) button(action).onclick = () => {
  const result = adapter.request(action)
  log({ kind: 'admission', action, result, state: adapter.kernel.snapshot() })
  element('status').textContent = result.accepted ? `${action} 已接受；開始須另有證據。` : `${action} 拒絕：${result.reason}`
  if (result.accepted) diagnosticTimeout(result.identity)
  render()
}
function diagnosticTimeout(identity: Identity): void {
  const timer = setTimeout(() => {
    timers.delete(timer)
    adapter.timeout(identity)
    log({ kind: 'diagnostic-timeout', identity, state: adapter.kernel.snapshot() })
    render()
  }, 30_000)
  timers.add(timer)
}
button('download').onclick = () => {
  const blob = new Blob([events.map(e => JSON.stringify(e)).join('\n') + '\n'], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = `e028-${epoch}-metadata.jsonl`; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
window.addEventListener('beforeunload', () => { for (const timer of timers) clearTimeout(timer); engine?.dispose(); audio?.dispose() })
log({ kind: 'session-created', scope: 'managed-session', caveat: 'Reload does not prove earlier physical work stopped' })
render()
