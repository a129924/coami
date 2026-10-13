// Actual C/WASM browser path with automated pointers; NOT human evidence.
import {spawn} from 'node:child_process'
import {mkdtemp,mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'
const web=fileURLToPath(new URL('../',import.meta.url)), evidence=path.resolve(web,'../evidence')
const profile=await mkdtemp(path.join(tmpdir(),'coami-e017-chrome-')), downloads=path.join(web,'generated/smoke-downloads')
await rm(downloads,{recursive:true,force:true});await mkdir(downloads,{recursive:true})
const chrome=spawn(process.env.CHROME_EXE??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
 '--headless=new','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,
 '--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'],{stdio:['ignore','ignore','pipe']})
let ws,id=0;let evaluate;const pending=new Map(),cases=[],traces=[],errors=[],logs=[]
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
try{
 const port=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),10000);chrome.once('error',reject);chrome.stderr.on('data',chunk=>{log+=chunk;const m=log.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]))}})})
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
 ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result)}if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails);if(d.method==='Runtime.consoleAPICalled')logs.push(d.params.args.map(a=>a.value??a.preview??a.description))})
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(pending.delete(n))reject(Error(`CDP timeout ${method}`))},10000).unref()})
 evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
 await call('Page.enable');await call('Page.bringToFront');await call('Runtime.enable');await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads})
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
 await call('Page.navigate',{url:process.env.E017_URL??'http://127.0.0.1:5187/'})
 const state=()=>evaluate(`({state:document.querySelector('#state')?.textContent,reason:document.querySelector('#reason')?.textContent,count:Number(document.querySelector('#count')?.textContent),direction:document.querySelector('#direction')?.textContent,operation:document.querySelector('#operation')?.textContent})`)
 const ready=async()=>{for(let i=0;i<250;i++){const s=await state();if(s.state==='ready')return s;if(['error','unavailable'].includes(s.state))throw Error(JSON.stringify(s));await delay(40)}throw Error('ready timeout')}
 await ready()
 const b=await evaluate(`(()=>{const b=document.querySelector('#touch').getBoundingClientRect();return {x:b.left,w:b.width,y:b.top+b.height/2}})()`)
 const mouse=(type,f,down=false)=>call('Input.dispatchMouseEvent',{type,x:b.x+b.w*f,y:b.y,button:down?'left':type==='mouseMoved'?'none':'left',buttons:down?1:0,clickCount:type==='mouseMoved'?0:1})
 const captureCase=async(name,expected,direction)=>{const s=await ready();assert.equal(s.count,expected);if(direction)assert.equal(s.direction,direction);cases.push({case:name,status:'PASS',result:s})}
 const stroke=async(direction,hold=0)=>{await ready();const before=(await state()).count,a=direction==='forwardSwipe'?.15:.85,z=1-a;await mouse('mouseMoved',a);await mouse('mousePressed',a,true);for(let i=1;i<=12;i++){await mouse('mouseMoved',a+(z-a)*i/12,true);await delay(20)}if(hold)await delay(hold);await mouse('mouseReleased',z);await captureCase(hold?'hold-release':direction,before+1,direction)}
 for(const d of ['forwardSwipe','backwardSwipe'])for(let i=0;i<3;i++)await stroke(d)
 await stroke('forwardSwipe',700);await stroke('forwardSwipe');await stroke('backwardSwipe')
 for(const [name,end] of [['tap',.5],['small-move',.54]]){const n=(await state()).count;await mouse('mouseMoved',.5);await mouse('mousePressed',.5,true);await delay(80);await mouse('mouseMoved',end,true);await mouse('mouseReleased',end);await captureCase(name,n)}
 let n=(await state()).count
 await mouse('mouseMoved',.5);await mouse('mousePressed',.5,true);await delay(80)
 await evaluate(`document.querySelector('#touch').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true}))`)
 await mouse('mouseReleased',.5);await captureCase('cancel-before-threshold',n)
 await mouse('mouseMoved',.15);await mouse('mousePressed',.15,true);await delay(80);await mouse('mouseMoved',.85,true);await delay(160)
 assert.equal((await state()).count,n+1)
 await evaluate(`document.querySelector('#touch').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true}))`)
 await mouse('mouseReleased',.85);await captureCase('cancel-after-recognition',n+1)
 await mouse('mouseMoved',.5);await mouse('mousePressed',.5,true);await delay(80);await mouse('mouseMoved',-.02,true);await mouse('mouseReleased',-.02)
 await captureCase('leave-before-threshold',n+1);await stroke('backwardSwipe')
 const exportTrace=async()=>{await evaluate(`document.querySelector('#export').click()`);for(let i=0;i<50;i++){const files=(await readdir(downloads)).filter(x=>x.endsWith('.json'));if(files.length){const f=path.join(downloads,files.at(-1));traces.push(JSON.parse(await readFile(f,'utf8')));await rm(f);return}await delay(40)}throw Error('export timeout')}
 await exportTrace();await evaluate(`document.querySelector('#restart').click()`);await captureCase('restart-reset',0);await stroke('forwardSwipe');await exportTrace()
 assert.equal(errors.length,0)
 const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(evidence,'runtime-automated.png'),Buffer.from(shot.data,'base64'))
 const report={experiment:'E017',capturedAt:new Date().toISOString(),kind:'automated CDP pointers; NOT human evidence',browser:await call('Browser.getVersion'),cases,traces,errors}
 await writeFile(path.join(evidence,'runtime-automated.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',cases:cases.length,swipes:traces.flatMap(t=>t.records).filter(r=>r.source==='MOD'&&r.kind==='event'&&String(r.event?.gesture).includes('Swipe')).length,human:'unexecuted'}))
}catch(error){if(evaluate){await delay(3000);errors.push({diagnostic:await evaluate(`({visibility:document.visibilityState,provenance:document.querySelector('#provenance')?.textContent,body:document.body.innerText,events:document.querySelector('#events')?.innerText})`)})}await writeFile(path.join(web,'generated/runtime-smoke-failure.json'),JSON.stringify({error:String(error),cases,traces,errors,logs},null,2));throw error}
finally{ws?.close();chrome.kill();await delay(200);await rm(profile,{recursive:true,force:true})}
