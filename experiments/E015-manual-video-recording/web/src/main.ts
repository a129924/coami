import { BrowserRuntime } from './browser-runtime.ts'
import { RecordingSession } from './recording-session.ts'
import './style.css'

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!
const start = $<HTMLButtonElement>('#start'), stop = $<HTMLButtonElement>('#stop'), cancel = $<HTMLButtonElement>('#cancel')
const player = $<HTMLVideoElement>('#player'), status = $<HTMLElement>('#status'), result = $<HTMLElement>('#result')
const events = $<HTMLOListElement>('#events')
function evidence(message: string): void {
  const item = document.createElement('li'); item.textContent = `${performance.now().toFixed(0)} ms · ${message}`
  events.prepend(item); while (events.children.length > 150) events.lastElementChild?.remove()
}
const runtime = new BrowserRuntime({ viewport: $<HTMLCanvasElement>('#viewport'), screen: $<HTMLCanvasElement>('#screen'),
  canvas: $<HTMLCanvasElement>('#recording'), player, evidence })
const labels = { idle: '準備開始', starting: '正在準備相機（啟動約需 8 秒）…', cancelling: '正在取消，等待相機開啟與清理完成…', recording: '錄影中', finalizing: '正在產生影片…', ready: '影片已就緒', blocked: '資源清理未完成，請重新整理頁面' }
let previous = ''
const session = new RecordingSession({ now: () => performance.now(),
  schedule: (callback, ms) => window.setTimeout(callback, ms), unschedule: (id) => window.clearTimeout(id),
  openRun: (signal, failed) => runtime.open(signal, failed), createRecorder: (events) => runtime.recorder(events),
  load: (blob, signal) => runtime.load(blob, signal), clear: () => runtime.clear(), changed: refresh })
function refresh(): void {
  start.disabled = session.state !== 'idle' && session.state !== 'ready'
  stop.disabled = session.state !== 'recording'
  cancel.disabled = session.state !== 'starting' && session.state !== 'recording'
  status.textContent = session.state === 'cancelling' ? labels.cancelling : session.error || labels[session.state]
  player.hidden = session.state !== 'ready'
  result.textContent = session.state === 'ready' ? `錄製 ${(session.durationMs / 1000).toFixed(2)} 秒 · ${session.bytes} bytes` : ''
  if (previous !== session.state) {
    evidence(`${previous || 'initial'} → ${session.state}${session.error ? ` · ${session.error}` : ''}`)
    previous = session.state
  }
}
start.addEventListener('click', () => session.start())
stop.addEventListener('click', () => session.stop())
cancel.addEventListener('click', () => session.cancel())
player.addEventListener('ended', () => evidence(`完整回放 currentTime=${player.currentTime.toFixed(3)}s · 錄製=${(session.durationMs / 1000).toFixed(3)}s · 差=${Math.abs(player.currentTime - session.durationMs / 1000).toFixed(3)}s`))
window.addEventListener('pagehide', () => session.dispose())
refresh()
