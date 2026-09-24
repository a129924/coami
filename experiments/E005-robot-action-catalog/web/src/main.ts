import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { ACTION_CATALOG, parseModTrace, recordsToJsonl, type ActionId, type ActionResult } from './action-contract.ts'
import { ActionDispatcher } from './dispatcher.ts'
import './style.css'

// Add an ID here only after its E005 action-matrix row has independent visual PASS evidence.
const VALIDATED_IDS: readonly ActionId[] = [
  'face.neutral', 'face.angry', 'face.sad', 'face.happy', 'face.sleepy',
  'face.blink', 'face.wink_left', 'face.wink_right', 'face.mouth_open',
  'head.left', 'head.right', 'head.up', 'head.down', 'head.nod', 'head.shake', 'head.center', 'greet',
]

const viewport = document.querySelector<HTMLCanvasElement>('#viewport')!
const screen = document.querySelector<HTMLCanvasElement>('#screen')!
const simulatorStatus = document.querySelector<HTMLElement>('#simulator-status')!
const dispatchStatus = document.querySelector<HTMLElement>('#dispatch-status')!
const recordCount = document.querySelector<HTMLElement>('#record-count')!
const supportedActions = document.querySelector<HTMLElement>('#supported-actions')!
const candidate = document.querySelector<HTMLSelectElement>('#candidate')!
const runCandidate = document.querySelector<HTMLButtonElement>('#run-candidate')!
const stopButton = document.querySelector<HTMLButtonElement>('#stop')!
const restartButton = document.querySelector<HTMLButtonElement>('#restart')!
const downloadButton = document.querySelector<HTMLButtonElement>('#download')!
const events = document.querySelector<HTMLOListElement>('#events')!

let engine: SimulatorEngine | null = null
let starting = false
const dispatcher = new ActionDispatcher((name) => engine?.pushButton(name))

function log(message: string): void {
  const item = document.createElement('li')
  item.textContent = message
  events.prepend(item)
  while (events.children.length > 50) events.lastElementChild?.remove()
}

function refresh(): void {
  runCandidate.disabled = !dispatcher.canRun
  stopButton.disabled = !dispatcher.canStop
  restartButton.disabled = starting
  downloadButton.disabled = !dispatcher.canDownload
  recordCount.textContent = String(dispatcher.records.length)
  for (const button of supportedActions.querySelectorAll<HTMLButtonElement>('button[data-action-id]')) {
    button.disabled = !dispatcher.canRun
  }
}

function report(actionId: string, result: ActionResult): void {
  dispatchStatus.textContent = `${actionId} · ${result.status}`
  log(`${actionId} · ${result.status} · request_id=${result.request_id}${result.error_code ? ` · ${result.error_code}` : ''}`)
  refresh()
}

async function execute(actionId: ActionId): Promise<void> {
  if (!dispatcher.canRun) return
  dispatchStatus.textContent = `${actionId} · 執行中`
  const pending = dispatcher.run(actionId)
  refresh()
  report(actionId, await pending)
}

for (const action of ACTION_CATALOG) {
  const option = document.createElement('option')
  option.value = action.id
  option.textContent = `${action.label} · ${action.id}`
  candidate.append(option)
}
if (VALIDATED_IDS.length === 0) {
  const note = document.createElement('p')
  note.className = 'hint'
  note.textContent = '尚無 E005 獨立視覺驗證通過的動作。先在下方研究候選。'
  supportedActions.append(note)
} else {
  for (const id of VALIDATED_IDS) {
    const action = ACTION_CATALOG.find((entry) => entry.id === id)
    if (!action) continue
    const button = document.createElement('button')
    button.dataset.actionId = id
    button.textContent = action.label
    button.disabled = true
    button.addEventListener('click', () => { void execute(id) })
    supportedActions.append(button)
  }
}

runCandidate.addEventListener('click', () => {
  const action = ACTION_CATALOG.find((entry) => entry.id === candidate.value)
  if (action) void execute(action.id)
})
stopButton.addEventListener('click', () => {
  if (!dispatcher.canStop) return
  dispatchStatus.textContent = '停止並回中立中'
  const pending = dispatcher.stop()
  refresh()
  void pending.then((result) => report('control.stop', result))
})
restartButton.addEventListener('click', () => { void startEngine() })
downloadButton.addEventListener('click', () => {
  if (!dispatcher.canDownload) return
  const blob = new Blob([recordsToJsonl(dispatcher.records)], { type: 'application/x-ndjson;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `coami-e005-actions-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

async function startEngine(): Promise<void> {
  if (starting) return
  starting = true
  dispatcher.restart()
  engine?.dispose()
  engine = null
  simulatorStatus.textContent = '啟動中'
  dispatchStatus.textContent = '等待 simulator 與 MOD 目錄'
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
          const parsed = parseModTrace(line)
          if (!parsed) continue
          dispatcher.ingest(parsed)
          if (parsed.kind === 'catalog') log(`MOD 目錄已到達：${parsed.action_ids.length} 個候選`)
          else if (parsed.kind === 'run' || parsed.kind === 'reset') log(`MOD trace: ${line}`)
          refresh()
        }
      },
      onReady: ({ installationStatus }) => {
        if (engine !== created) return
        if (installationStatus !== 'prepared' && installationStatus !== 'installed') {
          simulatorStatus.textContent = `MOD 啟動失敗：${installationStatus}`
          return
        }
        dispatcher.setReady(true)
        simulatorStatus.textContent = '已啟動，MOD 已安裝'
        dispatchStatus.textContent = dispatcher.canRun ? '可執行候選測試' : '等待 MOD 目錄'
        log('Simulator 已啟動')
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
  } finally {
    starting = false
    refresh()
  }
}

refresh()
void startEngine()
