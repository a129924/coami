import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {verifyPreparedMod} from './run-mod.mjs'
const sha=value=>createHash('sha256').update(value).digest('hex')
test('MOD artifact requires matching clean compiler, source and archive attestation',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'e023-mod-'))
 const publicRoot=path.join(root,'web/generated/public'),dependencies={command:['npm','ci'],lockSha256:'lock',installedTreeSha256:'tree'}
 try{
  await mkdir(publicRoot,{recursive:true});await mkdir(path.join(root,'mod'))
  for(const file of ['mod.ts','protocol.ts'])await writeFile(path.join(root,'mod',file),'source')
  await writeFile(path.join(publicRoot,'coami-mod.xsa'),'archive')
  const p={hashes:{'coami-mod.xsa':sha('archive')},modBuild:{dependencies,archiveSha256:sha('archive'),sources:{'mod.ts':sha('source'),'protocol.ts':sha('source')}}}
  const save=()=>writeFile(path.join(publicRoot,'runtime-provenance.json'),JSON.stringify(p))
  await save();await verifyPreparedMod(root,{dependencies})
  await assert.rejects(verifyPreparedMod(root,{dependencies:{...dependencies,installedTreeSha256:'other'}}),/compiler attestation/)
  await writeFile(path.join(root,'mod/mod.ts'),'changed');await assert.rejects(verifyPreparedMod(root,{dependencies}),/MOD source changed/)
  await writeFile(path.join(root,'mod/mod.ts'),'source');await writeFile(path.join(publicRoot,'coami-mod.xsa'),'changed');await assert.rejects(verifyPreparedMod(root,{dependencies}),/MOD archive changed/)
 }finally{await rm(root,{recursive:true,force:true})}
})
