import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { startTabCapture, type TabCapture } from './tab-capture.ts'
import './style.css'

type ActionId = 'tone' | 'wav'
type Trace =
  | { kind: 'ready' }
  | { kind: 'run'; run_seq: number; action_id: ActionId; phase: 'started' | 'completed' | 'failed'; error?: string }

const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const actionStatus = document.querySelector<HTMLElement>('#action-status')!
const captureStatus = document.querySelector<HTMLElement>('#capture-status')!
const toneButton = document.querySelector<HTMLButtonElement>('#tone')!
const wavButton = document.querySelector<HTMLButtonElement>('#wav')!
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!
const startCaptureButton = document.querySelector<HTMLButtonElement>('#start-capture')!
const stopCaptureButton = document.querySelector<HTMLButtonElement>('#stop-capture')!
const events = document.querySelector<HTMLOListElement>('#events')!

let engine: SimulatorEngine | null = null
let starting = false
let engineReady = false
let modReady = false
let pendingAction: ActionId | null = null
let pendingSeq: number | null = null
let timeout: ReturnType<typeof setTimeout> | null = null
let capture: TabCapture | null = null
let captureStarting = false

function log(message: string): void {
  const item = document.createElement('li')
  item.textContent = message
  events.prepend(item)
  while (events.children.length > 40) events.lastElementChild?.remove()
}

function refresh(): void {
  const canRun = engineReady && modReady && pendingAction === null && !starting
  toneButton.disabled = !canRun
  wavButton.disabled = !canRun
  restartButton.disabled = starting
  startCaptureButton.disabled = capture !== null || captureStarting
  stopCaptureButton.disabled = capture === null
}

function parseTrace(line: string): Trace | null {
  if (!line.startsWith('COAMI6|')) return null
  try {
    const value: unknown = JSON.parse(line.slice(7))
    if (typeof value !== 'object' || value === null) return null
    const fields = value as Record<string, unknown>
    if (fields.kind === 'ready') return { kind: 'ready' }
    if (fields.kind !== 'run' || typeof fields.run_seq !== 'number') return null
    if (fields.action_id !== 'tone' && fields.action_id !== 'wav') return null
    if (fields.phase !== 'started' && fields.phase !== 'completed' && fields.phase !== 'failed') return null
    return { kind: 'run', run_seq: fields.run_seq, action_id: fields.action_id,
      phase: fields.phase, ...(typeof fields.error === 'string' ? { error: fields.error } : {}) }
  } catch { return null }
}

function clearPending(): void {
  if (timeout !== null) clearTimeout(timeout)
  timeout = null
  pendingAction = null
  pendingSeq = null
  refresh()
}

function run(actionId: ActionId): void {
  if (!engine || !engineReady || !modReady || pendingAction !== null) return
  pendingAction = actionId
  pendingSeq = null
  actionStatus.textContent = `${actionId} · 等待 MOD`
  timeout = setTimeout(() => {
    if (pendingAction !== actionId) return
    actionStatus.textContent = `${actionId} · timeout`
    log(`${actionId} · timeout；請重新啟動 MOD`)
    clearPending()
    engineReady = false
    refresh()
  }, 10_000)
  refresh()
  engine.pushButton(actionId === 'tone' ? 'a' : 'c')
}

toneButton.addEventListener('click', () => run('tone'))
wavButton.addEventListener('click', () => run('wav'))
restartButton.addEventListener('click', () => { void startEngine() })
startCaptureButton.addEventListener('click', () => {
  if (capture || captureStarting) return
  captureStarting = true
  captureStatus.textContent = '等待分頁與音訊授權'
  refresh()
  void startTabCapture((error) => {
    capture = null
    captureStatus.textContent = `錄製失敗：${error.message}`
    log(`錄製失敗：${error.message}`)
    refresh()
  }).then((started) => {
    capture = started
    captureStatus.textContent = '錄製中（含分頁音軌）'
    log('分頁音訊錄製已開始')
  }).catch((error: unknown) => {
    captureStatus.textContent = `無法錄製：${String(error)}`
    log(`錄製失敗：${String(error)}`)
  }).finally(() => { captureStarting = false; refresh() })
})
stopCaptureButton.addEventListener('click', () => {
  const current = capture
  if (!current) return
  capture = null
  captureStatus.textContent = '儲存 WebM 中'
  refresh()
  void current.stopAndDownload().then(({ bytes, audioTracks }) => {
    captureStatus.textContent = `已下載 ${bytes} bytes · ${audioTracks} 音軌；請重播確認有聲`
    log('output-capture.webm 已下載；請複製到 E006 evidence 目錄')
  }).catch((error: unknown) => {
    captureStatus.textContent = `儲存失敗：${String(error)}`
    log(`儲存失敗：${String(error)}`)
  })
})

async function startEngine(): Promise<void> {
  if (starting) return
  starting = true
  clearPending()
  engineReady = false
  modReady = false
  engine?.dispose()
  engine = null
  simulatorStatus.textContent = '啟動中'
  actionStatus.textContent = '等待 MOD'
  refresh()
  try {
    const response = await fetch('/coami-mod.xsa')
    if (!response.ok) throw new Error('找不到 coami-mod.xsa；請先執行 npm run prepare:poc')
    const archive = new Uint8Array(await response.arrayBuffer())
    const installedMod = { name: 'coami-mod.xsa', bytes: archive, size: archive.length, storage: 'memory' as const }
    const modStorage = {
      async saveInstalledMod(mod: { name: string; bytes: Uint8Array }) {
        return { ...mod, size: mod.bytes.length, storage: 'memory' as const }
      },
      async loadInstalledMod() { return installedMod },
      async clearInstalledMod() {},
    }
    const created = new SimulatorEngine({
      viewport, screen, runtimeBaseUrl: new URL('/simulator/', location.href).href, modStorage,
      onStatus: ({ status, code }) => { if (engine === created) simulatorStatus.textContent = `${status} · ${code}` },
      onTrace: (message) => {
        if (engine !== created) return
        for (const line of message.split('\n').map((part) => part.trim()).filter(Boolean)) {
          const parsed = parseTrace(line)
          if (!parsed) continue
          log(line)
          if (parsed.kind === 'ready') {
            modReady = true
          } else if (parsed.action_id === pendingAction) {
            if (parsed.phase === 'started') {
              pendingSeq = parsed.run_seq
              actionStatus.textContent = `${parsed.action_id} · 執行中`
            } else if (parsed.run_seq === pendingSeq) {
              actionStatus.textContent = `${parsed.action_id} · ${parsed.phase}${parsed.error ? ` · ${parsed.error}` : ''}`
              clearPending()
            }
          }
          refresh()
        }
      },
      onReady: ({ installationStatus }) => {
        if (engine !== created) return
        if (installationStatus !== 'prepared' && installationStatus !== 'installed') {
          simulatorStatus.textContent = `MOD 啟動失敗：${installationStatus}`
          return
        }
        engineReady = true
        simulatorStatus.textContent = '已啟動，MOD 已安裝'
        refresh()
      },
      onError: (error) => {
        if (engine !== created) return
        simulatorStatus.textContent = `錯誤：${String(error)}`
        log(String(error))
      },
    })
    engine = created
    await created.start()
  } catch (error) {
    simulatorStatus.textContent = `啟動失敗：${String(error)}`
    log(String(error))
  } finally { starting = false; refresh() }
}

refresh()
void startEngine()
