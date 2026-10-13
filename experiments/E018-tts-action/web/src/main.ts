import './style.css'
import { BrowserRuntime } from './browser-runtime.ts'
import { TtsSession, TEXT, type Choice } from './tts-session.ts'

function element<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T }
const start = element<HTMLButtonElement>('start'), status = element('status')
const notice = element('notice')
const history = element('history'), trace = element<HTMLPreElement>('trace')
const failure = element<HTMLButtonElement>('failure'), download = element<HTMLButtonElement>('download')
const buttons = { A: element<HTMLButtonElement>('say-a'), B: element<HTMLButtonElement>('say-b') }
const sessionId = crypto.randomUUID(), runtime = new BrowserRuntime()
const records: Record<string, unknown>[] = []
const evidence = (event: Record<string, unknown>) => {
  if (event.kind === 'rejected') notice.textContent = '已拒絕：目前正在說話或尚未可接受請求；不排隊。'
  if (event.kind === 'accepted') notice.textContent = ''
  if (event.kind === 'bridge' && event.phase === 'failed' && event.reason === 'injected playback failure') failure.textContent = '下一筆播放失敗（測試）'
  records.push({ ...event, sessionId, at: new Date().toISOString(), monotonicMs: Math.round(performance.now()) })
  trace.textContent = records.slice(-100).map(record => JSON.stringify(record)).join('\n')
}
const session = new TtsSession(sessionId, {
  dispatch: button => runtime.dispatch(button),
  after: (ms, callback) => { const timer = setTimeout(callback, ms); return () => clearTimeout(timer) },
  changed: render, evidence: event => evidence(event),
})
function render(): void {
  const snapshot = session.snapshot()
  const labels = { initializing: '尚未就緒', idle: '可說話', speaking: '執行中', locked: '結果未確認／無法繼續，請重新載入' }
  status.textContent = labels[snapshot.status]
  // Keep speaking buttons operable so busy rejection is explicit and observable.
  for (const choice of ['A', 'B'] as const) buttons[choice].disabled = snapshot.status === 'initializing' || snapshot.status === 'locked'
  failure.disabled = snapshot.status !== 'idle'
  history.replaceChildren(...snapshot.results.map(result => {
    const row = document.createElement('li')
    row.textContent = `#${result.runSeq} 「${result.text}」→ ${result.outcome} · ${result.reason}`
    return row
  }))
  if (snapshot.current) {
    const row = document.createElement('li')
    row.textContent = `#${snapshot.current.runSeq} 「${snapshot.current.text}」→ 執行中`
    history.append(row)
  }
}
start.addEventListener('click', () => {
  start.disabled = true
  evidence({ kind: 'operator-start', userAgent: navigator.userAgent })
  void runtime.open({ viewport: element<HTMLCanvasElement>('viewport'), screen: element<HTMLCanvasElement>('screen') }, session, evidence).catch(error => { evidence({ kind: 'startup-error', reason: String(error) }); session.fatal(String(error)) })
})
for (const choice of ['A', 'B'] as Choice[]) {
  buttons[choice].textContent = `${choice} · ${TEXT[choice]}`
  buttons[choice].addEventListener('click', () => { session.request(choice) })
}
failure.addEventListener('click', () => {
  runtime.failNext(); evidence({ kind: 'fault-armed', fault: 'next playback false, no sound' })
  failure.textContent = '已設定：下一筆播放失敗'
})
download.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([records.map(record => JSON.stringify(record)).join('\n') + '\n'], { type: 'application/x-ndjson' }))
  const link = document.createElement('a'); link.href = url; link.download = `e018-${sessionId}.jsonl`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
})
window.addEventListener('pagehide', () => { session.fatal('page leaving'); runtime.close() }, { once: true })
evidence({ kind: 'session-created', note: '程式完成與真人聽辨分開；不宣稱中文能力' }); render()
