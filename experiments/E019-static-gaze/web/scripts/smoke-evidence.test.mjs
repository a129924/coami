import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {beginSmokeEvidence} from './smoke-evidence.mjs'
test('an aborted repeat run replaces the latest report without reusing old PASS or screenshots',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'gaze-evidence-'));try{
  const baseline=JSON.stringify({status:'FAIL',runId:'historical'})
  await writeFile(path.join(root,'runtime-automated.json'),baseline)
  await writeFile(path.join(root,'runtime-smoke-latest.json'),JSON.stringify({status:'PASS',cases:[{screenshot:'old.png'}]}))
  const run=await beginSmokeEvidence(root)
  let latest=JSON.parse(await readFile(path.join(root,'runtime-smoke-latest.json'),'utf8'));assert.equal(latest.status,'RUNNING');assert.deepEqual(latest.cases,[])
  await run.save({status:'FAIL',error:'startup rejected',cases:[]})
  latest=JSON.parse(await readFile(path.join(root,'runtime-smoke-latest.json'),'utf8'));assert.equal(latest.status,'FAIL');assert.equal(latest.error,'startup rejected');assert.deepEqual(latest.cases,[])
  assert.equal(await readFile(path.join(root,'runtime-automated.json'),'utf8'),baseline)
  assert.deepEqual(JSON.parse(await readFile(path.join(run.directory,'report.json'),'utf8')),latest)
 }finally{await rm(root,{recursive:true,force:true})}
})
