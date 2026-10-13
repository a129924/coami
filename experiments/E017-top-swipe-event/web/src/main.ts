import { SimulatorEngine } from '../generated/pinned-stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { TopSwipeInput } from './input.ts'
import './style.css'

const element = <T extends HTMLElement>(id: string): T => {
  const result = document.getElementById(id)
  if (!result) throw new Error(`missing element ${id}`)
  return result as T
}
const surface = element<HTMLDivElement>('touch')
const restart = element<HTMLButtonElement>('restart')
let epoch = 0
let engine: SimulatorEngine | undefined
let input: TopSwipeInput | undefined
let started = false
let traceBuffer = ''
let count = 0
let lastDirection = '—'
let lastOperation = '—'
let loadedRuntimeSha: string | undefined
let expectedModSha = ''
let provenance: unknown
let records: Record<string, unknown>[] = []
let dropped = 0
let timeout: ReturnType<typeof setTimeout> | undefined
let startupAbort: AbortController | undefined

function render(): void {
  if (!input) return
  element('state').textContent = input.state === 'ready' && !started ? 'initializing' : input.state
  element('reason').textContent = input.reason || (input.state === 'ready' && started ? '已就緒；左→右 forwardSwipe，右→左 backwardSwipe' : '等待 MOD / zero acknowledgement；清理完成前不接納下一次操作')
  element('count').textContent = String(count)
  element('direction').textContent = lastDirection
  element('operation').textContent = lastOperation
  surface.dataset.disabled = String(input.state !== 'ready' && input.state !== 'active' || !started)
  surface.dataset.active = String(input.state === 'active')
  const terminal = input.state === 'error' || input.state === 'unavailable'
  if ((terminal || input.state === 'ready' && started) && timeout) { clearTimeout(timeout); timeout = undefined }
  if (terminal) restart.disabled = false
}
function record(value: Record<string, unknown>): void {
  records.push(value)
  if (records.length > 10000) { records.shift(); dropped++ }
  const row = document.createElement('li')
  row.textContent = JSON.stringify(value)
  element('events').prepend(row)
  while (element('events').children.length > 45) element('events').lastElementChild?.remove()
}
function ingest(message: string, session: number): void {
  if (session !== epoch || !input) return
  // The pinned WasmView calls onTrace once per firmware print line (without its newline).
  traceBuffer += message.endsWith('\n') ? message : `${message}\n`
  let newline: number
  while ((newline = traceBuffer.indexOf('\n')) >= 0) {
    const line = traceBuffer.slice(0,newline).trim()
    traceBuffer = traceBuffer.slice(newline+1)
    if (line.includes('[TouchPanel] sample error')) input.fail(line)
    if (!line.startsWith('COAMI17|')) continue
    try {
      const parsed: unknown = JSON.parse(line.slice(8))
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid MOD trace')
      const value = parsed as Record<string, unknown>
      record({ source: 'MOD', ...value })
      if (value.kind === 'ready') input.modReady()
      if (value.kind === 'unavailable' || value.kind === 'error') input.fail(String(value.reason), value.kind === 'unavailable')
      if (value.kind === 'event') {
        const meta = value.meta as Record<string, unknown> | undefined
        const event = value.event as Record<string, unknown> | undefined
        if (!meta || !event || meta.session !== session || meta.ticks !== event.ticks || typeof value.count !== 'number') throw new Error('MOD event metadata mismatch')
        const swipe = event.gesture === 'forwardSwipe' || event.gesture === 'backwardSwipe'
        if (value.count !== count + (swipe ? 1 : 0)) throw new Error('MOD count mismatch')
        count = value.count
        if (swipe) { lastDirection = String(event.gesture); lastOperation = `${meta.session} / ${meta.operation}` }
      }
    } catch (error) { input.fail(String(error)) }
  }
  if (traceBuffer.length > 32768) { traceBuffer = ''; input.fail('runtime trace line exceeded limit') }
  render()
}
async function verifyRuntime(session: number, signal: AbortSignal): Promise<void> {
  const response = await fetch('/runtime-provenance.json', { cache: 'no-store', signal })
  if (!response.ok) throw new Error('runtime provenance missing; run npm run prepare:poc')
  const value = await response.json() as { sourceCommit?: string; patchSha256?: string; sha256?: Record<string,string>; mod?: { sha256?: string } }
  if (value.sourceCommit !== 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322' || !value.patchSha256 || !value.sha256 || !value.mod?.sha256) throw new Error('runtime provenance invalid')
  for (const file of ['mc.js','mc.wasm']) {
    const asset = await fetch(`/simulator/${file}`, { cache: 'no-store', signal })
    if (!asset.ok) throw new Error(`missing ${file}`)
    const digest = await crypto.subtle.digest('SHA-256', await asset.arrayBuffer())
    const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('')
    if (hex !== value.sha256[file]) throw new Error(`served ${file} hash mismatch`)
  }
  if (session !== epoch) return
  const runtimeKey = `${value.patchSha256}:${value.sha256['mc.js']}:${value.sha256['mc.wasm']}`
  if (loadedRuntimeSha && loadedRuntimeSha !== runtimeKey) throw new Error('runtime changed; reload the whole page before restart')
  loadedRuntimeSha = runtimeKey
  expectedModSha = value.mod.sha256
  provenance = value
  element('provenance').textContent = JSON.stringify(value,null,2)
}
async function start(): Promise<void> {
  const session = ++epoch
  restart.disabled = true
  startupAbort?.abort()
  const controller = new AbortController()
  startupAbort = controller
  if (timeout) clearTimeout(timeout)
  engine?.dispose(); engine = undefined
  started = false; traceBuffer = ''; count = 0; lastDirection = '—'; lastOperation = '—'
  records = []; dropped = 0; provenance = undefined; expectedModSha = ''
  element('provenance').textContent = '尚未核對（本次 Session）'
  element('events').replaceChildren()
  const birth = performance.now()
  input = new TopSwipeInput(session, () => performance.now()-birth, value => {
    if (session !== epoch) return
    record({ source: 'host', ...value })
    queueMicrotask(() => { if (session === epoch) render() })
  })
  timeout = setTimeout(() => {
    if (session !== epoch || input?.state === 'error' || input?.state === 'unavailable' || input?.state === 'ready' && started) return
    input?.fail('initialization exceeded 5 seconds')
    // Release the UI even when fetch/start ignores abort and never settles.
    epoch++
    controller.abort()
    engine?.dispose(); engine = undefined
    started = false; timeout = undefined; restart.disabled = false
    render()
  },5000)
  render()
  try {
    await verifyRuntime(session, controller.signal)
    if (session !== epoch) return
    const response = await fetch('/coami-mod.xsa', { cache: 'no-store', signal: controller.signal })
    if (!response.ok) throw new Error('MOD archive missing')
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (session !== epoch) return
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    if (session !== epoch) return
    const modSha = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('')
    if (modSha !== expectedModSha) throw new Error('served MOD hash mismatch')
    const mod = { name: 'coami-mod.xsa', bytes, size: bytes.length, storage: 'memory' as const }
    const created = new SimulatorEngine({
      viewport: element<HTMLCanvasElement>('viewport'), screen: element<HTMLCanvasElement>('screen'),
      topTouchBridge: input, runtimeBaseUrl: new URL('/simulator/',location.href).href,
      modStorage: { async loadInstalledMod() { return mod }, async saveInstalledMod() { return mod }, async clearInstalledMod() {} },
      onTrace: (message: string) => ingest(message,session),
      onError: (error: unknown) => { if (session === epoch) { input?.fail(String(error)); render() } },
    })
    engine = created
    await created.start()
    if (session !== epoch) { created.dispose(); return }
    started = true
  } catch (error) {
    if (session === epoch) {
      if (timeout) clearTimeout(timeout)
      timeout = undefined
      input?.fail(String(error))
    }
  }
  finally { if (session === epoch) { restart.disabled = false; render() } }
}
function position(event: PointerEvent): number {
  const bounds = surface.getBoundingClientRect()
  return ((event.clientX-bounds.left)/bounds.width)*200-100
}
function inside(event: PointerEvent): boolean {
  const b = surface.getBoundingClientRect()
  return event.clientX >= b.left && event.clientX <= b.right && event.clientY >= b.top && event.clientY <= b.bottom
}
surface.addEventListener('pointerdown',event => {
  if (!started || !event.isPrimary || event.button !== 0 || !input?.begin(event.pointerId,position(event))) return
  event.preventDefault()
  try { surface.setPointerCapture(event.pointerId) } catch { input.cancel(event.pointerId) }
  render()
})
surface.addEventListener('pointermove',event => {
  if (!inside(event)) { record({source:'pointer',kind:'cancel',reason:'outside',pointerId:event.pointerId,x:event.clientX,y:event.clientY}); input?.cancel(event.pointerId) }
  else input?.move(event.pointerId,position(event))
  render()
})
surface.addEventListener('pointerup',event => {
  if (inside(event)) { input?.move(event.pointerId,position(event)); input?.end(event.pointerId) }
  else input?.cancel(event.pointerId)
  if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId)
  render()
})
surface.addEventListener('pointercancel',event => {
  record({source:'pointer',kind:'cancel',reason:'pointercancel',pointerId:event.pointerId,state:input?.state})
  input?.cancel(event.pointerId); render()
})
surface.addEventListener('lostpointercapture',event => {
  const stillCaptured = surface.hasPointerCapture(event.pointerId)
  record({source:'pointer',kind:'capture-loss',pointerId:event.pointerId,state:input?.state,
    target:(event.target as Element).tagName,stillCaptured})
  // Ignore a bubbled descendant or obsolete loss when this surface owns capture.
  if (event.target === surface && !stillCaptured) input?.cancel(event.pointerId)
  render()
})
surface.addEventListener('pointerleave',event => { if (!inside(event)) { record({source:'pointer',kind:'cancel',reason:'outside',pointerId:event.pointerId,x:event.clientX,y:event.clientY}); input?.cancel(event.pointerId) }; render() })
window.addEventListener('blur',() => { record({source:'pointer',kind:'cancel',reason:'blur',state:input?.state}); input?.cancel(); render() })
document.addEventListener('visibilitychange',() => { if (document.hidden) { input?.cancel(); render() } })
window.addEventListener('pagehide',() => {
  input?.cancel()
  epoch++
  startupAbort?.abort()
  if (timeout) clearTimeout(timeout)
  timeout = undefined
  engine?.dispose(); engine = undefined
  started = false
  render()
})
window.addEventListener('pageshow',event => { if (event.persisted) void start() })
restart.addEventListener('click',() => { void start() })
element('export').addEventListener('click',() => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ experiment:'E017', capturedAt:new Date().toISOString(), provenance,
    evidenceKind:'operator must identify human versus automated input', dropped, records },null,2)],{type:'application/json'}))
  const link = document.createElement('a'); link.href = url; link.download = 'e017-swipe-trace.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url),1000)
})
void start()
