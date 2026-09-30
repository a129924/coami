import './style.css'

type Event = { kind: string; phase?: string; run_seq?: number | null; action_id?: string | null; accepted?: boolean; offset?: number }
type InstalledMod = { name: string; bytes: Uint8Array; size: number; storage: 'memory' }
type EngineStatus = { status: string; code: string }
type EngineReady = { installationStatus: string }
type EngineOptions = {
  viewport: HTMLCanvasElement; screen: HTMLCanvasElement; runtimeBaseUrl: string
  modStorage: { saveInstalledMod(mod: { name: string; bytes: Uint8Array }): Promise<InstalledMod>; loadInstalledMod(): Promise<InstalledMod>; clearInstalledMod(): Promise<void> }
  onStatus(status: EngineStatus): void; onTrace(message: string): void; onReady(ready: EngineReady): void; onError(error: unknown): void
}
type BaseEngine = { start(): Promise<void>; dispose(): void }
type TouchAwareEngine = BaseEngine & {
  scene: { screenPointFromViewportEvent(event: PointerEvent): { x: number; y: number } | null }
  wasmView: { touchScreenPoint(kind: number, index: number, x: number, y: number, when: number): void }
}
type SimulatorEngineConstructor = new (options: EngineOptions) => TouchAwareEngine

// Keep the extra touch surface local to this experiment rather than widening vendor declarations.
const { SimulatorEngine } = await import('../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs')
const SimulatorEngineConstructor = SimulatorEngine as unknown as SimulatorEngineConstructor

const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const modStatus = document.querySelector<HTMLElement>('#mod-status')!
const touchCount = document.querySelector<HTMLElement>('#touch-count')!
const runStatus = document.querySelector<HTMLElement>('#run-status')!
const restart = document.querySelector<HTMLButtonElement>('#restart')!
const events = document.querySelector<HTMLOListElement>('#events')!
let engine: TouchAwareEngine | null = null
let starting = false
let touches = 0
let trackedPointer: number | null = null
let trackedPoint: { x: number; y: number } | null = null
let cancelledOutside = false

function log(line: string): void {
  const item = document.createElement('li')
  item.textContent = line
  events.prepend(item)
  while (events.children.length > 80) events.lastElementChild?.remove()
}

function cancelScreenTouch(event: PointerEvent): void {
  if (event.pointerId !== trackedPointer || !engine || !trackedPoint || cancelledOutside) return
  if (engine.scene.screenPointFromViewportEvent(event)) return
  cancelledOutside = true
  log(`viewport outside: ${event.type}`)
  engine.wasmView.touchScreenPoint(3, 0, -100, -100, event.timeStamp)
  viewport.dispatchEvent(new PointerEvent('pointercancel', { pointerId: event.pointerId, bubbles: true }))
}

// The pinned bridge otherwise reuses its last in-screen coordinate on pointerup.
viewport.addEventListener('pointerdown', (event) => {
  const point = engine?.scene.screenPointFromViewportEvent(event)
  if (!point) return
  trackedPointer = event.pointerId
  trackedPoint = point
  cancelledOutside = false
}, { capture: true })
viewport.addEventListener('pointermove', cancelScreenTouch, { capture: true })
viewport.addEventListener('pointerup', (event) => {
  cancelScreenTouch(event)
  if (event.pointerId === trackedPointer) { trackedPointer = null; trackedPoint = null }
}, { capture: true })
for (const kind of ['pointercancel', 'lostpointercapture'] as const) {
  viewport.addEventListener(kind, (event) => {
    if (event.pointerId !== trackedPointer) return
    engine?.wasmView.touchScreenPoint(3, 0, -100, -100, event.timeStamp)
    trackedPointer = null
    trackedPoint = null
  }, { capture: true })
}

function ingest(raw: string): void {
  for (const line of raw.split('\n').map((part) => part.trim()).filter(Boolean)) {
    if (!line.startsWith('COAMI11|')) continue
    let event: Event
    try { event = JSON.parse(line.slice('COAMI11|'.length)) as Event }
    catch { continue }
    log(line)
    if (event.kind === 'ready') modStatus.textContent = '已安裝；請在螢幕滑動或選取'
    if (event.kind === 'touch' && event.phase === 'began') touchCount.textContent = String(++touches)
    if (event.kind === 'run') runStatus.textContent = `${event.action_id ?? 'unknown'} #${event.run_seq ?? '?'} · ${event.phase}`
    if (event.kind === 'scroll') runStatus.textContent = `清單位置：${Math.round(event.offset ?? 0)}`
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
    const created = new SimulatorEngineConstructor({
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
