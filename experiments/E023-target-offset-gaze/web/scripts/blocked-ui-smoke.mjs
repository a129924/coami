/** Only validates fail-closed UI with missing pinned runtime. NOT WASM evidence. */
import {spawn} from 'node:child_process'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'
const web=fileURLToPath(new URL('../',import.meta.url)),evidence=path.resolve(web,'../evidence')
const profile=await mkdtemp(path.join(tmpdir(),'e023-ui-'))
let chrome,preview,ws;const pending=new Map();let id=0
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
try{
 preview=spawn(process.execPath,[path.join(web,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','5203','--strictPort'],{cwd:web,stdio:['ignore','pipe','pipe']})
 let previewError='';preview.stderr.on('data',chunk=>previewError+=chunk)
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('preview startup timeout')),5000);preview.once('exit',()=>{clearTimeout(timer);reject(Error('preview exited: '+previewError))});preview.once('error',reject);preview.stdout.on('data',chunk=>{output+=chunk;if(output.includes('127.0.0.1:5203')){clearTimeout(timer);resolve()}})})
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']})
 const port=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),10000);chrome.once('error',reject);chrome.stderr.on('data',chunk=>{log+=chunk;const m=log.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]))}})})
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
 ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p?.reject(Error(JSON.stringify(d.error))):p?.resolve(d.result)}})
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(pending.delete(n))reject(Error(method+' timeout'))},10000).unref()})
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
 await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:'http://127.0.0.1:5203/'})
 let state
 for(let n=0;n<100;n++){state=await evaluate(`({text:document.querySelector('#status')?.textContent,disabled:document.querySelector('#run')?.disabled,evidence:window.e023Evidence})`);if(state.evidence?.result?.state==='無法判定')break;await delay(100)}
 assert.match(state.text,/pinned runtime unavailable/);assert.equal(state.disabled,true)
 assert.equal(state.evidence.records.filter(r=>r.kind==='frame-committed').length,0)
 assert.equal(state.evidence.records.filter(r=>r.kind==='sent').length,0)
 await writeFile(path.join(evidence,'blocked-ui.json'),JSON.stringify({status:'PASS',kind:'fail-closed UI only; NOT WASM convergence',...state},null,2)+'\n')
 const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(evidence,'blocked-ui.png'),Buffer.from(shot.data,'base64'))
 console.log('PASS: actual browser blocks correction and sends zero WS/frame commands when pinned runtime missing')
}finally{
 ws?.close();chrome?.kill();preview?.kill()
 if(chrome)await Promise.race([new Promise(resolve=>chrome.once('exit',resolve)),delay(3000)])
 await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})
}
