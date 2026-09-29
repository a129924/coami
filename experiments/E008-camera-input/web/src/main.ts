import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { createObservedCameraBridge, digestBytes, type HostCapture, type ObservedBridge } from './camera-observer.ts'
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
  error?: string; captureCount?: number; captureSeq?: number } | { kind: 'digest-probe'; digest: string; empty: string;
  zero: string; length: number; first: number; last: number }
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
let digestProbePassed = false
let activeScenario = 'live'
let pendingCapture: PendingCapture | null = null
let pendingStop: PendingStop | null = null
const ledger = new CaptureLedger()

function log(message: string): void {
  const item = document.createElement('li')
  item.textContent = message
  events.prepend(item)
  while (events.children.length > 60) events.lastElementChild?.remove()
}

function hostEvidence(hosts: HostCapture[]): string {
  return hosts.map((host) =>
    ` · host #${host.sequence} ${host.source} ${host.width}×${host.height} ${host.byteLength} bytes digest=${host.digest} 亮度=${host.meanLuma} 錯誤類別=${host.errorName ?? '無'} 階段=${host.errorPhase ?? '無'}`).join('')
}

function invalidatePendingCapture(reason: string): void {
  const wasPending = ledger.busy
  const hosts = ledger.invalidate()
  if (wasPending) log(`MOD frame 未完成：${reason}；該次不計入 PASS${hostEvidence(hosts)}`)
  if (pendingCapture) {
    window.clearTimeout(pendingCapture.timer)
    pendingCapture.resolve()
    pendingCapture = null
  }
}

function refresh(): void {
  authorize.disabled = !ready || cameraStarted || loading || stopping || authorizing || scenario.value !== activeScenario
  captureButton.disabled = !ready || !cameraStarted || ledger.busy || loading || stopping || authorizing || captureTimedOut
  stopButton.disabled = !engine || loading || stopping
  restartButton.disabled = loading || stopping
  scenario.disabled = loading || cameraStarted || stopping || authorizing
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
    if (record.kind === 'digest-probe' && typeof record.digest === 'string'
      && typeof record.empty === 'string' && typeof record.zero === 'string'
      && Number.isInteger(record.length) && Number.isInteger(record.first)
      && Number.isInteger(record.last)) return record as ModTrace
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
  if (!current.apiSupported() && !window.isSecureContext && activeScenario === 'live') cameraStatus.textContent = 'unavailable · 非安全瀏覽環境'
  else if (!current.apiSupported()) cameraStatus.textContent = 'unsupported · getUserMedia 不存在'
  else if (phase === 'capture' && error) cameraStatus.textContent = `capture unavailable · ${error}`
  else if (error === 'NotAllowedError' || error === 'SecurityError') cameraStatus.textContent = '授權遭拒'
  else if (error === 'NotFoundError' || error === 'NotReadableError') cameraStatus.textContent = 'unavailable · 相機不可用'
  else if (error) cameraStatus.textContent = `unavailable · ${error}`
  else cameraStatus.textContent = current.bridge.isBrowserCameraStarted() ? 'webcam stream 已啟動，等待 MOD 證據' : 'synthetic fallback'
  if (activeScenario !== 'live') cameraStatus.textContent = `模擬 · ${cameraStatus.textContent}`
}

