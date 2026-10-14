import {SimulatorEngine} from '../generated/pinned-stack-chan/web/src/services/simulator/simulator-engine.mjs'
import {SampleInput,RunGuard} from './input.ts'
import {scenarios,getScenario,type Scenario} from './scenarios.ts'
import type {IMUEvent,Snapshot,Motion} from '../../mod/observer.ts'
import './style.css'
const el=<T extends HTMLElement>(id:string):T=>{const node=document.getElementById(id);if(!node)throw new Error(`missing ${id}`);return node as T}
const select=el<HTMLSelectElement>('scenario')
for(const scenario of scenarios){const option=document.createElement('option');option.value=scenario.id;option.textContent=scenario.label;select.append(option)}
select.value='fallenForward'
type Raw={meta:Snapshot;sample:{accelerometer:{x:number;y:number;z:number}}}
type EventRecord={kind:'event';event:IMUEvent;meta:Snapshot;counts:Record<Motion,number>}
type RunRecord={run:number;scenario:string;caseId:number;synthetic:true;startedAt:string;status:string;reason:string;raw:Raw[];events:EventRecord[];records:Record<string,unknown>[];dropped:number;provenance:unknown}
const guard=new RunGuard(),runs:RunRecord[]=[]
let current:RunRecord|undefined,input:SampleInput|undefined,engine:SimulatorEngine|undefined
let startupTimer:ReturnType<typeof setTimeout>|undefined,watchdog:ReturnType<typeof setInterval>|undefined
let loadedKey='',traceBuffer=''
const digest=async(bytes:ArrayBuffer):Promise<string>=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('')
function render():void {
 if(!current)return
 el('state').textContent=current.status;el('reason').textContent=current.reason||'synthetic · 由 SDK 每 100ms 拉取樣本'
 el('progress').textContent=`${current.raw.length} / ${getScenario(current.scenario).samples.length}`
 el('identity').textContent=`${current.run} / ${current.caseId}`
 const last=current.events.at(-1);el('last').textContent=last?.event.motion??'—';el('total').textContent=String(current.events.length)
 el('counts').textContent=last?JSON.stringify(last.counts,null,2):'尚無事件'
 el<HTMLButtonElement>('stop').disabled=!['initializing','active'].includes(current.status)
}
function clearRuntime():void {if(startupTimer)clearTimeout(startupTimer);if(watchdog)clearInterval(watchdog);startupTimer=undefined;watchdog=undefined;const previous=engine;engine=undefined;if(previous)queueMicrotask(()=>previous.dispose())}
function stop(reason='operator stop'):void {input?.stop(reason);if(current&&['initializing','active'].includes(current.status)){current.status='stopped';current.reason=reason}guard.cancel();clearRuntime();render()}
function fail(reason:string):void {input?.fail(reason);if(current){current.status='error';current.reason=reason}guard.cancel();clearRuntime();render()}
function append(value:Record<string,unknown>):void {
 if(!current)return
 if(current.records.length>=100000){current.dropped++;fail('evidence buffer limit exceeded');return}
 current.records.push(value);const row=document.createElement('li');row.textContent=JSON.stringify(value);el('events').prepend(row)
 while(el('events').children.length>45)el('events').lastElementChild?.remove()
}
function ingest(message:string,run:number):void {
 if(!guard.valid(run)||!current||!input)return
 traceBuffer+=message.endsWith('\n')?message:`${message}\n`
 let end:number
 while((end=traceBuffer.indexOf('\n'))>=0){
  const line=traceBuffer.slice(0,end).trim();traceBuffer=traceBuffer.slice(end+1)
  if(line.includes('[IMU] sample error')&&input.state==='active'){fail(line);return}
  if(!line.startsWith('COAMI21|')){append({source:'runtime',kind:'trace',line});continue}
  try {
   const parsed:unknown=JSON.parse(line.slice(8));if(!parsed||typeof parsed!=='object')throw new Error('invalid trace')
   const value=parsed as Record<string,unknown>
   if(value.kind==='ready'){input.ready();current.status='active';if(startupTimer)clearTimeout(startupTimer);startupTimer=undefined}
   else if(value.kind==='unavailable'||value.kind==='error'){fail(String(value.reason));return}
   else if(value.kind==='raw'){
    const raw=value as unknown as Raw
    if(raw.meta.run!==run||raw.meta.caseId!==current.caseId||raw.meta.sampleId!==current.raw.length+1)throw new Error('raw identity/order mismatch')
    current.raw.push({meta:raw.meta,sample:raw.sample})
   } else if(value.kind==='event') {
    const record=value as unknown as EventRecord,raw=current.raw.at(-1)
    if(!raw||record.meta.run!==run||record.meta.caseId!==current.caseId||record.meta.sampleId!==raw.meta.sampleId||record.meta.sampleTicks!==raw.meta.sampleTicks)throw new Error('MOD raw correlation mismatch')
    if(record.event.kind!=='imu'||record.event.ticks>raw.meta.sampleTicks)throw new Error('MOD Event clock mismatch')
    const old=current.events.at(-1)?.counts
    const keys:Motion[]=['shake','fallenForward','fallenBackward','fallenLeft','fallenRight','upsideDown']
    if(!keys.includes(record.event.motion)||keys.some(k=>record.counts[k]!==((old?.[k]??0)+(k===record.event.motion?1:0))))throw new Error('MOD received counts mismatch')
    current.events.push(record)
   }
   append({source:value.kind==='raw'?'SDK-driver':value.kind==='clock'?'SDK-platform':'MOD',...value})
  }catch(error){fail(String(error));return}
 }
 if(traceBuffer.length>32768)fail('trace line limit exceeded')
 render()
}
async function verify(signal:AbortSignal):Promise<{bytes:Uint8Array;provenance:unknown}> {
 const response=await fetch('/runtime-provenance.json',{cache:'no-store',signal});if(!response.ok)throw new Error('runtime provenance missing; run prepare:poc')
 const provenance=await response.json() as {sourceCommit:string;patchSha256:string;sha256:Record<string,string>;mod:{sha256:string}}
 if(provenance.sourceCommit!=='b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'||!provenance.patchSha256||!provenance.mod?.sha256)throw new Error('provenance invalid')
 for(const file of ['mc.js','mc.wasm']) {const asset=await fetch(`/simulator/${file}`,{cache:'no-store',signal});if(!asset.ok||await digest(await asset.arrayBuffer())!==provenance.sha256[file])throw new Error(`served ${file} hash mismatch`)}
 const key=`${provenance.patchSha256}:${provenance.sha256['mc.js']}:${provenance.sha256['mc.wasm']}`
 if(loadedKey&&loadedKey!==key)throw new Error('runtime changed; reload page');loadedKey=key
 const mod=await fetch('/coami-mod.xsa',{cache:'no-store',signal});if(!mod.ok)throw new Error('MOD missing')
 const buffer=await mod.arrayBuffer();if(await digest(buffer)!==provenance.mod.sha256)throw new Error('served MOD hash mismatch')
 return {bytes:new Uint8Array(buffer),provenance}
}
async function runScenario(id:string):Promise<void> {
 stop('replaced by fresh runtime')
 const scenario:Scenario=getScenario(id);select.value=id
 const {run,signal}=guard.begin();traceBuffer='';el('events').replaceChildren()
 current={run,scenario:id,caseId:scenario.caseId,synthetic:true,startedAt:new Date().toISOString(),status:'initializing',reason:'',raw:[],events:[],records:[],dropped:0,provenance:null};runs.push(current)
 const source=new SampleInput(run,scenario,()=>queueMicrotask(()=>{
  if(!guard.valid(run)||!current)return
  if(source.state==='error'){fail(source.reason);return}
  if(source.state==='complete'){current.status='complete';current.reason=source.reason;guard.cancel();clearRuntime()}
  render()
 }))
 input=source
 startupTimer=setTimeout(()=>{if(guard.valid(run))fail('initialization exceeded 5 seconds')},5000)
 watchdog=setInterval(()=>{if(guard.valid(run))source.watchdog()},200)
 render()
 try {
  const {bytes,provenance}=await verify(signal);if(!guard.valid(run))return
  current.provenance=provenance;el('provenance').textContent=JSON.stringify(provenance,null,2)
  const mod={name:'coami-mod.xsa',bytes,size:bytes.length,storage:'memory' as const}
  const created=new SimulatorEngine({viewport:el<HTMLCanvasElement>('viewport'),screen:el<HTMLCanvasElement>('screen'),runtimeBaseUrl:new URL('/simulator/',location.href).href,
   imuBridge:new URLSearchParams(location.search).has('missing-provider')?undefined:source,
   modStorage:{async loadInstalledMod(){return mod},async saveInstalledMod(){return mod},async clearInstalledMod(){}},
   onTrace:(message:string)=>ingest(message,run),onError:(error:unknown)=>{if(guard.valid(run))fail(String(error))}})
  engine=created;await created.start();if(!guard.valid(run))created.dispose()
 }catch(error){if(guard.valid(run))fail(String(error))}
}
el('run').addEventListener('click',()=>{void runScenario(select.value)})
el('restart').addEventListener('click',()=>{void runScenario(current?.scenario??select.value)})
el('stop').addEventListener('click',()=>stop())
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('page hidden')})
window.addEventListener('pagehide',()=>stop('pagehide'))
const snapshot=():object=>JSON.parse(JSON.stringify({experiment:'E021',synthetic:true,evidenceKind:'operator must distinguish human and automated input',capturedAt:new Date().toISOString(),runs})) as object
el('export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='e021-imu-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)})
// Automation uses the same run/stop entrypoints as buttons. No Event injection API.
;(window as typeof window&{e021:object}).e021={run:runScenario,stop,snapshot,scenarios:scenarios.map(s=>({id:s.id,kind:s.kind,expected:s.expected}))}
