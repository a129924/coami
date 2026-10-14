import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {replaceCache,clearModOutputs,assertVendorPin,rebuildModdableTools} from './build-safety.mjs'
test('restoring verified cache removes extra stale libraries',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'gaze-cache-'));try{
  const src=path.join(root,'source'),dst=path.join(root,'cache');await mkdir(src);await mkdir(dst)
  await writeFile(path.join(src,'verified.a'),'verified');await writeFile(path.join(dst,'stale.a'),'stale')
  await replaceCache(src,dst);assert.equal(await readFile(path.join(dst,'verified.a'),'utf8'),'verified');await assert.rejects(access(path.join(dst,'stale.a')))
 }finally{await rm(root,{recursive:true,force:true})}
})
test('a failed rebuild cannot leave a matching stale MOD pair or compiled modules',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'gaze-mod-'));try{
  await mkdir(path.join(root,'public'));await mkdir(path.join(root,'mod'))
  for(const f of ['coami-mod.xsa','mod-provenance.json'])await writeFile(path.join(root,'public',f),'old')
  await writeFile(path.join(root,'mod','old.js'),'old');await clearModOutputs(root)
  for(const f of ['public/coami-mod.xsa','public/mod-provenance.json','mod/old.js'])await assert.rejects(access(path.join(root,f)))
 }finally{await rm(root,{recursive:true,force:true})}
})
test('vendor gate rejects wrong checkout, gitlink or dirty files',()=>{
 assertVendorPin('pin','pin','','pin')
 for(const [head,link,status] of [['other','pin',''],['pin','other',''],['pin','pin',' M file'],['pin','pin','?? file']])assert.throws(()=>assertVendorPin(head,link,status,'pin'))
})
test('Moddable rebuilding removes old executables and objects before invoking make',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'gaze-tools-'));try{
  const bin=path.join(root,'build/bin/mac/release'),obj=path.join(root,'build/tmp/mac/release');await mkdir(bin,{recursive:true});await mkdir(obj,{recursive:true})
  await writeFile(path.join(bin,'tools'),'old');await writeFile(path.join(obj,'old.o'),'old')
  const commands=[];await rebuildModdableTools(root,(command,args,options)=>{commands.push({command,args,options})})
  await assert.rejects(access(path.join(bin,'tools')));await assert.rejects(access(path.join(obj,'old.o')))
  assert.equal(commands.length,4);assert.ok(commands.every(c=>c.command==='/usr/bin/make'&&c.options.env.MODDABLE===root))
 }finally{await rm(root,{recursive:true,force:true})}
})
