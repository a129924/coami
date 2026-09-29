import { SimulatorEngine } from './preview-runtime.ts'
import { TopTouchSurface, type TopZone } from './top-touch-surface.ts'
import './style.css'

type TraceEvent = { kind: string; phase?: string; run?: number; action_id?: string; accepted?: boolean; tap_position?: number; zone?: string }
type TopTouchEngine = {
  dispose(): void
  pushTopTouch(position: number): boolean
  start(): Promise<void>
}

const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const modStatus = document.querySelector<HTMLElement>('#mod-status')!
const touchStatus = document.querySelector<HTMLElement>('#touch-status')!
const runStatus = document.querySelector<HTMLElement>('#run-status')!
const restart = document.querySelector<HTMLButtonElement>('#restart')!
const events = document.querySelector<HTMLOListElement>('#events')!
const zoneButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-zone]')]

let engine: TopTouchEngine | null = null
let starting = false
const surface = new TopTouchSurface((position) => {
  const accepted = engine?.pushTopTouch(position) ?? false
  touchStatus.textContent = accepted ? `已送出 ${position}` : 'runtime 尚未就緒'
  log(`surface tap position=${position} accepted=${accepted}`)
})

function toPointer(event: PointerEvent) {
  return { pointerId: event.pointerId, isPrimary: event.isPrimary, clientX: event.clientX, clientY: event.clientY, timeStamp: event.timeStamp }
}

function zoneOf(button: HTMLButtonElement): TopZone {
  const zone = button.dataset.zone
  if (zone === 'left' || zone === 'center' || zone === 'right') return zone
  throw new Error(`Unknown top-touch zone: ${zone}`)
}

for (const button of zoneButtons) {
  const zone = zoneOf(button)
  button.addEventListener('pointerdown', (event) => {
    if (!surface.begin(zone, toPointer(event))) return
    button.setPointerCapture(event.pointerId)
  })
  button.addEventListener('pointermove', (event) => surface.move(toPointer(event)))
  button.addEventListener('pointercancel', (event) => surface.cancel(toPointer(event)))
  button.addEventListener('lostpointercapture', (event) => surface.cancel(toPointer(event)))
  button.addEventListener('pointerup', (event) => {
    surface.end(zone, toPointer(event))
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId)
  })
}

function log(line: string): void {
  const item = document.createElement('li')
  item.textContent = line
  events.prepend(item)
  while (events.children.length > 80) events.lastElementChild?.remove()
}

function ingest(raw: string): void {
  for (const line of raw.split('\n').map((part) => part.trim()).filter(Boolean)) {
    if (!line.startsWith('COAMI10|')) continue
    let event: TraceEvent
    try { event = JSON.parse(line.slice(8)) as TraceEvent } catch { continue }
    log(line)
    if (event.kind === 'ready') modStatus.textContent = '已安裝；等待機頂輕觸'
    if (event.kind === 'input' && event.phase === 'unavailable') modStatus.textContent = '機頂輸入不可用'
    if (event.kind === 'touch-panel') touchStatus.textContent = `${event.tap_position ?? '—'} · ${event.accepted ? 'accepted' : 'ignored'}`
    if (event.kind === 'run') runStatus.textContent = `${event.action_id} #${event.run} · ${event.phase}`
  }
}

async function startEngine(): Promise<void> {
  if (starting) return
  starting = true
  restart.disabled = true
  engine?.dispose()
  engine = null
  simulatorStatus.textContent = '啟動中'
  modStatus.textContent = '等待 MOD'
  touchStatus.textContent = '尚未觸發'
  runStatus.textContent = '尚未執行'
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
      onStatus: ({ status, code }: { status: string; code: string }) => { if (engine === created) simulatorStatus.textContent = `${status} · ${code}` },
      onTrace: (message: string) => { if (engine === created) ingest(message) },
      onReady: ({ installationStatus }: { installationStatus: string }) => {
        if (engine === created) simulatorStatus.textContent = `已啟動 · ${installationStatus}`
      },
      onError: (error: unknown) => { if (engine === created) { simulatorStatus.textContent = `錯誤：${String(error)}`; log(String(error)) } },
    })
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
