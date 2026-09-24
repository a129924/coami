import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { createObservedCameraBridge, type HostCapture, type ObservedBridge } from './camera-observer.ts'
import { CaptureLedger, type ModFrame } from './capture-ledger.ts'
import './style.css'

const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const scenario = document.querySelector<HTMLSelectElement>('#scenario')!
const authorize = document.querySelector<HTMLButtonElement>('#authorize')!
const captureButton = document.querySelector<HTMLButtonElement>('#capture')!
const stopButton = document.querySelector<HTMLButtonElement>('#stop')!
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const sourceStatus = document.querySelector<HTMLElement>('#source-status')!
const cameraStatus = document.querySelector<HTMLElement>('#camera-status')!
const errorStatus = document.querySelector<HTMLElement>('#error-status')!
const modCount = document.querySelector<HTMLElement>('#mod-count')!
const webcamCount = document.querySelector<HTMLElement>('#webcam-count')!
const syntheticCount = document.querySelector<HTMLElement>('#synthetic-count')!
const frameSize = document.querySelector<HTMLElement>('#frame-size')!
const trackStatus = document.querySelector<HTMLElement>('#track-status')!
const events = document.querySelector<HTMLOListElement>('#events')!

type ModTrace = ModFrame | { kind: 'ready' | 'started' | 'stopped' | 'start-error' | 'stop-error' | 'frame-error';
  error?: string; captureCount?: number }
type Observer = ReturnType<typeof createObservedCameraBridge>
type PendingCapture = { generation: number; timer: number; resolve(): void }
type PendingStop = { generation: number; resolve(): void }

let engine: SimulatorEngine | null = null
let observer: Observer | null = null
let generation = 0
let loading = false
let stopping = false
let authorizing = false
let ready = false
let cameraStarted = false
let captureTimedOut = false
let modFrames = 0
let webcamFrames = 0
let syntheticFrames = 0
let hostCaptures = 0
let pendingCapture: PendingCapture | null = null
let pendingStop: PendingStop | null = null
const ledger = new CaptureLedger()

function log(message: string): void {
  const item = document.createElement('li')
  item.textContent = message
  events.prepend(item)
  while (events.children.length > 60) events.lastElementChild?.remove()
}

function refresh(): void {
  authorize.disabled = !ready || cameraStarted || loading || stopping || authorizing
  captureButton.disabled = !ready || !cameraStarted || ledger.busy || loading || stopping || authorizing || captureTimedOut
  stopButton.disabled = !engine || loading || stopping
  restartButton.disabled = loading || stopping
  scenario.disabled = loading || cameraStarted || stopping
  modCount.textContent = String(modFrames)
  webcamCount.textContent = String(webcamFrames)
  syntheticCount.textContent = String(syntheticFrames)
}

function parseTrace(line: string): ModTrace | null {
  if (!line.startsWith('COAMI8|')) return null
  try {
    const value: unknown = JSON.parse(line.slice(7))
    if (typeof value !== 'object' || value === null || !('kind' in value)) return null
    const record = value as Record<string, unknown>
    if (record.kind === 'frame') {
      if (!Number.isInteger(record.captureSeq) || !Number.isInteger(record.width)
        || !Number.isInteger(record.height) || record.imageType !== 'rgb565le'
        || !Number.isInteger(record.byteLength) || typeof record.digest !== 'string'
        || typeof record.meanLuma !== 'number') return null
      return record as ModFrame
    }
    if (['ready', 'started', 'stopped', 'start-error', 'stop-error', 'frame-error'].includes(String(record.kind))) {
      return record as ModTrace
    }
  } catch { /* Unrelated or malformed vendor trace is not E008 evidence. */ }
  return null
}

function statusFromObserver(current: Observer): void {
  const error = current.lastErrorName()
  const phase = current.lastErrorPhase()
  errorStatus.textContent = error ?? '無'
  if (!current.apiSupported() && !window.isSecureContext && scenario.value === 'live') cameraStatus.textContent = 'unavailable · 非安全瀏覽環境'
  else if (!current.apiSupported()) cameraStatus.textContent = 'unsupported · getUserMedia 不存在'
  else if (phase === 'capture' && error) cameraStatus.textContent = `capture unavailable · ${error}`
  else if (error === 'NotAllowedError' || error === 'SecurityError') cameraStatus.textContent = '授權遭拒'
  else if (error === 'NotFoundError' || error === 'NotReadableError') cameraStatus.textContent = 'unavailable · 相機不可用'
  else if (error) cameraStatus.textContent = `unavailable · ${error}`
  else cameraStatus.textContent = current.bridge.isBrowserCameraStarted() ? 'webcam stream 已啟動，等待 MOD 證據' : 'synthetic fallback'
  if (scenario.value !== 'live') cameraStatus.textContent = `模擬 · ${cameraStatus.textContent}`
}

