import {ReplyWatchdog,watchOperation} from './watchdogs.ts'
import MOD_PIN from './mod-pin.json'
import HOST_PIN from '../scripts/host-pin.json'
import {watchStartup} from './startup.ts'
import './style.css'
import { SimulatorEngine } from '../generated/pinned-stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { TARGETS } from '../../mod/gaze-control.ts'
import { Ledger, type Observation } from './ledger.ts'
const get = <T extends HTMLElement>(id: string): T => { const el=document.getElementById(id); if(!el) throw Error(`Missing ${id}`); return el as T }
const runtime=get('runtime'), selected=get('selected'), coordinate=get('coordinate'), status=get('status'), events=get('events')
const operator=get<HTMLInputElement>('operator'), stable=get<HTMLInputElement>('stable')
const next=get<HTMLButtonElement>('next'), apply=get<HTMLButtonElement>('apply'), away=get<HTMLButtonElement>('away')
const results=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-result]'))
// Local observation-only surface from the pinned simulator; no robot/driver rotation writes.
type InspectionScene = { camera: { position: { set(x:number,y:number,z:number):void } };
 controls: { target: { set(x:number,y:number,z:number):void }; update():void }; setViewportControlsEnabled(enabled:boolean):void }
const ledger=new Ledger(), runId=`E020-${new Date().toISOString().replace(/[:.]/g,'-')}`
const records: {at:string;elapsedMs:number;seq:number|null;message:string}[]=[]
let engine: SimulatorEngine | undefined, ready=false, modReady=false, runtimeReady=false, pending=false, selection=0
const replyWatchdog=new ReplyWatchdog(()=>fatal(Error('MOD 2 秒內未回應；請重新載入')),()=>ledger.blocked)
let provenance: unknown, modProvenance: unknown
get('run').textContent=runId
function log(message:string):void {
 records.push({at:new Date().toISOString(),elapsedMs:performance.now(),seq:ledger.current?.seq??null,message})
 events.textContent=records.slice(-120).map(r=>`${r.elapsedMs.toFixed(0)}ms #${r.seq??'-'} ${r.message}`).join('\n')
 events.scrollTop=events.scrollHeight
}
function render():void {
 get('operation').textContent=`${runId} · 操作 #${ledger.current?.seq??'—'}`
 const target=TARGETS[selection]
 selected.textContent=target?.label??'起始準備：解除並回正'
 coordinate.textContent=target?`[${target.point.join(', ')}] m`:'僅作驗證準備，不是解除語意'
 status.textContent=ledger.blocked?'執行／證據錯誤；請下載紀錄後重新載入':ledger.status
 const locked=!ready||pending||ledger.busy||ledger.needsObservation||ledger.blocked
 next.disabled=locked; apply.disabled=locked||!stable.checked||!operator.value.trim(); away.disabled=apply.disabled
 apply.textContent=target?'設定注視':'準備起始姿勢'
 for(const button of results) button.disabled=ledger.busy||!ledger.needsObservation||!operator.value.trim()
 results[0]!.disabled ||= ledger.failed||ledger.blocked||!ledger.driver||!ledger.returned||ledger.current?.kind==='away'
}
function ingest(message:string):void {
 for(const raw of message.split('\n')) {
  const line=raw.trim();if(!line)continue
  ledger.ingest(line);log(line)
  if(line.startsWith('COAMI20|')) {
   let value: unknown;try{value=JSON.parse(line.slice(8))}catch{render();continue}
   if(typeof value==='object'&&value) {
    const v=value as Record<string,unknown>
    if(v.phase==='ready'&&v.experiment==='E020')modReady=true
    if(v.phase==='selected'&&Number.isInteger(v.selection)&&(v.selection as number)>=0&&(v.selection as number)<=TARGETS.length){selection=v.selection as number;pending=false;replyWatchdog.acknowledge()}
    if(v.phase==='begin'||v.phase==='rejected'){pending=false;replyWatchdog.acknowledge()}
    if(v.phase==='begin'){const seq=v.seq;watchOperation(()=>ledger.current?.seq===seq&&ledger.busy,()=>ledger.blocked,()=>fatal(Error('未取得觀察窗口結束；請下載紀錄後重新載入')))}
   }
  }
 }
 ready=modReady&&runtimeReady;render()
}
async function sha(bytes:ArrayBuffer):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')}
async function json(url:string):Promise<Record<string,unknown>>{
 const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error(`缺少 ${url}，請執行 npm run prepare:poc`)
 const value:unknown=await response.json();if(typeof value!=='object'||!value)throw Error(`無效 ${url}`);return value as Record<string,unknown>
}
async function start():Promise<void>{
 try{
  const p=await json('/runtime-provenance.json');provenance=p
  if(p.sourceCommit!=='b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'||typeof p.sha256!=='object'||!p.sha256)throw Error('runtime pin mismatch')
  const patch=p.sdkPatch as Record<string,unknown> | undefined
  if(patch?.patchSha256!=='af4d44e0582ca323d882d1cf0073d5f270c573d38c6c61b2d0dac01b8fec3d4d'||patch.patchedSha256!=='2b09d340448405d261736e740e98fcd82cbe8de4cae7f2e80dc28cf839024916')throw Error('SDK pitch patch provenance mismatch')
  const hashes=p.sha256 as Record<string,unknown>
  for(const name of ['mc.js','mc.wasm','assets/case/v1/shell.stl']){
   const response=await fetch(`/simulator/${name}`,{cache:'no-store'});if(!response.ok||await sha(await response.arrayBuffer())!==hashes[name])throw Error(`${name} hash mismatch`)
  }
  if(hashes['assets/case/v1/shell.stl']!==HOST_PIN['simulator/assets/case/v1/shell.stl'])throw Error('mesh pin mismatch')
  const mp=await json('/mod-provenance.json');modProvenance=mp
  const sourceHashes=mp.sources as Record<string,unknown>|undefined
  if(mp.sha256!==MOD_PIN.sha256||Object.entries(MOD_PIN.sources).some(([f,h])=>sourceHashes?.[f]!==h))throw Error('Reviewed MOD sources/archive mismatch')
  const response=await fetch('/coami-mod.xsa',{cache:'no-store'});if(!response.ok)throw Error('missing MOD')
  const buffer=await response.arrayBuffer();if(mp.experiment!=='E020'||await sha(buffer)!==mp.sha256)throw Error('MOD provenance mismatch')
  log(`verified runtime ${p.sourceCommit}; MOD ${String(mp.sha256)}`)
  const bytes=new Uint8Array(buffer), installed={name:'coami-mod.xsa',bytes,size:bytes.length,storage:'memory' as const}
  engine=new SimulatorEngine({viewport:get<HTMLCanvasElement>('viewport'),screen:get<HTMLCanvasElement>('screen'),runtimeBaseUrl:new URL('/simulator/',location.href).href,
   modStorage:{async loadInstalledMod(){return installed},async saveInstalledMod(mod){return {...mod,size:mod.bytes.length,storage:'memory' as const}},async clearInstalledMod(){}},
   onTrace:ingest,onReady:({installationStatus})=>{
    if(installationStatus!=='prepared'&&installationStatus!=='installed'){fatal(Error(`MOD install ${installationStatus}`));return}
    runtimeReady=true;ready=modReady&&runtimeReady;runtime.textContent='Pinned runtime 已核對；MOD 已載入';render()
   },onError:fatal})
  const scene=(engine as SimulatorEngine & {scene:InspectionScene}).scene
  scene.camera.position.set(0,0,200);scene.controls.target.set(0,0,0);scene.controls.update();scene.setViewportControlsEnabled(false)
  log('observation view=v2-front-eye-level camera=[0,0,200] target=[0,0,0]; robot rotation unchanged')
  await watchStartup(()=>engine!.start(),()=>ready,()=>ledger.blocked,()=>fatal(Error('30 秒內未取得 runtime + E020 MOD ready')))
 }catch(error){fatal(error)}
}
function fatal(error:unknown):void{replyWatchdog.acknowledge();ledger.blocked=true;ready=false;runtime.textContent=`無法繼續：${String(error)}`;log(String(error));render()}
function send(button:'a'|'b'|'c'):void{
 if(!engine||!ready||pending||ledger.busy||ledger.needsObservation||ledger.blocked)return
 pending=true;replyWatchdog.arm();log(`operator=${operator.value.trim()} send=${button} stable=${stable.checked}`);render()
 try{engine.pushButton(button)}catch(error){fatal(error);return}
}
next.onclick=()=>send('a')
apply.onclick=()=>{send('b');stable.checked=false;render()}
away.onclick=()=>{send('c');stable.checked=false;render()}
operator.oninput=render;stable.onchange=render
for(const button of results)button.onclick=()=>{
 const result=button.dataset.result as Observation
 if(ledger.confirm(result)){log(`人工判定 operator=${operator.value.trim()} result=${result}`);render()}
}
get('download').onclick=()=>{
 const blob=new Blob([JSON.stringify({runId,operator:operator.value.trim(),provenance,modProvenance,records,observations:ledger.observations,userAgent:navigator.userAgent},null,2)],{type:'application/json'})
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${runId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
window.addEventListener('pagehide',()=>engine?.dispose(),{once:true})
render();void start()
