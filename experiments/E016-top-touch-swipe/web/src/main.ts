import { SimulatorEngine } from './preview-runtime.ts'
import { TopTouchInput } from './top-touch-input.ts'
import { TouchFeedback } from './touch-feedback.ts'
const element = <T extends HTMLElement>(selector: string): T => {
  const value = document.querySelector<T>(selector)
  if (!value) throw new Error(`Missing UI ${selector}`)
  return value
}
const surface = element<HTMLDivElement>('#surface')
const runtimeStatus = element('#runtime')
const inputStatus = element('#input-state')
const errorStatus = element('#error')
const reset = element<HTMLButtonElement>('#reset')
const feedback = new TouchFeedback()
let session = 0
let input = new TopTouchInput(session)
let engine: SimulatorEngine | null = null
let starting = false
function refresh(): void {
  inputStatus.textContent = input.state === 'ready' ? `可操作 · session ${input.session} · 等待樣本 ${input.pending}` : `${input.state} · ${input.error || '等待 MOD'}`
  surface.dataset.ready = String(input.state === 'ready')
  errorStatus.textContent = input.error
  element('#operation').textContent = `operation ${input.operation} · 起點 ${input.initialPosition} · 目前 ${input.position} · delta ${input.position-input.initialPosition}`
  element('#forward').textContent = String(feedback.forward)
  element('#backward').textContent = String(feedback.backward)
}
function ingest(raw: string, capturedSession: number): void {
  if (capturedSession !== session) return
  for (const line of raw.split('\n').map(s => s.trim()).filter(Boolean)) {
    if (line === 'COAMI16|{"kind":"ready"}') input.setReady()
    if (line === 'COAMI16|{"kind":"unavailable"}') input.unavailable('MOD touchPanel unavailable')
    if (line.includes('[TouchPanel] sample error')) input.fail(line)
    if (feedback.ingest(line)) {
      const e = feedback.records.at(-1)!
      const count = feedback.operations.get(`${e.session}:${e.operation}`)!
      element('#latest').textContent = `session ${e.session} / operation ${e.operation}: ${e.gesture} · 本次 forward ${count.forward}, backward ${count.backward}`
      const item = document.createElement('li')
      item.textContent = line
      element('#events').prepend(item)
      while (element('#events').children.length > 100) element('#events').lastElementChild?.remove()
    }
  }
  refresh()
}
async function initialize(): Promise<void> {
  if (starting) return
  starting = true; reset.disabled = true
  const capturedSession = ++session
  feedback.start(session)
  engine?.dispose(); engine = null
  input = new TopTouchInput(session)
  input.setVisibility(document.hidden)
  runtimeStatus.textContent = '正在初始化'
  refresh()
  try {
    const response = await fetch('/coami-mod.xsa', { cache: 'no-store' })
    if (!response.ok) throw new Error('MOD archive unavailable; run npm run prepare:poc')
    const bytes = new Uint8Array(await response.arrayBuffer())
    const stored = {name:'coami-mod.xsa',bytes,size:bytes.length,storage:'memory' as const}
    const created = new SimulatorEngine({
      viewport:element<HTMLCanvasElement>('#viewport'),screen:element<HTMLCanvasElement>('#screen'),runtimeBaseUrl:new URL('/simulator/',location.href).href,
      modStorage:{async loadInstalledMod(){return stored},async saveInstalledMod(mod){return mod},async clearInstalledMod(){}},
      onStatus:({status,code})=>{if(capturedSession===session)runtimeStatus.textContent=`${status} · ${code}`},
      onTrace:line=>ingest(line,capturedSession),
      onReady:({installationStatus})=>{if(capturedSession===session)runtimeStatus.textContent=`Runtime 已啟動 · ${installationStatus}`},
      onError:error=>{if(capturedSession===session){input.fail(String(error));refresh()}},
    })
    created.hostBridge.TopTouchPanel = input
    engine = created
    await created.start()
    // Runtime ready alone cannot enable input; MOD must confirm its subscription.
    if (input.state === 'initializing') {
      await new Promise<void>((resolve,reject)=>{
        const started=input.activeTime()
        const timer=setInterval(()=>{
          if(input.state==='ready'){clearInterval(timer);resolve()}
          else if(input.state==='fault'||input.state==='unavailable'||input.activeTime()-started>30000){clearInterval(timer);reject(new Error(input.error||'MOD input readiness timeout'))}
        },50)
      })
    }
  } catch (error) { input.initializationFailed(`初始化失敗：${String(error)}`); runtimeStatus.textContent = '初始化失敗' }
  finally { starting=false;reset.disabled=false;refresh() }
}
function normalized(event: PointerEvent): number {
  const rect=surface.getBoundingClientRect()
  return (event.clientX-rect.left)/rect.width
}
function outside(event: PointerEvent): boolean {
  const r=surface.getBoundingClientRect()
  return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom
}
surface.addEventListener('pointerdown',event=>{
  if(event.button!==0)return
  if(input.down(event.pointerId,event.isPrimary,normalized(event),input.now()))surface.setPointerCapture(event.pointerId)
  refresh()
})
surface.addEventListener('pointermove',event=>{
  if(outside(event))input.cancel(event.pointerId,input.now())
  else input.move(event.pointerId,normalized(event),input.now())
  refresh()
})
for(const kind of ['pointercancel','lostpointercapture'] as const)surface.addEventListener(kind,event=>{input.cancel(event.pointerId,input.now());refresh()})
surface.addEventListener('pointerleave',event=>{input.cancel(event.pointerId,input.now());refresh()})
surface.addEventListener('pointerup',event=>{
  if(outside(event))input.cancel(event.pointerId,input.now())
  else input.up(event.pointerId,normalized(event),input.now())
  if(surface.hasPointerCapture(event.pointerId))surface.releasePointerCapture(event.pointerId)
  refresh()
})
reset.addEventListener('click',()=>{void initialize()})
element('#export').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({experiment:'E016',evidenceType:'operator-export',humanVerified:false,session,records:feedback.records},null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='e016-mod-observations.json';a.click();URL.revokeObjectURL(url)
})
setInterval(()=>{input.checkHealth(input.now());refresh()},250)
// Persisted page hides freeze this document; keep its engine for bfcache restore.
window.addEventListener('pagehide',event=>{if(event.persisted)input.pauseHealth(input.now());else engine?.dispose()})
window.addEventListener('pageshow',event=>{if(event.persisted){input.setVisibility(document.hidden);input.resumeHealth(input.now())}})
document.addEventListener('visibilitychange',()=>{input.setVisibility(document.hidden)})
void initialize()
