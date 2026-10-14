import {spawn} from 'node:child_process'
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
const origin=process.env.E021_URL??'http://127.0.0.1:5191'
const directory=await mkdtemp(path.join(tmpdir(),'e021-browser-'))
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0',`--user-data-dir=${directory}`,'about:blank'],{stdio:['ignore','ignore','pipe']})
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
let page,cdp
const results=[],browserErrors=[]
const evidencePath=new URL('../../evidence/runtime-automated.json',import.meta.url)
let previous;try{previous=JSON.parse(await readFile(evidencePath,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
const previousAttempts=previous?[...(previous.previousAttempts??[]),Object.fromEntries(Object.entries(previous).filter(([k])=>k!=='previousAttempts'))]:[]
const persist=async runnerError=>writeFile(evidencePath,JSON.stringify({experiment:'E021',synthetic:true,evidenceKind:'automated Chrome CDP; NOT human or hardware',capturedAt:new Date().toISOString(),origin,results,browserErrors,previousAttempts,runnerError,human:'NOT_EXECUTED',hardware:'OUT_OF_SCOPE'},null,2)+'\n')
try {
 const endpoint=await new Promise((resolve,reject)=>{
  let text='';const timeout=setTimeout(()=>reject(new Error('Chrome startup timeout')),15000)
  chrome.stderr.on('data',chunk=>{text+=chunk;const match=text.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timeout);resolve(match[1])}})
  chrome.on('error',reject);chrome.on('exit',code=>reject(new Error(`Chrome exited ${code}`)))
 })
 const http=new URL(endpoint);http.protocol='http:'
 const targets=await (await fetch(new URL('/json/list',http))).json();page=targets.find(t=>t.type==='page')
 const socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject})
 let serial=0;let lifecycleEvidence;const pending=new Map()
 socket.onmessage=({data})=>{const result=JSON.parse(data);if(result.method==='Runtime.bindingCalled'&&result.params.name==='e021LifecycleEvidence')lifecycleEvidence=JSON.parse(result.params.payload);if(result.method==='Runtime.consoleAPICalled'){const text=result.params.args.map(v=>v.value??v.description??'').join(' ');if(text.includes('[main] error'))console.log('BROWSER',text)}if(result.method==='Runtime.exceptionThrown'){const description=result.params.exceptionDetails?.exception?.description??result.params.exceptionDetails?.text;browserErrors.push(description);console.log('BROWSER exception',description)}if(!result.id)return;const entry=pending.get(result.id);if(!entry)return;pending.delete(result.id);clearTimeout(entry.timeout);result.error?entry.reject(new Error(JSON.stringify(result.error))):entry.resolve(result.result)}
 cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject,timeout:setTimeout(()=>{pending.delete(id);reject(new Error(`${method} timeout`))},30000)});socket.send(JSON.stringify({id,method,params}))})
 const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value}
 const wait=async(expression,limit=15000)=>{const started=Date.now();while(Date.now()-started<limit){if(await evaluate(expression))return;await pause(50)}throw new Error(`wait timeout: ${expression}`)}
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
 await cdp('Page.navigate',{url:origin});await wait('!!window.e021')
 const scenarios=await evaluate('window.e021.scenarios')
 const execute=async(id,label=id)=>{
  await evaluate(`void window.e021.run(${JSON.stringify(id)})`)
  await wait(`['complete','error'].includes(window.e021.snapshot().runs.at(-1)?.status)`)
  const record=await evaluate('window.e021.snapshot().runs.at(-1)')
  const scenario=scenarios.find(s=>s.id===id)
  const actual=record.events.map(v=>({motion:v.event.motion,index:v.meta.sampleId}))
  let verdict=JSON.stringify(actual)===JSON.stringify(scenario.expected)&&record.dropped===0?'PASS':'FAIL'
  if(['interrupt','native-failure'].includes(scenario.kind)){if(record.status!=='error'||!record.reason.includes('injected'))verdict='FAIL'}
  else if(record.status!=='complete')verdict='FAIL'
  if(scenario.kind==='cooldown'&&verdict==='PASS'){
   const first=record.events[0].event.ticks,bound=record.raw[22].meta.sampleTicks
   if(bound>=first+1500)verdict='INDETERMINATE'
   if(record.events[1].event.ticks-first<1500)verdict='FAIL'
  }
  results.push({id:label,verdict,actual,record});console.log(`${label}: ${verdict} raw=${record.raw.length} events=${actual.map(v=>v.motion).join(',')} ${record.reason}`)
  await persist();await cdp('HeapProfiler.collectGarbage')
 }
 for(const scenario of scenarios.filter(s=>!process.env.E021_ONLY||s.id===process.env.E021_ONLY))await execute(scenario.id)
 for(const id of (process.env.E021_ONLY?[]:['fallenForward','fallenBackward','fallenLeft','fallenRight','upsideDown','shake']))await execute(id,`${id}-independent-2`)
 for(const [id,index,recovery] of (process.env.E021_ONLY?[]:[['fallenLeft',0,'fallenLeft-two'],['fallenLeft',5,'fallenLeft-two'],['shake',12,'shake-nine'],['fallenLeft',6,'fallenLeft-two']])){
  await evaluate(`void window.e021.run(${JSON.stringify(id)})`)
  if(index)await wait(`window.e021.snapshot().runs.at(-1).raw.length>=${index}`)
  await evaluate('window.e021.stop()')
  const old=await evaluate('window.e021.snapshot().runs.at(-1)')
  await execute(recovery,`restart-after-${id}-${index}`)
  const preserved=await evaluate(`window.e021.snapshot().runs.find(r=>r.run===${old.run})`)
  results.push({id:`stop-${id}-${index}`,verdict:old.status==='stopped'&&JSON.stringify(old)===JSON.stringify(preserved)?(old.raw.length===index?'PASS':'INDETERMINATE'):'FAIL',record:preserved})
 }
 if(!process.env.E021_ONLY){
  await evaluate('void window.e021.run("fallenLeft")');await wait('window.e021.snapshot().runs.at(-1).raw.length>=1')
  await evaluate('window.__e021SetTimeout=window.setTimeout;window.setTimeout=()=>0')
  await wait('window.e021.snapshot().runs.at(-1).status==="error"')
  const stalled=await evaluate('window.e021.snapshot().runs.at(-1)');await evaluate('window.setTimeout=window.__e021SetTimeout;delete window.__e021SetTimeout')
  results.push({id:'page-watchdog',verdict:stalled.reason.includes('1000ms')?'PASS':'FAIL',record:stalled});await persist()
  await cdp('Fetch.enable',{patterns:[{urlPattern:'*runtime-provenance.json*',requestStage:'Request'}]})
  await evaluate('void window.e021.run("upright")');await wait('window.e021.snapshot().runs.at(-1).status==="error"')
  const timedOut=await evaluate('window.e021.snapshot().runs.at(-1)');await cdp('Fetch.disable')
  results.push({id:'page-initialization-timeout',verdict:timedOut.reason.includes('5 seconds')&&timedOut.raw.length===0?'PASS':'FAIL',record:timedOut});await persist()
  await evaluate('void window.e021.run("fallenLeft")');await wait('window.e021.snapshot().runs.at(-1).raw.length>=1')
  const other=await cdp('Target.createTarget',{url:'about:blank',background:false});await cdp('Target.activateTarget',{targetId:other.targetId});await pause(250)
  const hidden=await evaluate('document.hidden'),hiddenRecord=await evaluate('window.e021.snapshot().runs.at(-1)')
  results.push({id:'page-hidden',verdict:hidden?(hiddenRecord.status==='stopped'&&hiddenRecord.reason==='page hidden'?'PASS':'FAIL'):'INDETERMINATE',record:hiddenRecord,condition:{documentHidden:hidden}})
  await cdp('Target.closeTarget',{targetId:other.targetId});await cdp('Target.activateTarget',{targetId:page.id});await evaluate('window.e021.stop()');await persist()
  await cdp('Runtime.addBinding',{name:'e021LifecycleEvidence'})
  await evaluate('void window.e021.run("fallenLeft")');await wait('window.e021.snapshot().runs.at(-1).raw.length>=1')
  await evaluate('window.addEventListener("pagehide",()=>{const value=JSON.stringify({event:"pagehide",record:window.e021.snapshot().runs.at(-1)});sessionStorage.setItem("e021-pagehide-probe",value);window.e021LifecycleEvidence(value)},{once:true})')
  await cdp('Page.navigate',{url:`${origin}/?pagehide-check`});await wait('location.search.includes("pagehide-check")&&document.readyState==="complete"&&!!window.e021&&window.e021.snapshot().runs.length===0');
  lifecycleEvidence??=await evaluate('JSON.parse(sessionStorage.getItem("e021-pagehide-probe"))')
  results.push({id:'pagehide-navigation',verdict:lifecycleEvidence?.event==='pagehide'&&lifecycleEvidence.record.status==='stopped'?'PASS':'FAIL',record:lifecycleEvidence?.record});await persist()
  await execute('fallenLeft-two','fresh-after-pagehide')
 }
 await cdp('Page.navigate',{url:`${origin}/?missing-provider`});await wait('location.search.includes("missing-provider")&&document.readyState==="complete"&&!!window.e021&&window.e021.snapshot().runs.length===0');await evaluate('void window.e021.run("upright")');await wait('window.e021.snapshot().runs.at(-1).status==="error"')
 const missing=await evaluate('window.e021.snapshot().runs.at(-1)');results.push({id:'missing-provider',verdict:missing.events.length===0&&missing.reason.includes('missing')?'PASS':'FAIL',record:missing})
 await cdp('Page.navigate',{url:origin});await wait('location.search===""&&document.readyState==="complete"&&!!window.e021&&window.e021.snapshot().runs.length===0');await execute('fallenForward','visible-final')
 const image=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
 await writeFile(new URL('../../evidence/runtime-visible.png',import.meta.url),Buffer.from(image.data,'base64'))
 await persist()
 console.log(`SUMMARY ${results.length} runs ${results.filter(r=>r.verdict==='FAIL').length} FAIL`)
 if(results.some(r=>r.verdict==='FAIL'))process.exitCode=1
 socket.close()
}catch(error){await persist(String(error));throw error}finally {chrome.kill('SIGTERM');await pause(300);await rm(directory,{recursive:true,force:true})}
