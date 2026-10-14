import {createHash} from 'node:crypto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,cp,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {verifyModSources,verifyPublicInputs} from './public-inputs.mjs'
test('current source edits, forged provenance and modified served mesh are rejected',async()=>{
 const fixture=await mkdtemp(path.join(tmpdir(),'gaze-public-'));const web=path.join(fixture,'web');try{
  await mkdir(web);await mkdir(path.join(fixture,'mod'))
  for(const f of ['mod.ts','gaze-control.ts'])await cp(new URL('../../mod/'+f,import.meta.url),path.join(fixture,'mod',f))
  await cp(new URL('../generated/public/',import.meta.url),path.join(web,'generated/public'),{recursive:true})
  await verifyPublicInputs(web)
  const file=path.join(fixture,'mod/mod.ts');const original=await readFile(file);await writeFile(file,'modified logic')
  await assert.rejects(verifyModSources(web),/MOD source mismatch/);await assert.rejects(verifyPublicInputs(web),/MOD source mismatch/);await writeFile(file,original)
  const mp=path.join(web,'generated/public/mod-provenance.json');const saved=await readFile(mp);const wrong=JSON.parse(saved);wrong.sources['mod.ts']='forged';await writeFile(mp,JSON.stringify(wrong));await assert.rejects(verifyPublicInputs(web),/MOD provenance mismatch/);await writeFile(mp,saved)
  for(const name of ['mc.js','mc.wasm']){
   const f=path.join(web,'generated/public/simulator',name),original=await readFile(f);const rp=path.join(web,'generated/public/runtime-provenance.json'),saved=await readFile(rp);const forged=JSON.parse(saved);
   const changed=Buffer.from('forged executable');await writeFile(f,changed);forged.sha256[name]=createHash('sha256').update(changed).digest('hex');await writeFile(rp,JSON.stringify(forged));
   await assert.rejects(verifyPublicInputs(web),/runtime mismatch/);await writeFile(f,original);await writeFile(rp,saved)
  }
  await writeFile(path.join(web,'generated/public/simulator/assets/case/v1/shell.stl'),'modified mesh');await assert.rejects(verifyPublicInputs(web),/mesh mismatch/)
 }finally{await rm(fixture,{recursive:true,force:true})}
})
