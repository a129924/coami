import {analyzeDispatches,readyForReassignment} from '../src/smoke-analysis.ts'
import {beginSmokeEvidence} from './smoke-evidence.mjs'
// Actual C/WASM browser path with automated pointers; NOT human evidence.
import {spawn} from 'node:child_process'
import {mkdtemp,mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'
const web=fileURLToPath(new URL('../',import.meta.url)), evidence=path.resolve(web,'../evidence')
const run=await beginSmokeEvidence(evidence)
const downloads=path.join(web,'generated/smoke-downloads')
let profile,chrome,transcript,report
let ws,id=0;let evaluate;const pending=new Map(),cases=[],traces=[],errors=[],logs=[]
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
try{
 profile=await mkdtemp(path.join(tmpdir(),'coami-e019-chrome-'))
 await rm(downloads,{recursive:true,force:true});await mkdir(downloads,{recursive:true})
 chrome=spawn(process.env.CHROME_EXE??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
 '--headless=new','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,
 '--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'],{stdio:['ignore','ignore','pipe']})
 const port=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),10000);chrome.once('error',error=>{clearTimeout(timer);reject(error)});chrome.stderr.on('data',chunk=>{log+=chunk;const m=log.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]))}})})
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
 ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result)}if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails);if(d.method==='Runtime.consoleAPICalled')logs.push(d.params.args.map(a=>a.value??a.preview??a.description))})
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(pending.delete(n))reject(Error(`CDP timeout ${method}`))},10000).unref()})
 evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
 await call('Page.enable');await call('Page.bringToFront');await call('Runtime.enable');await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads})
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
 await call('Page.navigate',{url:process.env.E019_URL??'http://127.0.0.1:5199/'})
 const state=()=>evaluate(`({runtime:document.querySelector('#runtime').textContent,selected:document.querySelector('#selected').textContent,status:document.querySelector('#status').textContent,blocked:document.querySelector('#next').disabled})`)
 async function until(fn,label,limit=40000){const start=Date.now();while(Date.now()-start<limit){if(await fn())return;await delay(80)}throw Error(`timeout ${label}: ${JSON.stringify(await state())}`)}
 await until(async()=>!(await state()).blocked,'runtime ready')
 await evaluate(`document.querySelector('#operator').value='automated smoke (NOT human)';document.querySelector('#operator').dispatchEvent(new Event('input'))`)
 async function select(label){for(let n=0;n<6;n++){if((await state()).selected.startsWith(label))return;await evaluate(`document.querySelector('#next').click()`);await delay(180)}throw Error(`selection ${label}`)}
 const liveRecords=async()=> (await evaluate(`document.querySelector('#events').textContent`)).split('\n').map(message=>({message:message.replace(/^\d+ms #(?:\d+|-) /,'')}))
 async function operation(button){
  const preparing=button==='apply'&&(await state()).selected.startsWith('起始準備')
  await evaluate(`document.querySelector('#stable').checked=true;document.querySelector('#stable').dispatchEvent(new Event('change'));document.querySelector('#${button}').click()`)
  await until(()=>evaluate(`!document.querySelector('[data-result="未確認"]').disabled`),'observation window',10000)
  assert.doesNotMatch((await state()).status,/錯誤|失敗/)
  if(preparing)assert.equal(analyzeDispatches(await liveRecords()).length,0,'neutral preparation lacks synchronous zero-rotation evidence')
  // Automated evidence never claims a human direction PASS.
  await evaluate(`document.querySelector('[data-result="未確認"]').click()`);await delay(180)
 }
 for(let repeat=1;repeat<=2;repeat++)for(const label of ['Robot 左','Robot 右','上','下']){
  await select('起始準備');await operation('apply');await select(label);await operation('apply')
  const screenshot=await call('Page.captureScreenshot',{format:'png'})
  const file=`automated-${label.replace('Robot ','')}-${repeat}.png`
  await writeFile(path.join(run.directory,file),Buffer.from(screenshot.data,'base64'))
  cases.push({label,repeat,state:await state(),screenshot:`smoke-runs/${run.runId}/${file}`,kind:'automated, human unconfirmed'})
 }
 for(const [first,second] of [['Robot 左','Robot 右'],['上','下']]){
  await select('起始準備');await operation('apply');await select(first);await operation('apply');await operation('away');await until(async()=>readyForReassignment(await liveRecords()),'prior motion torque-off before reassignment',10000);await select(second);await operation('apply')
  cases.push({kind:'automated clear/reassign',first,second,state:await state()})
 }
 await evaluate(`document.querySelector('#download').click()`)
 await until(async()=> (await readdir(downloads)).some(f=>f.endsWith('.json')),'export',5000)
 const file=(await readdir(downloads)).find(f=>f.endsWith('.json'));transcript=JSON.parse(await readFile(path.join(downloads,file),'utf8'))
 const begins=transcript.records.filter(r=>r.message.startsWith('COAMI19|')).map(r=>JSON.parse(r.message.slice(8))).filter(e=>e.phase==='begin')
 const failures=analyzeDispatches(transcript.records)
 assert.equal(errors.length,0);assert.ok(begins.some(e=>e.kind==='away'))
 const finalShot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(run.directory,'automated-final.png'),Buffer.from(finalShot.data,'base64'))
 report={status:failures.length?'FAIL':'PASS',failures,experiment:'E019',capturedAt:new Date().toISOString(),kind:'actual pinned WASM, automated UI operations; NOT human evidence',browser:await call('Browser.getVersion'),cases,transcript,errors}
 await run.save(report)
 console.log(JSON.stringify({status:report.status,failures,directionAttempts:8,cases:cases.length,human:'unexecuted'}))
 assert.equal(failures.length,0,'fixed acceptance criteria failed; evidence retained')
}catch(error){
 if(evaluate){try{errors.push({diagnostic:await evaluate(`({body:document.body.innerText,events:document.querySelector('#events')?.innerText})`)})}catch(diagnosticError){errors.push({diagnosticError:String(diagnosticError)})}}
 await run.save({...report,status:'FAIL',error:String(error),cases,transcript,errors,logs})
 throw error
}finally{ws?.close();chrome?.kill();await delay(200);if(profile)await rm(profile,{recursive:true,force:true})}
