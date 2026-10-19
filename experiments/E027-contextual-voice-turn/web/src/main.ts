import './style.css'
import { BrowserRuntime } from './browser-runtime.ts'
const app=document.querySelector<HTMLDivElement>('#app')!
app.innerHTML=`<main><header><span>E027 · 成人繁中測試</span><h1>你說一句，我回一句。</h1><p>先完成兩句中文聽辨，再進行情境對照。聲音由 AI 產生。</p></header><section class="workspace"><div class="robot"><canvas id="viewport"></canvas><canvas id="screen" hidden></canvas></div><aside><button id="open">開啟夥伴與音訊</button><p id="state" role="status">尚未開啟</p><fieldset><legend>先確認中文聲音</legend><button id="a" disabled>播放招呼</button><label><input id="heardA" type="checkbox" disabled>我清楚聽到招呼內容</label><button id="c" disabled>播放釐清問題</button><label><input id="heardB" type="checkbox" disabled>我清楚聽到釐清內容</label></fieldset><fieldset><legend>說「我想要車車」</legend><select id="context"><option value="clear">桌上只有紅色玩具車</option><option value="ambiguous">桌上玩具車＋窗外真車</option></select><button id="turn" disabled>開始四秒錄音</button></fieldset><details><summary>驗證工具</summary><button id="fail">下一筆播放失敗</button><button id="download">下載本次紀錄</button><pre id="evidence"></pre></details></aside></section></main>`
const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T
const log:Record<string,unknown>[]=[]
const completed=new Set<string>()
function update(){
  get('state').textContent=`狀態：${runtime.session.state}${runtime.ready?'':' · 尚未就緒／需重新載入'}`
  const available=runtime.ready&&runtime.session.state!=='busy'&&runtime.session.state!=='unconfirmed'
  for(const id of ['a','c'])get<HTMLButtonElement>(id).disabled=!available
  get<HTMLInputElement>('heardA').disabled=!completed.has('A')
  get<HTMLInputElement>('heardB').disabled=!completed.has('B')
  get<HTMLButtonElement>('turn').disabled=!available||!get<HTMLInputElement>('heardA').checked||!get<HTMLInputElement>('heardB').checked
}
const runtime=new BrowserRuntime(event=>{
  log.push({at:new Date().toISOString(),...event})
  get('evidence').textContent=JSON.stringify(log.slice(-5),null,2)
},(mode,token)=>{
  if(runtime.session.state==='completed'&&token&&mode!=='turn')completed.add(mode)
  update()
})
get('open').onclick=()=>{
  get<HTMLButtonElement>('open').disabled=true
  void runtime.open(get<HTMLCanvasElement>('viewport'),get<HTMLCanvasElement>('screen')).catch(error=>{
    runtime.close();get('state').textContent=String(error)
  })
}
for(const [id,mode] of [['a','A'],['c','B'],['turn','turn']] as const)get(id).onclick=()=>{
  try{if(mode!=='turn'){completed.delete(mode);get<HTMLInputElement>(mode==='A'?'heardA':'heardB').checked=false}
    runtime.dispatch(mode,get<HTMLSelectElement>('context').value==='clear'?'clear':'ambiguous')}
  catch(error){get('state').textContent=String(error)}
}
for(const id of ['heardA','heardB'])get(id).onchange=()=>{
  log.push({kind:'human-precheck',phrase:id,heard:get<HTMLInputElement>(id).checked,at:new Date().toISOString()});update()
}
get('fail').onclick=()=>runtime.failNext()
get('download').onclick=()=>{
  const url=URL.createObjectURL(new Blob([log.map(v=>JSON.stringify(v)).join('\n')+'\n'],{type:'application/x-ndjson'}))
  const link=document.createElement('a');link.href=url;link.download='voice-trace.jsonl';link.click();URL.revokeObjectURL(url)
}
window.addEventListener('pagehide',()=>runtime.close())
