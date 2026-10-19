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
  for(const file of ['mod.ts','protocol.ts','host.d.ts'])await writeFile(path.join(root,'mod',file),'source')
  const config=JSON.stringify({compilerOptions:{strict:true},include:['*.ts']})
  await writeFile(path.join(root,'mod/tsconfig.json'),config)
  await writeFile(path.join(publicRoot,'coami-mod.xsa'),'archive')
  const p={hashes:{'coami-mod.xsa':sha('archive')},modBuild:{dependencies,archiveSha256:sha('archive'),sources:{'mod.ts':sha('source'),'protocol.ts':sha('source'),'host.d.ts':sha('source'),'tsconfig.json':sha(config)}}}
  const save=()=>writeFile(path.join(publicRoot,'runtime-provenance.json'),JSON.stringify(p))
  await save();await verifyPreparedMod(root,{dependencies})
  p.modBuild.sources['tsconfig.json']=sha('changed configuration used to compile')
  await save();await assert.rejects(verifyPreparedMod(root,{dependencies}),/MOD source changed/)
  p.modBuild.sources['tsconfig.json']=sha(config);await save()
  await assert.rejects(verifyPreparedMod(root,{dependencies:{...dependencies,installedTreeSha256:'other'}}),/compiler attestation/)
  await writeFile(path.join(root,'mod/mod.ts'),'changed');await assert.rejects(verifyPreparedMod(root,{dependencies}),/MOD source changed/)
  await writeFile(path.join(root,'mod/mod.ts'),'source');await writeFile(path.join(publicRoot,'coami-mod.xsa'),'changed');await assert.rejects(verifyPreparedMod(root,{dependencies}),/MOD archive changed/)
 }finally{await rm(root,{recursive:true,force:true})}
})

test('MOD compiler input boundary rejects external config and extra local files',async()=>{
 const {modInputHashes}=await import('./mod-inputs.mjs')
 const root=await mkdtemp(path.join(tmpdir(),'e023-mod-inputs-')),mod=path.join(root,'mod')
 try{
  await mkdir(mod)
  for(const file of ['mod.ts','protocol.ts','host.d.ts'])await writeFile(path.join(mod,file),'source')
  const config={compilerOptions:{strict:true},include:['*.ts']}
  const save=cfg=>writeFile(path.join(mod,'tsconfig.json'),JSON.stringify(cfg))
  await save(config);const before=await modInputHashes(root)
  await save({...config,compilerOptions:{strict:false}})
  assert.notEqual((await modInputHashes(root))['tsconfig.json'],before['tsconfig.json'])
  for(const cfg of [{...config,extends:'../other.json'},{...config,references:[]},{...config,compilerOptions:{paths:{}}}]){
   await save(cfg);await assert.rejects(modInputHashes(root),/external MOD compiler/)
  }
  await save(config);await writeFile(path.join(mod,'ambient.d.ts'),'additional compiler input')
  await assert.rejects(modInputHashes(root),/compiler input set/)
 }finally{await rm(root,{recursive:true,force:true})}
})
