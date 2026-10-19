import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {stagePinnedVendor} from './stage-vendor.mjs'
import {verifyVendor} from './build-safety.mjs'
test('host staging uses immutable commit blobs and rejects vendor changes after staging/build',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'e023-stage-')),repo=path.join(root,'repo'),vendor=path.join(repo,'vendor/stack-chan'),dest=path.join(root,'staged')
 const git=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
 const commit=['-c','user.name=E023 Test','-c','user.email=e023@example.invalid','-c','core.hooksPath=/dev/null','commit','--quiet','-m','fixture']
 try{
  await mkdir(vendor,{recursive:true});git(vendor,['init','--quiet'])
  await writeFile(path.join(vendor,'.gitignore'),'ignored/\n');await writeFile(path.join(vendor,'firmware.c'),'pinned source')
  git(vendor,['add','.']);git(vendor,commit);const pin=git(vendor,['rev-parse','HEAD'])
  git(repo,['init','--quiet']);git(repo,['update-index','--add','--cacheinfo',`160000,${pin},vendor/stack-chan`]);git(repo,commit)
  await mkdir(path.join(vendor,'ignored'));await writeFile(path.join(vendor,'ignored/injected.h'),'ignored checkout input')
  await stagePinnedVendor(repo,vendor,pin,dest)
  assert.equal(await readFile(path.join(dest,'firmware.c'),'utf8'),'pinned source')
  await assert.rejects(readFile(path.join(dest,'ignored/injected.h')),{code:'ENOENT'})
  for(const mutate of [()=>writeFile(path.join(vendor,'firmware.c'),'changed'),()=>writeFile(path.join(vendor,'injected.h'),'untracked'),async()=>{await writeFile(path.join(vendor,'firmware.c'),'new commit');git(vendor,['add','.']);git(vendor,commit)}]){
   await assert.rejects(stagePinnedVendor(repo,vendor,pin,dest,{afterStage:mutate}),/Pinned vendor/)
   git(vendor,['reset','--hard',pin]);await rm(path.join(vendor,'injected.h'),{force:true})
  }
  await stagePinnedVendor(repo,vendor,pin,dest)
  await writeFile(path.join(vendor,'firmware.c'),'changed during compilation')
  assert.throws(()=>verifyVendor(repo,vendor,pin),/Pinned vendor/)
 }finally{await rm(root,{recursive:true,force:true})}
})