function receiveTrace(currentGeneration: number, line: string): void {
  if (currentGeneration !== generation) return
  const record = parseTrace(line)
  if (!record) return
  if (record.kind === 'ready') {
    log('MOD 已載入')
  } else if (record.kind === 'started') {
    cameraStarted = true
    if (observer) statusFromObserver(observer)
    log('MOD camera.start 完成；尚未證明 frame 來源')
  } else if (record.kind === 'stopped') {
    cameraStarted = false
    pendingStop?.resolve()
    pendingStop = null
    log(`MOD camera.stop 完成 · captureCount=${record.captureCount ?? 'unknown'}`)
  } else if (record.kind === 'frame') {
    modFrames += 1
    const result = ledger.resolveMod(currentGeneration, record)
    if (result.source === 'webcam') webcamFrames += 1
    if (result.source === 'synthetic') syntheticFrames += 1
    sourceStatus.textContent = result.source === 'synthetic' ? 'synthetic fallback' : result.source
    if (observer) statusFromObserver(observer)
    frameSize.textContent = `${record.width}×${record.height} · ${record.byteLength} bytes`
    log(`MOD #${record.captureSeq} · ${result.source} · ${result.reason} · ${record.width}×${record.height} · digest=${record.digest} · 亮度=${record.meanLuma}`)
    if (pendingCapture?.generation === currentGeneration) {
      window.clearTimeout(pendingCapture.timer)
      pendingCapture.resolve()
      pendingCapture = null
    }
  } else {
    if (record.kind === 'frame-error') ledger.invalidate()
    if (record.kind === 'frame-error' && pendingCapture?.generation === currentGeneration) {
      window.clearTimeout(pendingCapture.timer)
      pendingCapture.resolve()
      pendingCapture = null
    }
    log(`MOD ${record.kind}${record.error ? ` · ${record.error}` : ''}`)
  }
  refresh()
}

function selectedNavigator(): object {
  if (scenario.value === 'unsupported') return {}
  if (scenario.value === 'no-device') return { mediaDevices: { async getUserMedia() {
    throw new DOMException('simulated no device', 'NotFoundError')
  } } }
  return navigator
}

async function startEngine(): Promise<void> {
  if (loading) return
  loading = true
  refresh()
  const currentGeneration = ++generation
  const previous = engine
  previous?.dispose()
  engine = null
  observer = null
  ledger.invalidate()
  ready = false
  cameraStarted = false
  authorizing = false
  captureTimedOut = false
  modFrames = 0
  webcamFrames = 0
  syntheticFrames = 0
  hostCaptures = 0
  sourceStatus.textContent = 'unavailable'
  cameraStatus.textContent = '尚未要求授權'
  errorStatus.textContent = '無'
  simulatorStatus.textContent = '啟動中'
  try {
    const response = await fetch('/coami-mod.xsa')
    if (!response.ok) throw new Error('找不到 MOD；請先執行 npm run prepare:poc')
    const bytes = new Uint8Array(await response.arrayBuffer())
    const installedMod = { name: 'coami-mod.xsa', bytes, size: bytes.length, storage: 'memory' as const }
    const modStorage = {
      async saveInstalledMod(mod: { name: string; bytes: Uint8Array }) {
        return { ...mod, size: mod.bytes.length, storage: 'memory' as const }
      },
      async loadInstalledMod() { return installedMod },
      async clearInstalledMod() {},
    }
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    const canvas = document.createElement('canvas')
    const createdObserver = createObservedCameraBridge({ videoElement: video, canvasElement: canvas,
      navigatorObj: selectedNavigator(), onCapture: (host: HostCapture) => {
        if (currentGeneration !== generation) return
        hostCaptures += 1
        ledger.addHost(currentGeneration, host)
        if (!ledger.busy) log(`非要求中的 host capture #${host.sequence} · ${host.source}；不計入 PASS`)
      } })
    const created = new SimulatorEngine({
      viewport, screen, runtimeBaseUrl: new URL('/simulator/', location.href).href, modStorage,
      onStatus: ({ status, code }) => { if (currentGeneration === generation) simulatorStatus.textContent = `${status} · ${code}` },
      onCameraStatus: ({ status }) => { if (currentGeneration === generation) log(`Bridge 狀態：${status}（僅供參考）`) },
      onTrace: (message) => { for (const line of message.split('\n').map((part) => part.trim())) receiveTrace(currentGeneration, line) },
      onReady: ({ installationStatus }) => {
        if (currentGeneration !== generation) return
        ready = installationStatus === 'prepared' || installationStatus === 'installed'
        simulatorStatus.textContent = ready ? 'MOD 已安裝，可要求授權' : `MOD 啟動失敗：${installationStatus}`
        refresh()
      },
      onError: (error) => { if (currentGeneration === generation) { simulatorStatus.textContent = `錯誤：${String(error)}`; log(String(error)) } },
    })
    const injectable = created as SimulatorEngine & { cameraBridge: ObservedBridge; hostBridge: { Camera: ObservedBridge } }
    injectable.cameraBridge = createdObserver.bridge
    injectable.hostBridge.Camera = createdObserver.bridge
    engine = created
    observer = createdObserver
    await created.start()
  } catch (error) {
    if (currentGeneration === generation) { simulatorStatus.textContent = `啟動失敗：${String(error)}`; log(String(error)) }
  } finally {
    loading = false
    refresh()
  }
}

