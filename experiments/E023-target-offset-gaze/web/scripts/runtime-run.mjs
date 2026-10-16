/** Full pinned WASM SDK and Python WS, actual rendered feedback. No fake controller. */
import {spawn} from 'node:child_process'
import {startProcess,terminate} from './process-start.mjs'
import {cleanBuild,assertBuildCurrent} from './run-build.mjs'
import {selectCases,suiteState,requireSelectedCase} from './run-cases.mjs'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const web=fileURLToPath(new URL('../',import.meta.url)),root=path.resolve(web,'..')
const runId='WASM-'+new Date().toISOString().replace(/[:.]/g,'-'),directory=path.join(root,'evidence/wasm-runs',runId)
await mkdir(directory,{recursive:true})
const profile=await mkdtemp(path.join(tmpdir(),'e023-wasm-'))
let chrome,preview,server,ws,evaluate;let id=0
const pending=new Map(),cases=[],errors=[];const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const suiteDeadline=Date.now()+35*60000
const report={runId,capturedAt:new Date().toISOString(),kind:'actual full pinned WASM SDK + Python WS + rendered quaternion; synthetic fixed targets; NOT physical/human evidence',cases,errors}
async function save(){await writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n')}

try{
 const selected=selectCases(process.env.E023_CASES)
 const build=await cleanBuild(root)
 report.build=build
 await writeFile(path.join(directory,'source-inputs.json'),JSON.stringify({capturedAt:new Date().toISOString(),sha256:build.sourcesSha256},null,2)+'\n')
 await assertBuildCurrent(root,build)
 preview=await startProcess(process.execPath,[path.join(web,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','5203','--strictPort'],web,'127.0.0.1:5203')
 server=await startProcess(path.join(root,'server/.venv/bin/python'),['-m','uvicorn','app:app','--host','127.0.0.1','--port','8230'],path.join(root,'server'),'Uvicorn running on')
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'],{stdio:['ignore','ignore','pipe']})
 const port=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome startup timeout '+log)),10000);chrome.once('error',reject);chrome.stderr.on('data',chunk=>{log+=chunk;const match=log.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]))}})})
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
 ws=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
 ws.addEventListener('message',message=>{const d=JSON.parse(message.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p?.reject(Error(JSON.stringify(d.error))):p?.resolve(d.result)}if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails)})
 const call=(method,params={})=>new Promise((resolve,reject)=>{const seq=++id;pending.set(seq,{resolve,reject});ws.send(JSON.stringify({id:seq,method,params}));setTimeout(()=>{if(pending.delete(seq))reject(Error('CDP timeout '+method))},10000).unref()})
 evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
 report.browser=await call('Browser.getVersion')
 report.provenance=JSON.parse(await readFile(path.join(web,'generated/public/runtime-provenance.json'),'utf8'))
 report.bundleSha256={}
 const {readdir}=await import('node:fs/promises')
 for(const name of await readdir(path.join(web,'dist/assets'))){report.bundleSha256[name]=createHash('sha256').update(await readFile(path.join(web,'dist/assets',name))).digest('hex')}
 for(const index of selected){
  await assertBuildCurrent(root,build)
  if(Date.now()>suiteDeadline)throw Error('suite hard timeout')
  await call('Page.navigate',{url:`http://127.0.0.1:5203/?case=${index}`})
  const startup=Date.now()+40000;let state
  while(Date.now()<startup){state=await evaluate(`({disabled:document.querySelector('#run')?.disabled,text:document.querySelector('#status')?.textContent,evidence:window.e023Evidence})`);if(state.evidence?.result.state==='無法判定'||state.disabled===false)break;await delay(100)}
  if(state.disabled!==false)throw Error('runtime startup failed: '+JSON.stringify(state))
  await evaluate(`document.querySelector('#run').click()`)
  const deadline=Date.now()+140000
  while(Date.now()<deadline){state=await evaluate('window.e023Evidence');if(['成功','失敗','無法判定'].includes(state?.result.state))break;await delay(250)}
  if(!['成功','失敗','無法判定'].includes(state?.result.state))throw Error('case timeout '+index)
  requireSelectedCase(index,state)
  await assertBuildCurrent(root,build)
  const file=`${state.case.id}.json`;await writeFile(path.join(directory,file),JSON.stringify(state,null,2)+'\n')
  const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(directory,`${state.case.id}.png`),Buffer.from(shot.data,'base64'))
  cases.push({id:state.case.id,result:state.result,file,probe:state.records.some(r=>r.kind==='probe-passed'),sdkCalls:state.records.filter(r=>r.kind==='trace'&&r.text.includes('"phase":"returned"')).length})
  console.log(JSON.stringify(cases.at(-1)));await save()
  if(state.result.state==='無法判定')throw Error('case evidence/transport blocker: '+state.result.reason)
 }
 report.state=suiteState(cases)
 if(errors.length)throw Error('browser exception(s) captured')
 await save();console.log(JSON.stringify({state:report.state,cases:cases.length,directory}))
}catch(error){
 report.state='無法判定';report.reason=String(error)
 if(evaluate){try{report.diagnostic=await evaluate(`({text:document.body.innerText,evidence:window.e023Evidence})`)}catch(diagnosticError){report.diagnosticError=String(diagnosticError)}}
 await save();console.error(report.reason);process.exitCode=1
}finally{
 ws?.close()
 await Promise.all([chrome,preview,server].map(child=>terminate(child,3000)))
 await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})
}