function receiveTrace(currentGeneration: number, line: string): void {
  if (currentGeneration !== generation) return
  const record = parseTrace(line)
  if (!record) return
  if (record.kind === 'digest-probe') {
    const hostDigest = digestBytes(new Uint8Array([0, 1, 127, 128, 255, 13, 42, 99]))
    digestProbePassed = record.digest === hostDigest
      && record.empty === digestBytes(new Uint8Array(0))
      && record.zero === digestBytes(new Uint8Array([0]))
      && record.length === 8 && record.first === 0 && record.last === 99
    log(`固定 digest 探針 · MOD=${record.digest} · host=${hostDigest} · ${digestProbePassed ? '一致' : '不一致'}`)
    log(`探針細節 · MOD empty=${record.empty} zero=${record.zero} length=${record.length} first=${record.first} last=${record.last} · host empty=${digestBytes(new Uint8Array(0))} zero=${digestBytes(new Uint8Array([0]))}`)
  } else if (record.kind === 'ready') {
    log('MOD 已載入')
  } else if (record.kind === 'started') {
    cameraStarted = true
    if (observer) {
      statusFromObserver(observer)
      log(`相機狀態：${cameraStatus.textContent} · 錯誤類別=${errorStatus.textContent}`)
    }
    log('MOD camera.start 完成；尚未證明 frame 來源')
  } else if (record.kind === 'stopped') {
    cameraStarted = false
    pendingStop?.resolve()
    pendingStop = null
    log(`MOD camera.stop 完成 · captureCount=${record.captureCount ?? 'unknown'}`)
  } else if (record.kind === 'frame') {
    modFrames += 1
    const result = ledger.resolveMod(currentGeneration, record)
    const source = digestProbePassed ? result.source : 'unverified'
    const reason = digestProbePassed ? result.reason : 'digest-probe-failed'
    if (source === 'webcam') webcamFrames += 1
    if (source === 'synthetic') syntheticFrames += 1
    sourceStatus.textContent = source === 'synthetic' ? 'synthetic fallback' : source
    if (observer) statusFromObserver(observer)
    frameSize.textContent = `${record.width}×${record.height} · ${record.byteLength} bytes`
    const hosts = result.hosts ?? (result.host ? [result.host] : [])
    log(`MOD #${record.captureSeq} · ${source} · ${reason} · ${record.width}×${record.height} ${record.byteLength} bytes · digest=${record.digest} · 亮度=${record.meanLuma}${hostEvidence(hosts)}`)
    if (pendingCapture?.generation === currentGeneration) {
      window.clearTimeout(pendingCapture.timer)
      pendingCapture.resolve()
      pendingCapture = null
    }
  } else {
    let errorHosts: HostCapture[] = []
    if (record.kind === 'frame-error') {
      errorHosts = ledger.resolveError(currentGeneration)
      sourceStatus.textContent = 'unavailable'
    }
    if (record.kind === 'frame-error' && pendingCapture?.generation === currentGeneration) {
      window.clearTimeout(pendingCapture.timer)
      pendingCapture.resolve()
      pendingCapture = null
    }
    const label = record.kind === 'frame-error' ? `MOD #${record.captureSeq ?? 'unknown'} frame-error` : `MOD ${record.kind}`
    log(`${label}${record.error ? ` · ${record.error}` : ''}${hostEvidence(errorHosts)}`)
  }
  refresh()
}

function selectedNavigator(selectedScenario: string): object {
  if (selectedScenario === 'unsupported') return {}
  if (selectedScenario === 'no-device') return { mediaDevices: { async getUserMedia() {
    throw new DOMException('simulated no device', 'NotFoundError')
  } } }
  return navigator
}

async function startEngine(): Promise<void> {
  if (loading) return
  loading = true
  activeScenario = scenario.value
  refresh()
  invalidatePendingCapture('重新啟動 simulator')
  const currentGeneration = ++generation
  const previous = engine
  previous?.dispose()
  engine = null
  observer = null
  ready = false
  cameraStarted = false
  authorizing = false
  captureTimedOut = false
  modFrames = 0
  webcamFrames = 0
  syntheticFrames = 0
  hostCaptures = 0
  digestProbePassed = false
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
      navigatorObj: selectedNavigator(activeScenario), onCapture: (host: HostCapture) => {
        if (currentGeneration !== generation) return
        hostCaptures += 1
        ledger.addHost(currentGeneration, host)
        if (!ledger.busy) log(`非要求中的 host capture；不計入 PASS${hostEvidence([host])}`)
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
        const hosts = ledger.resolveError(currentGeneration)
        captureTimedOut = true
        sourceStatus.textContent = 'unverified'
        log(`MOD frame 等待逾時；請重啟後再擷取，該次不計入 PASS${hostEvidence(hosts)}`)
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
  invalidatePendingCapture('停止相機')
  engine = null
  observer = null
  generation += 1
  ready = false
  cameraStarted = false
  authorizing = false
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
scenario.addEventListener('change', () => {
  cameraStatus.textContent = scenario.value === activeScenario ? '尚未要求授權' : '情境已變更；重新啟動 simulator 後生效'
  refresh()
})
refresh()
void startEngine()
