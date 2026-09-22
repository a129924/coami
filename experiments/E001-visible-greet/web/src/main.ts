import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import './style.css'

const DEVICE_ID = 'coami-sim-001'
const API = (import.meta.env.VITE_E001_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const SOCKET = `${API.replace(/^http/, 'ws')}/v1/devices/${DEVICE_ID}/session`

type Action = 'greet' | 'stop'
type Result = 'completed' | 'cancelled' | 'failed'
type Command = { command_id: string; action: Action; status: 'pending' | Result }

const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const serverStatus = document.querySelector<HTMLElement>('#server-status')!
const commandStatus = document.querySelector<HTMLElement>('#command-status')!
const greetButton = document.querySelector<HTMLButtonElement>('#greet')!
const stopButton = document.querySelector<HTMLButtonElement>('#stop')!
const events = document.querySelector<HTMLOListElement>('#events')!

let engine: SimulatorEngine
let socket: WebSocket | undefined
let ready = false
let connected = false
let activeGreeting: string | undefined
let pendingStop: string | undefined

function log(message: string): void {
  const item = document.createElement('li')
  item.textContent = `${new Date().toLocaleTimeString()}  ${message}`
  events.prepend(item)
  while (events.children.length > 12) events.lastElementChild?.remove()
}

function updateControls(): void {
  greetButton.disabled = !ready || !connected || !!activeGreeting
  stopButton.disabled = !ready || !connected || !!pendingStop
}

function report(action: Action, status: Result, detail?: string): void {
  const commandId = action === 'greet' ? activeGreeting : pendingStop
  if (!commandId) return
  if (action === 'greet') activeGreeting = undefined
  else pendingStop = undefined
  socket?.send(JSON.stringify({
    type: 'robot.command_result',
    command_id: commandId,
    status,
    ...(detail ? { detail } : {}),
  }))
  commandStatus.textContent = `${action} · ${status} · ${commandId.slice(0, 8)}`
  log(`${action} → ${status} (${commandId.slice(0, 8)})`)
  updateControls()
}

function receiveTrace(message: string): void {
  // The WASM runtime emits one print callback per line and strips the newline.
  const match = /COAMI_RESULT\|(greet|stop)\|(completed|cancelled|failed)(?:\|(.+))?/.exec(message)
  if (match) report(match[1] as Action, match[2] as Result, match[3])
}

function connect(): void {
  if (!ready) return
  socket = new WebSocket(SOCKET)
  serverStatus.textContent = '連線中'
  socket.onopen = () => {
    socket?.send(JSON.stringify({ type: 'robot.hello', device_id: DEVICE_ID, version: 1 }))
  }
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as {
      type: string; command_id?: string; action?: Action
    }
    if (message.type === 'robot.ready') {
      connected = true
      serverStatus.textContent = '已連線'
      log('Server 已連線，等待指令')
      updateControls()
    }
    if (message.type === 'robot.command' && message.command_id) {
      if (message.action === 'greet' && !activeGreeting) {
        activeGreeting = message.command_id
        commandStatus.textContent = `greet · 執行中 · ${activeGreeting.slice(0, 8)}`
        log(`收到 greet (${activeGreeting.slice(0, 8)})`)
        engine.pushButton('a')
      } else if (message.action === 'stop' && !pendingStop) {
        pendingStop = message.command_id
        commandStatus.textContent = `stop · 執行中 · ${pendingStop.slice(0, 8)}`
        log(`收到 stop (${pendingStop.slice(0, 8)})`)
        engine.pushButton('b')
      } else {
        socket?.send(JSON.stringify({
          type: 'robot.command_result', command_id: message.command_id,
          status: 'failed', detail: 'bridge_busy',
        }))
      }
      updateControls()
    }
  }
  socket.onclose = () => {
    connected = false
    activeGreeting = undefined
    pendingStop = undefined
    serverStatus.textContent = '已斷線，重新連線中'
    updateControls()
    window.setTimeout(connect, 1500)
  }
  socket.onerror = () => log('Server 連線失敗')
}

async function sendAction(action: Action): Promise<void> {
  try {
    const response = await fetch(`${API}/v1/devices/${DEVICE_ID}/actions/${action}`, {
      method: 'POST',
    })
    const body = (await response.json()) as Command | { detail: string }
    if (!response.ok) throw new Error('detail' in body ? body.detail : `HTTP ${response.status}`)
    log(`POST ${action} → 202 (${(body as Command).command_id.slice(0, 8)})`)
  } catch (error) {
    log(`POST ${action} 失敗：${String(error)}`)
  }
}

greetButton.addEventListener('click', () => void sendAction('greet'))
stopButton.addEventListener('click', () => void sendAction('stop'))

async function start(): Promise<void> {
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
  engine = new SimulatorEngine({
    viewport,
    screen,
    runtimeBaseUrl: new URL('/simulator/', location.href).href,
    modStorage,
    onStatus: ({ status, code }) => { simulatorStatus.textContent = `${status} · ${code}` },
    onTrace: receiveTrace,
    onReady: ({ installationStatus }) => {
      if (installationStatus !== 'prepared' && installationStatus !== 'installed') {
        simulatorStatus.textContent = `MOD 啟動失敗：${installationStatus}`
        return
      }
      ready = true
      simulatorStatus.textContent = '已啟動，MOD 已安裝'
      log('Stack-chan simulator 已啟動')
      connect()
    },
    onError: (error) => {
      simulatorStatus.textContent = `錯誤：${String(error)}`
      log(`Simulator 錯誤：${String(error)}`)
    },
  })
  await engine.start()
}

void start().catch((error) => {
  simulatorStatus.textContent = `錯誤：${String(error)}`
  log(String(error))
})
