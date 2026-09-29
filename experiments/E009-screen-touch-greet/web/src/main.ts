import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import './style.css'

type Event = { kind: string; phase?: string; run_seq?: number; action_id?: string; accepted?: boolean; error_code?: string }
const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const modStatus = document.querySelector<HTMLElement>('#mod-status')!
const touchCount = document.querySelector<HTMLElement>('#touch-count')!
const runStatus = document.querySelector<HTMLElement>('#run-status')!
const restart = document.querySelector<HTMLButtonElement>('#restart')!
const events = document.querySelector<HTMLOListElement>('#events')!
type TouchAwareEngine = SimulatorEngine & {
  scene: { screenPointFromViewportEvent(event: PointerEvent): { x: number; y: number } | null }
  wasmView: { touchScreenPoint(kind: number, index: number, x: number, y: number, when: number): void }
}
let engine: TouchAwareEngine | null = null
let starting = false
let touches = 0
let trackedPointer: number | null = null
let trackedPoint: { x: number; y: number } | null = null
let cancelledOutside = false

// The pinned viewport bridge retains its last valid screen point when a pointer leaves
// the 3D screen. Cancel that touch before its pointerup can reuse the stale point.
viewport.addEventListener('pointerdown', (event) => {
  const point = engine?.scene.screenPointFromViewportEvent(event)
  if (!point) return
  trackedPointer = event.pointerId
  trackedPoint = point
  cancelledOutside = false
}, { capture: true })
const cancelOutside = (event: PointerEvent): void => {
  if (event.pointerId !== trackedPointer || !engine || !trackedPoint || cancelledOutside) return
  if (engine.scene.screenPointFromViewportEvent(event)) return
  log(`viewport outside: ${event.type}`)
  cancelledOutside = true
  engine.wasmView.touchScreenPoint(3, 0, -100, -100, event.timeStamp)
  viewport.dispatchEvent(new PointerEvent('pointercancel', { pointerId: event.pointerId, bubbles: true }))
}
viewport.addEventListener('pointermove', cancelOutside, { capture: true })
viewport.addEventListener('pointerup', (event) => {
  cancelOutside(event)
  if (event.pointerId === trackedPointer) { trackedPointer = null; trackedPoint = null }
}, { capture: true })
for (const kind of ['pointercancel', 'lostpointercapture'] as const) {
  viewport.addEventListener(kind, (event) => {
    if (event.pointerId === trackedPointer) {
      engine?.wasmView.touchScreenPoint(3, 0, -100, -100, event.timeStamp)
      trackedPointer = null
      trackedPoint = null
    }
  }, { capture: true })
}

function log(line: string): void {
  const item = document.createElement('li')
  item.textContent = line
  events.prepend(item)
  while (events.children.length > 80) events.lastElementChild?.remove()
}

function ingest(raw: string): void {
  for (const line of raw.split('\n').map((part) => part.trim()).filter(Boolean)) {
    if (!line.startsWith('COAMI9|')) continue
    let event: Event
    try { event = JSON.parse(line.slice(7)) as Event }
    catch { continue }
    log(line)
    if (event.kind === 'ready') modStatus.textContent = '已安裝；等待螢幕點選'
    if (event.kind === 'touch' && event.phase === 'began') touchCount.textContent = String(++touches)
    if (event.kind === 'run') runStatus.textContent = `${event.action_id} #${event.run_seq} · ${event.phase}${event.error_code ? ` · ${event.error_code}` : ''}`
  }
}

async function startEngine(): Promise<void> {
  if (starting) return
  starting = true
  restart.disabled = true
  engine?.dispose()
  engine = null
  trackedPointer = null
  trackedPoint = null
  cancelledOutside = false
  touches = 0
  touchCount.textContent = '0'
  runStatus.textContent = '尚未執行'
  simulatorStatus.textContent = '啟動中'
  modStatus.textContent = '等待 MOD'
  try {
    const response = await fetch('/coami-mod.xsa')
    if (!response.ok) throw new Error('找不到 MOD archive；請先執行 npm run prepare:poc')
    const archive = new Uint8Array(await response.arrayBuffer())
    const installedMod = { name: 'coami-mod.xsa', bytes: archive, size: archive.length, storage: 'memory' as const }
    const modStorage = {
      async saveInstalledMod(mod: { name: string; bytes: Uint8Array }) { return { ...mod, size: mod.bytes.length, storage: 'memory' as const } },
      async loadInstalledMod() { return installedMod },
      async clearInstalledMod() {},
    }
    const created = new SimulatorEngine({
      viewport, screen, runtimeBaseUrl: new URL('/simulator/', location.href).href, modStorage,
      onStatus: ({ status, code }) => { if (engine === created) simulatorStatus.textContent = `${status} · ${code}` },
      onTrace: (message) => { if (engine === created) ingest(message) },
      onReady: ({ installationStatus }) => {
        if (engine !== created) return
        simulatorStatus.textContent = `已啟動 · ${installationStatus}`
        if (installationStatus !== 'prepared' && installationStatus !== 'installed') modStatus.textContent = 'MOD 安裝失敗'
      },
      onError: (error) => { if (engine === created) { simulatorStatus.textContent = `錯誤：${String(error)}`; log(String(error)) } },
    }) as TouchAwareEngine
    engine = created
    await created.start()
  } catch (error) {
    simulatorStatus.textContent = `啟動失敗：${String(error)}`
    log(String(error))
  } finally {
    starting = false
    restart.disabled = false
  }
}

restart.addEventListener('click', () => { void startEngine() })
void startEngine()
