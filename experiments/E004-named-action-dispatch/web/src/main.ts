import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { Action, GreetingSlot, decodeCommand } from './protocol'
import './style.css'

const DEVICE_ID = 'coami-sim-001'
const API = (import.meta.env.VITE_E004_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const SOCKET = `${API.replace(/^http/, 'ws')}/v1/devices/${DEVICE_ID}/session`
const STAGE_ONE = new URLSearchParams(location.search).get('stage') === '1'

type Result = 'completed' | 'cancelled' | 'failed'
type Incoming = {
  type: string
  command_id?: string
  event_id?: string
  action?: string
  disposition?: string
}
const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const bridgeStatus = document.querySelector<HTMLElement>('#bridge-status')!
const serverStatus = document.querySelector<HTMLElement>('#server-status')!
const commandStatus = document.querySelector<HTMLElement>('#command-status')!
const pressButton = document.querySelector<HTMLButtonElement>('#press-a')!
const stopButton = document.querySelector<HTMLButtonElement>('#stop')!
const events = document.querySelector<HTMLOListElement>('#events')!
const modeDescription = document.querySelector<HTMLElement>('#mode-description')!
if (STAGE_ONE) modeDescription.textContent = 'Stage 1：只觀察 A 事件經 Context 到 bridge，不連 Server。'

let engine: SimulatorEngine
let socket: WebSocket | undefined
let ready = false
let connected = false
let received = 0
let sessionGeneration = 0
const greetingSlot = new GreetingSlot()

function log(message: string): void {
  const item = document.createElement('li')
  item.textContent = message
  events.prepend(item)
  while (events.children.length > 40) events.lastElementChild?.remove()
}

function updateControls(): void {
  pressButton.disabled = !ready || (!STAGE_ONE && (!connected || Boolean(greetingSlot.current)))
  stopButton.disabled = !ready || !greetingSlot.current
}

function send(message: object): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

function report(status: Result, detail?: string): void {
  const greeting = greetingSlot.finish()
  if (!greeting) return
  if (connected && greeting.session === sessionGeneration) {
    const reportedStatus = status === 'cancelled' && greeting.origin === 'direct' ? 'failed' : status
    const reportedDetail = status === 'cancelled' && greeting.origin === 'direct' ? 'local_interrupted' : detail
    send({
      type: 'robot.command_result',
      command_id: greeting.commandId,
      status: reportedStatus,
      ...(reportedDetail ? { detail: reportedDetail } : {}),
    })
    commandStatus.textContent = `greet · ${reportedStatus} · ${greeting.commandId}`
    log(`結果 ${reportedStatus} · command_id=${greeting.commandId}`)
  } else {
    commandStatus.textContent = `舊 session greet 已結束 · ${greeting.commandId}`
    log(`丟棄舊 session 結果 ${status} · command_id=${greeting.commandId}`)
  }
  updateControls()
}

function receiveTrace(message: string): void {
  const line = message.trim()
  if (line.includes('[bridge] Host.Button.a pushed')) log(line)
  if (line === 'COAMI_EVENT|button|a|pressed') {
    received += 1
    bridgeStatus.textContent = `已收到 ${received} 筆：kind=button name=a pressed=true`
    log(`MOD trace: ${line}`)
    log(`Bridge 接收 #${received}：kind=button name=a pressed=true`)
    if (!STAGE_ONE && connected) {
      const eventId = crypto.randomUUID()
      send({
        type: 'robot.event',
        event_id: eventId,
        event: { kind: 'button', name: 'a', pressed: true },
      })
      log(`送往 Server · event_id=${eventId}`)
    } else log(STAGE_ONE ? 'Stage 1：只驗證 bridge，事件未送 Server' : 'Server 未連線；此事件未送出')
  }
  const result = /^COAMI_RESULT\|greet\|(completed|cancelled|failed)(?:\|(.+))?$/.exec(line)
  if (result) report(result[1] as Result, result[2])
  if (line.startsWith('COAMI_RESULT|stop|')) log(`MOD trace: ${line}`)
}

pressButton.addEventListener('click', () => {
  if (!ready || (!STAGE_ONE && !connected)) return
  log('使用者按 A：engine.pushButton(a)')
  engine.pushButton('a')
})
stopButton.addEventListener('click', () => {
  if (!ready || !greetingSlot.current) return
  log('使用者按 B：停止招呼')
  engine.pushButton('b')
})

function connect(): void {
  if (!ready) return
  socket = new WebSocket(SOCKET)
  serverStatus.textContent = '連線中'
  socket.onopen = () => send({ type: 'robot.hello', device_id: DEVICE_ID, version: 1 })
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as Incoming
    if (message.type === 'robot.ready') {
      connected = true
      sessionGeneration += 1
      serverStatus.textContent = '已連線'
      log('Server 已連線')
    } else if (message.type === 'robot.event_ack' && message.event_id && message.command_id) {
      log(`Server ${message.disposition} · event_id=${message.event_id} · command_id=${message.command_id}`)
    } else if (message.type === 'robot.command' && message.command_id) {
      const command = decodeCommand(message)
      if (!command || command.action !== Action.GREET) {
        send({
          type: 'robot.command_result',
          command_id: message.command_id,
          status: 'failed',
          detail: 'unsupported_action',
        })
      } else if (!greetingSlot.begin(
        command.commandId, sessionGeneration,
        command.eventId === undefined ? 'direct' : 'event',
      )) {
        send({
          type: 'robot.command_result',
          command_id: command.commandId,
          status: 'failed',
          detail: 'bridge_busy',
        })
      } else {
        commandStatus.textContent = `greet · 執行中 · ${command.commandId}`
        log(command.eventId === undefined
          ? `Server 直接派送 greet · command_id=${command.commandId}`
          : `Server 決策 greet · event_id=${command.eventId} · command_id=${command.commandId}`)
        engine.pushButton('c')
      }
    }
    updateControls()
  }
  socket.onclose = () => {
    connected = false
    serverStatus.textContent = '已斷線，重新連線中'
    if (greetingSlot.current) commandStatus.textContent = '等待舊 session 的本機 greet 結束'
    updateControls()
    window.setTimeout(connect, 1500)
  }
  socket.onerror = () => log('Server 連線失敗')
}

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
      if (STAGE_ONE) {
        serverStatus.textContent = 'Stage 1：不連線'
        log('Stage 1 本機模式：不連 Server')
        updateControls()
      } else connect()
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
