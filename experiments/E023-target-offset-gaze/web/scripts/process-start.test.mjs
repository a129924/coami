import {test} from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {startProcess} from './process-start.mjs'

for(const ignoreTerm of [false,true])test(`readiness timeout waits for child cleanup (ignore SIGTERM=${ignoreTerm})`,async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'e023-start-'));let pid
 try{
  const script=`require('node:fs').writeFileSync(process.argv[1],String(process.pid)); ${ignoreTerm?"process.on('SIGTERM',()=>{});":''} setInterval(()=>{},1000)`
  await assert.rejects(startProcess(process.execPath,['-e',script,path.join(root,'pid')],root,'never-ready',{startupTimeoutMs:500,killGraceMs:100}),/process startup timeout/)
  pid=Number(await readFile(path.join(root,'pid'),'utf8'))
  assert.throws(()=>process.kill(pid,0),{code:'ESRCH'})
 }finally{
  // Prevent a regression from leaving the fixture alive after a failed assertion.
  try{pid??=Number(await readFile(path.join(root,'pid'),'utf8'));process.kill(pid,'SIGKILL')}catch{}
  await rm(root,{recursive:true,force:true})
 }
})
test('ready child is returned to caller; startup timeout is cancelled',async()=>{
 const child=await startProcess(process.execPath,['-e',"process.stdout.write('ready');setInterval(()=>{},1000)"],tmpdir(),'ready',{startupTimeoutMs:300})
 try{
  await new Promise(resolve=>setTimeout(resolve,400))
  assert.equal(child.exitCode,null);assert.equal(child.signalCode,null)
 }finally{const closed=once(child,'close');child.kill();await closed}
})
test('early exit and spawn failure reject promptly',async()=>{
 await assert.rejects(startProcess(process.execPath,['-e',"process.stderr.write('early');process.exit(7)"],tmpdir(),'ready'),/process exited: early/)
 await assert.rejects(startProcess('/nonexistent/e023-command',[],tmpdir(),'ready'),{code:'ENOENT'})
})
