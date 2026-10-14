import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,cp,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {verifyHarnessInputs,bundleHashes} from './harness-inputs.mjs'
test('reviewed harness rejects UI, ledger and HTML edits',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'gaze-harness-'))
 try{
  const pins=JSON.parse(await readFile(new URL('../src/harness-pin.json',import.meta.url),'utf8'))
  for(const file of Object.keys(pins)){const dest=path.join(root,file);await mkdir(path.dirname(dest),{recursive:true});await cp(new URL('../'+file,import.meta.url),dest)}
  assert.deepEqual(await verifyHarnessInputs(root),pins)
  for(const file of ['src/main.ts','src/ledger.ts','index.html']){const dest=path.join(root,file),saved=await readFile(dest);await writeFile(dest,'changed behavior');await assert.rejects(verifyHarnessInputs(root),/harness input mismatch/);await writeFile(dest,saved)}
  const original=bundleHashes({'assets/app.js':{type:'chunk',code:'original'}})
  assert.notDeepEqual(original,bundleHashes({'assets/app.js':{type:'chunk',code:'changed'}}))
 }finally{await rm(root,{recursive:true,force:true})}
})