async function startCamera(): Promise<void> {
  const current = engine
  const currentObserver = observer
  const currentGeneration = generation
  if (!current || !currentObserver || !ready || cameraStarted || stopping || authorizing) return
  authorizing = true
  cameraStatus.textContent = '要求授權中'
  refresh()
  try {
    await current.connectCamera()
    if (currentGeneration !== generation || current !== engine || stopping) return
    statusFromObserver(currentObserver)
    current.pushButton('a')
  } catch (error) {
    if (currentGeneration === generation) { errorStatus.textContent = String(error); cameraStatus.textContent = 'unavailable' }
  } finally {
    if (currentGeneration === generation) authorizing = false
  }
  refresh()
}

async function captureFrame(): Promise<void> {
  const current = engine
  const currentGeneration = generation
  if (!current || !cameraStarted || stopping || captureTimedOut || !ledger.begin(currentGeneration)) return
  refresh()
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      if (pendingCapture?.generation === currentGeneration) {
        ledger.invalidate()
        captureTimedOut = true
        sourceStatus.textContent = 'unverified'
        log('MOD frame 等待逾時；請重啟後再擷取，該次不計入 PASS')
        pendingCapture = null
        refresh()
      }
      resolve()
    }, 5000)
    pendingCapture = { generation: currentGeneration, timer, resolve }
    current.pushButton('c')
  })
  refresh()
}

async function stopCamera(): Promise<void> {
  const current = engine
  const currentObserver = observer
  if (!current || stopping) return
  stopping = true
  refresh()
  const currentGeneration = generation
  if (ready) {
    await new Promise<void>((resolve) => {
      pendingStop = { generation: currentGeneration, resolve }
      current.pushButton('b')
      window.setTimeout(resolve, 1500)
    })
  }
  if (currentGeneration !== generation) return
  currentObserver?.bridge.stop()
  current.dispose()
  const stoppedAt = currentObserver?.captureCount() ?? 0
  await new Promise((resolve) => window.setTimeout(resolve, 250))
  const capturesStationary = (currentObserver?.captureCount() ?? 0) === stoppedAt
  engine = null
  observer = null
  generation += 1
  ready = false
  cameraStarted = false
  authorizing = false
  ledger.invalidate()
  if (pendingCapture) { window.clearTimeout(pendingCapture.timer); pendingCapture.resolve(); pendingCapture = null }
  pendingStop = null
  const states = currentObserver?.trackStates() ?? []
  trackStatus.textContent = states.length ? states.join(', ') : '無'
  cameraStatus.textContent = !capturesStationary ? '停止驗證失敗：擷取仍活躍'
    : states.length === 0 ? '已停止；本次沒有相機 track'
      : states.every((state) => state === 'ended') ? '已停止，舊 track 已結束且擷取計數不增加'
        : '停止驗證失敗：舊 track 仍活躍'
  sourceStatus.textContent = 'unavailable'
  log(`停止：舊 track=${trackStatus.textContent}；host capture 總數=${hostCaptures}；計數靜止=${capturesStationary}`)
  stopping = false
  refresh()
}

authorize.addEventListener('click', () => { void startCamera() })
captureButton.addEventListener('click', () => { void captureFrame() })
stopButton.addEventListener('click', () => { void stopCamera() })
restartButton.addEventListener('click', () => { void (async () => { await stopCamera(); await startEngine() })() })
refresh()
void startEngine()
