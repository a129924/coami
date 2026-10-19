import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { ObservedAudio, type AudioEvent } from './observed-audio.ts'
import { analyze, nextOperation, type Evidence, type Order, type Verdict } from './overlap.ts'
import './style.css'

type Mode = 'baseline-record' | 'baseline-say' | Order
type Op = 'record' | 'say' | 'replay'
type Engine = { start(): Promise<void>; pushButton(name: 'a' | 'b' | 'c'): void; dispose(): void; audioInBridge: unknown; audioOutBridge: unknown; hostBridge: { AudioIn: unknown; AudioOut: unknown } }
type Trial = { id: string; mode: Mode; evidence: Evidence; requested: Set<Op>; sequences: Partial<Record<Op, number>>; done: Set<Op>; second: boolean; captureEnded: boolean; activeSources: Set<string>; endedSources: Set<string>; hostBytes: number; result: Verdict | null; humanTts: string; humanRecording: string; note: string; replayVerified: boolean }
const el = <T extends HTMLElement>(id: string): T => { const value = document.getElementById(id); if (!value) throw Error(`Missing ${id}`); return value as T }
const status = el('status'), detail = el('detail'), events: Record<string, unknown>[] = [], trials: Trial[] = []
let engine: Engine | null = null, audio: ObservedAudio | null = null, active: Trial | null = null
let ready = false, locked = false, replayBusy = false, replayEnded = false, replayDone = false, lastSequence = 0
let timer: ReturnType<typeof setTimeout> | undefined, sessionId = crypto.randomUUID()
const labels: Record<Mode, string> = { 'baseline-record': '錄音基線', 'baseline-say': 'TTS 基線', 'record-say': '錄音 → 說話', 'say-record': '說話 → 錄音' }
const token = (trial: Trial, op: Op) => `${trial.id}:${op}`
function log(record: Record<string, unknown>): void {
  events.push({ sessionId, at: performance.now(), utc: new Date().toISOString(), ...record })
  el('trace').textContent = events.slice(-12).map(v => JSON.stringify(v)).join('\n')
}
function render(): void {
  const running = !!active && active.result === null
  const baseRecord = trials.some(t => t.mode === 'baseline-record' && t.humanRecording === 'heard' && t.result?.status === 'baseline-complete')
  const baseSay = trials.some(t => t.mode === 'baseline-say' && t.humanTts === 'heard' && t.result?.status === 'baseline-complete')
  for (const id of ['record-baseline', 'say-baseline']) el<HTMLButtonElement>(id).disabled = !ready || running || locked || replayBusy
  for (const id of ['record-say', 'say-record']) el<HTMLButtonElement>(id).disabled = !ready || running || locked || replayBusy || !baseRecord || !baseSay
  el<HTMLButtonElement>('replay').disabled = !active?.result || active.evidence.recordBytes <= 0 || replayBusy || locked
  el<HTMLButtonElement>('save').disabled = !active?.result || replayBusy
  const list = el('history'); list.replaceChildren()
  for (const t of trials) {
    const li = document.createElement('li')
    li.textContent = `${labels[t.mode]} · ${t.id.slice(0, 8)} · ${t.result ? resultText(t.result) : '執行中'} · 真人 TTS=${t.humanTts}／錄音=${t.humanRecording}`
    list.append(li)
  }
  const count = (mode: Mode) => trials.filter(t => t.mode === mode && t.result?.status === 'overlap-observed' && t.humanTts === 'heard' && t.humanRecording === 'heard').length
  el('progress').textContent = `已確認重疊且真人聽辨：錄音 → 說話 ${count('record-say')}/3；說話 → 錄音 ${count('say-record')}/3`
}
function resultText(result: Verdict): string {
  if (result.status === 'baseline-complete') return '單項基線完成；真人聽辨另記'
  if (result.status === 'overlap-observed') return `已觀察到至少 ${Math.round(result.overlapMs)} ms 錄放重疊`
  if (result.status === 'no-overlap-observed') return '本筆未觀察到重疊；不能據此認定 SDK 互斥'
  return '無法判定：' + result.reason
}
function request(op: Op): void {
  if (!active || !engine) throw Error('Simulator unavailable')
  if (active.requested.has(op) && op !== 'replay') { active.evidence.issues.push(`duplicate ${op}`); return }
  active.requested.add(op)
  log({ kind: 'dispatch', caseId: active.id, op })
  engine.pushButton(op === 'record' ? 'a' : op === 'say' ? 'c' : 'b')
}
function finish(result: Verdict): void {
  if (!active || active.result) return
  clearTimeout(timer); active.result = result
  if (result.status === 'unconfirmed') locked = true
  status.textContent = resultText(result)
  detail.textContent = locked ? '結果保留未知；請先儲存紀錄，再重新載入。' : '請回放本筆錄音，再填真人聽辨並儲存。'
  log({ kind: 'case-result', caseId: active.id, mode: active.mode, ...result })
  el<HTMLSelectElement>('human-tts').value = active.mode === 'baseline-record' ? 'not-applicable' : 'unconfirmed'
  el<HTMLSelectElement>('human-recording').value = active.mode === 'baseline-say' ? 'not-applicable' : 'unconfirmed'
  el<HTMLTextAreaElement>('note').value = ''
  render()
}
function check(): void {
  const t = active
  if (!t || t.result) return
  const pair = t.mode === 'record-say' || t.mode === 'say-record'
  const required: Op[] = t.mode === 'baseline-record' ? ['record'] : t.mode === 'baseline-say' ? ['say'] : ['record', 'say']
  if (pair && !t.second && t.done.size > 0) { finish({ status: 'unconfirmed', overlapMs: 0, reason: '第一操作結束前沒有撞入有效窗口' }); return }
  if (!required.every(op => t.done.has(op))) return
  if (required.includes('record') && !t.captureEnded && t.evidence.recordBytes > 0) return
  if (required.includes('say') && t.evidence.saySuccess && t.activeSources.size > t.endedSources.size) return
  if (required.includes('record') && t.hostBytes !== t.evidence.recordBytes) t.evidence.issues.push('Host / SDK recording byte count mismatch')
  if (pair) finish(analyze(t.evidence))
  else {
    const okay = t.mode === 'baseline-record'
      ? !!t.evidence.capture && t.captureEnded && t.evidence.recordBytes > 0
      : t.evidence.saySuccess && t.evidence.playback.length > 0 && t.evidence.playback.every(p => p.natural && p.clockAdvanced && !p.interrupted && p.end > p.start)
    finish({ status: okay && !t.evidence.issues.length ? 'baseline-complete' : 'unconfirmed', overlapMs: 0, reason: okay ? '單項基線完成；等待真人確認' : '基線音訊或生命週期不足' })
    if (okay && !t.evidence.issues.length) status.textContent = '單項基線完成；請填真人聽辨'
  }
}
function observe(event: AudioEvent): void {
  log({ ...event, kind: event.kind })
  const t = active
  if (!t || !event.token?.startsWith(t.id + ':')) return
  if (event.token === token(t, 'replay')) {
    if (event.kind === 'playback-ended') { replayEnded = !!event.playback?.natural && !!event.playback.clockAdvanced && !event.playback.interrupted; settleReplay() }
    return
  }
  if (t.result) { log({ kind: 'late-observation', caseId: t.id, event: event.kind }); return }
  if (event.kind === 'capture-start') { t.evidence.capture = { start: event.at, end: event.at }; status.textContent = '正在錄音：請念「一、二、三、四、五」' }
  else if (event.kind === 'capture-stop' && t.evidence.capture) t.evidence.capture.end = event.at
  else if (event.kind === 'capture-ended') t.captureEnded = true
  else if (event.kind === 'capture-bytes') t.hostBytes = event.bytes ?? 0
  else if (event.kind === 'playback-running' && event.sourceId) { t.activeSources.add(event.sourceId); status.textContent = '正在播放日文；錄音時請同時念數字' }
  else if (event.kind === 'playback-ended' && event.playback && event.sourceId) { t.evidence.playback.push(event.playback); t.endedSources.add(event.sourceId) }
  else if (event.kind === 'audio-issue') t.evidence.issues.push(event.reason ?? 'Audio lifecycle issue')
  if ((t.mode === 'record-say' || t.mode === 'say-record') && (event.kind === 'capture-start' || event.kind === 'playback-running')) {
    const next = nextOperation(t.mode, event.kind, t.second)
    if (next) { t.second = true; request(next) }
  }
  check()
}
function settleReplay(): void {
  if (!replayDone || !replayEnded) return
  clearTimeout(timer); replayBusy = false; if (active) active.replayVerified = true; detail.textContent = '回放已自然結束。請填聽辨結果。'; render()
}
function trace(message: string): void {
  for (const line of message.split('\n')) {
    if (!line.startsWith('COAMI25|')) continue
    const record: unknown = JSON.parse(line.slice(8))
    if (!record || typeof record !== 'object') throw Error('Malformed MOD trace')
    const r = record as Record<string, unknown>
    log({ kind: 'mod-trace', record: r })
    if (r.kind === 'ready') { ready = true; status.textContent = '就緒：先做兩項基線，再測兩種啟動順序'; render(); continue }
    const t = active, op = r.op
    if (!t || (op !== 'record' && op !== 'say' && op !== 'replay')) continue
    if (r.kind === 'called') {
      if (!t.requested.has(op) || !Number.isInteger(r.seq) || Number(r.seq) <= lastSequence) { t.evidence.issues.push('Uncorrelated MOD call'); continue }
      lastSequence = Number(r.seq); t.sequences[op] = Number(r.seq)
    } else if (r.kind === 'terminal') {
      if (r.seq !== t.sequences[op]) { t.evidence.issues.push('Mismatched MOD terminal'); continue }
      if (op === 'replay') { replayDone = r.success === true; settleReplay(); continue }
      if (t.result) { log({ kind: 'late-terminal', caseId: t.id, op }); continue }
      t.done.add(op)
      if (op === 'record') { t.evidence.recordDone = true; t.evidence.recordBytes = typeof r.bytes === 'number' ? r.bytes : 0 }
      else { t.evidence.sayDone = true; t.evidence.saySuccess = r.success === true }
      if (r.success !== true) t.evidence.issues.push(`${op} failed: ${String(r.reason ?? 'empty result')}`)
      check()
    }
  }
}
async function verifyRuntime(): Promise<Uint8Array> {
  const response = await fetch('/runtime-provenance.json', { cache: 'no-store' })
  if (!response.ok) throw Error('缺少 runtime；請先執行 prepare:poc')
  const p = await response.json() as { sourceCommit: string; sha256: Record<string, string>; mod: { sha256: string } }
  if (p.sourceCommit !== 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322' || !p.mod?.sha256) throw Error('Runtime provenance mismatch')
  let mod: Uint8Array | null = null
  for (const [url, expected] of [['/simulator/mc.js', p.sha256['mc.js']], ['/simulator/mc.wasm', p.sha256['mc.wasm']], ['/coami-mod.xsa', p.mod.sha256]]) {
    const r = await fetch(url!, { cache: 'no-store' }); if (!r.ok) throw Error(`Missing ${url}`)
    const bytes = await r.arrayBuffer(), digest = await crypto.subtle.digest('SHA-256', bytes)
    const sha256 = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
    if (sha256 !== expected) throw Error(`Served bytes mismatch: ${url}`)
    log({ kind: 'served-asset', url, bytes: bytes.byteLength, sha256 })
    if (url === '/coami-mod.xsa') mod = new Uint8Array(bytes)
  }
  if (!mod) throw Error('Missing MOD'); return mod
}
el<HTMLButtonElement>('start').onclick = async () => {
  el<HTMLButtonElement>('start').disabled = true
  try {
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder || !globalThis.AudioContext) throw Error('Browser 麥克風／MediaRecorder／WebAudio 不可用')
    audio = new ObservedAudio(op => !active ? null : op === 'record' ? token(active, 'record') : replayBusy ? token(active, 'replay') : active.requested.has('say') ? token(active, 'say') : null, observe)
    await audio.unlock()
    status.textContent = '正在載入固定版本模擬器…'
    const bytes = await verifyRuntime(), mod = { name: 'coami-mod.xsa', bytes, size: bytes.length, storage: 'memory' as const }
    engine = new SimulatorEngine({ viewport: el<HTMLCanvasElement>('viewport'), screen: el<HTMLCanvasElement>('screen'), runtimeBaseUrl: new URL('/simulator/', location.href).href,
      modStorage: { async loadInstalledMod() { return mod }, async clearInstalledMod() {}, async saveInstalledMod(next: typeof mod) { return next } },
      onTrace: trace, onError: (e: unknown) => { status.textContent = String(e); locked = true; render() }, onReady: () => log({ kind: 'engine-ready' }),
    }) as unknown as Engine
    engine.audioInBridge = audio.input; engine.audioOutBridge = audio.output
    engine.hostBridge.AudioIn = audio.input; engine.hostBridge.AudioOut = audio.output
    await engine.start()
  } catch (error) { status.textContent = String(error); locked = true; render() }
}
function run(mode: Mode): void {
  const id = crypto.randomUUID()
  active = { id, mode, evidence: { expectedSayToken: `${id}:say`, capture: null, recordBytes: 0, recordDone: false, sayDone: false, saySuccess: false, playback: [], issues: [] }, requested: new Set(), sequences: {}, done: new Set(), second: false, captureEnded: false, activeSources: new Set(), endedSources: new Set(), hostBytes: 0, result: null, humanTts: 'unconfirmed', humanRecording: 'unconfirmed', note: '', replayVerified: false }
  trials.push(active); log({ kind: 'case-start', caseId: id, mode }); render()
  timer = setTimeout(() => { if (!active?.result) finish({ status: 'unconfirmed', overlapMs: 0, reason: '30 秒 timeout' }) }, 30_000)
  status.textContent = '開始測試；請準備念數字'; detail.textContent = '錄音為五秒；兩項操作由實際生命週期事件觸發，不以等待 Promise 取代。'
  request(mode === 'baseline-say' || mode === 'say-record' ? 'say' : 'record')
}
for (const mode of ['baseline-record', 'baseline-say', 'record-say', 'say-record'] as const) el<HTMLButtonElement>(mode === 'baseline-record' ? 'record-baseline' : mode === 'baseline-say' ? 'say-baseline' : mode).onclick = () => run(mode)
el<HTMLButtonElement>('replay').onclick = () => {
  if (!active) return
  replayBusy = true; replayDone = false; replayEnded = false; render(); request('replay')
  timer = setTimeout(() => { if (replayBusy) { locked = true; replayBusy = false; detail.textContent = '回放結果未知；請儲存後重新載入'; render() } }, 30_000)
}
el<HTMLButtonElement>('save').onclick = async () => {
  if (!active) return
  const tester = el<HTMLInputElement>('tester').value.trim()
  if (!tester) { detail.textContent = '請先填驗證者名稱／角色'; return }
  if (el<HTMLSelectElement>('human-recording').value === 'heard' && !active.replayVerified) { detail.textContent = '請先回放本筆錄音，等待自然結束後再確認聽辨。'; return }
  active.humanTts = el<HTMLSelectElement>('human-tts').value; active.humanRecording = el<HTMLSelectElement>('human-recording').value; active.note = el<HTMLTextAreaElement>('note').value
  log({ kind: 'human-verdict', caseId: active.id, tts: active.humanTts, recording: active.humanRecording, note: active.note })
  const runs = trials.map(t => ({ id: t.id, mode: t.mode, result: t.result, recordBytes: t.evidence.recordBytes, tts: t.humanTts, recording: t.humanRecording, note: t.note }))
  try {
    const response = await fetch('/__e025/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: 1, tester, browser: navigator.userAgent, equipment: el<HTMLInputElement>('equipment').value, sessionId, runs, events }) })
    if (!response.ok) throw Error(await response.text())
    detail.textContent = '真人判定與 metadata 已保存；沒有保存原始音訊。'; render()
  } catch (error) { detail.textContent = `保存失敗：${String(error)}` }
}
window.addEventListener('beforeunload', () => { clearTimeout(timer); engine?.dispose(); audio?.dispose() })
render()
