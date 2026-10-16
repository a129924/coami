import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,copyFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {readSourceHashes,assertSourceProvenance} from './source-provenance.mjs'
test('smoke rejects stale patch and MOD sources before browser launch and preserves accepted evidence',async()=>{
 const scratch=await mkdtemp(path.join(tmpdir(),'e021-source-attestation-'))
 let server
 try {
  const root=path.join(scratch,'experiment'),scripts=path.join(root,'web/scripts')
  for(const dir of ['runtime','mod','web/scripts','web/src','evidence'])await mkdir(path.join(root,dir),{recursive:true})
  const names=['runtime/wasm-imu.patch','mod/mod.ts','mod/observer.ts']
  for(const name of names)await writeFile(path.join(root,name),'accepted source')
  for(const name of ['runtime-smoke.mjs','smoke-verdict.mjs','source-provenance.mjs'])await copyFile(new URL(name,import.meta.url),path.join(scripts,name))
  await copyFile(new URL('../src/scenarios.ts',import.meta.url),path.join(root,'web/src/scenarios.ts'))
  const expected=await readSourceHashes(pathToFileURL(`${root}/`)),provenance={patchSha256:expected.patchSha256,mod:{sourceSha256:expected.sourceSha256}}
  assert.doesNotThrow(()=>assertSourceProvenance(provenance,expected))
  for(const invalid of [null,{}, {patchSha256:expected.patchSha256,mod:{}}])assert.throws(()=>assertSourceProvenance(invalid,expected),/source mismatch/)
  server=createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(provenance))})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const evidence=path.join(root,'evidence/runtime-automated.json');await writeFile(evidence,'accepted browser evidence')
  for(const name of names){
   await writeFile(path.join(root,name),'changed source without rebuild')
   const changed=await readSourceHashes(pathToFileURL(`${root}/`));assert.throws(()=>assertSourceProvenance(provenance,changed),/source mismatch/)
   const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(scripts,'runtime-smoke.mjs')],{env:{...process.env,E021_URL:`http://127.0.0.1:${server.address().port}`},stdio:['ignore','pipe','pipe']})
    let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);child.on('error',reject);child.on('exit',code=>resolve({code,output}))
   })
   assert.notEqual(result.code,0,name);assert.match(result.output,/runtime provenance source mismatch/,name)
   assert.equal(await readFile(evidence,'utf8'),'accepted browser evidence')
   await writeFile(path.join(root,name),'accepted source')
  }
  assert.doesNotThrow(()=>assertSourceProvenance(provenance,expected))
 }finally {if(server)await new Promise(resolve=>server.close(resolve));await rm(scratch,{recursive:true,force:true})}
})
test('every run is source-bound, with only exact pre-verification lifecycle exceptions',async()=>{
 const {assertRunProvenance}=await import('./source-provenance.mjs')
 const hashes=await readSourceHashes(),provenance={patchSha256:hashes.patchSha256,mod:{sourceSha256:hashes.sourceSha256}}
 const valid={id:'fallenLeft',record:{provenance}}
 assert.doesNotThrow(()=>assertRunProvenance([valid],hashes))
 for(const name of ['patch','mod.ts','observer.ts']){
  const stale=structuredClone(valid)
  if(name==='patch')stale.record.provenance.patchSha256='stale';else stale.record.provenance.mod.sourceSha256[name]='stale'
  assert.throws(()=>assertRunProvenance([stale],hashes),/source mismatch/)
 }
 assert.throws(()=>assertRunProvenance([{id:'fallenLeft',record:{provenance:null,raw:[],events:[]}}],hashes),/missing source provenance/)
 for(const [id,status,reason] of [['stop-fallenLeft-0','stopped','operator stop'],['page-initialization-timeout','error','initialization exceeded 5 seconds']]){
  const exception={id,record:{provenance:null,raw:[],events:[],status,reason}}
  assert.doesNotThrow(()=>assertRunProvenance([exception],hashes))
  for(const mutate of [r=>r.id='upright',r=>r.record.raw.push({}),r=>r.record.events.push({}),r=>r.record.reason='other']){
   const bad=structuredClone(exception);mutate(bad);assert.throws(()=>assertRunProvenance([bad],hashes),/missing source provenance/)
  }
 }
 const changed={...hashes,patchSha256:'changed during run'}
 assert.throws(()=>assertSourceProvenance(provenance,changed),/source mismatch/)
})
