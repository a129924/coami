import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import './style.css'

type Trace =
  | { kind: 'ready' }
  | { kind: 'run'; run_seq: number; phase: 'started' | 'recorded' | 'completed' | 'failed'; byte_length?: number; error_code?: string; detail?: string }

const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const micStatus = document.querySelector<HTMLElement>('#mic-status')!
const recordStatus = document.querySelector<HTMLElement>('#record-status')!
const byteCount = document.querySelector<HTMLElement>('#byte-count')!
const recordButton = document.querySelector<HTMLButtonElement>('#record')!
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!
const events = document.querySelector<HTMLOListElement>('#events')!

let engine: SimulatorEngine | null = null
let starting = false
let engineReady = false
let modReady = false
let pending = false
let pendingSeq: number | null = null
let timeout: ReturnType<typeof setTimeout> | null = null

function microphonePreflight(): string | null {
  if (!navigator.mediaDevices?.getUserMedia) return 'getUserMedia 不可用'
  if (typeof MediaRecorder === 'undefined') return 'MediaRecorder 不可用'
  const formats = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav']
  if (typeof MediaRecorder.isTypeSupported === 'function' && !formats.some((format) => MediaRecorder.isTypeSupported(format))) {
    return '沒有支援的錄音格式'
  }
  return null
}

function log(message: string): void {
  const item = document.createElement('li')
  item.textContent = message
  events.prepend(item)
  while (events.children.length > 40) events.lastElementChild?.remove()
}

function refresh(): void {
  const unsupported = microphonePreflight()
  micStatus.textContent = unsupported ?? (typeof MediaRecorder.isTypeSupported === 'function' ? '可要求授權' : '格式支援未驗證')
  recordButton.disabled = Boolean(unsupported) || !engineReady || !modReady || pending || starting
  restartButton.disabled = starting
}

function parseTrace(line: string): Trace | null {
  if (!line.startsWith('COAMI7|')) return null
  try {
    const value: unknown = JSON.parse(line.slice(7))
    if (typeof value !== 'object' || value === null) return null
    const fields = value as Record<string, unknown>
    if (fields.kind === 'ready') return { kind: 'ready' }
    if (fields.kind !== 'run' || typeof fields.run_seq !== 'number') return null
    if (fields.phase !== 'started' && fields.phase !== 'recorded' && fields.phase !== 'completed' && fields.phase !== 'failed') return null
    return { kind: 'run', run_seq: fields.run_seq, phase: fields.phase,
      ...(typeof fields.byte_length === 'number' ? { byte_length: fields.byte_length } : {}),
      ...(typeof fields.error_code === 'string' ? { error_code: fields.error_code } : {}),
      ...(typeof fields.detail === 'string' ? { detail: fields.detail } : {}) }
  } catch { return null }
}

function clearPending(): void {
  if (timeout !== null) clearTimeout(timeout)
  timeout = null
  pending = false
  pendingSeq = null
  refresh()
}

recordButton.addEventListener('click', () => {
  if (!engine || !engineReady || !modReady || pending || microphonePreflight()) return
  pending = true
  pendingSeq = null
  byteCount.textContent = '—'
  recordStatus.textContent = '等待麥克風授權與 MOD'
  timeout = setTimeout(() => {
    if (!pending) return
    recordStatus.textContent = 'timeout；請重新啟動 MOD'
    log('錄音或回放超時')
    clearPending()
    engineReady = false
    refresh()
  }, 20_000)
  refresh()
  engine.pushButton('a')
})
restartButton.addEventListener('click', () => { void startEngine() })

async function startEngine(): Promise<void> {
  if (starting) return
  starting = true
  clearPending()
  engineReady = false
  modReady = false
  engine?.dispose()
  engine = null
  simulatorStatus.textContent = '啟動中'
  recordStatus.textContent = '等待 MOD'
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
          } else if (pending) {
            if (parsed.phase === 'started' && pendingSeq === null) {
              pendingSeq = parsed.run_seq
              recordStatus.textContent = '錄音中'
            } else if (parsed.run_seq === pendingSeq) {
              if (parsed.byte_length !== undefined) byteCount.textContent = `${parsed.byte_length} bytes`
              if (parsed.phase === 'recorded') recordStatus.textContent = '已錄製，回放中'
              if (parsed.phase === 'completed' || parsed.phase === 'failed') {
                recordStatus.textContent = parsed.phase === 'completed' ? '回放完成；請人工辨認內容'
                  : `失敗：${parsed.error_code ?? 'unknown'}${parsed.detail ? ` · ${parsed.detail}` : ''}`
                clearPending()
              }
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
