import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {verifyCleanSource,rebuildVerifiedSource} from './build-safety.mjs'

test('compiler sources reject untracked headers and CMake inputs before rebuilding',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'e023-source-'))
 const git=args=>execFileSync('git',args,{cwd:root,stdio:'pipe'})
 try{
  git(['init','--quiet'])
  await writeFile(path.join(root,'.gitignore'),'build/\n')
  await writeFile(path.join(root,'source.c'),'original\n')
  git(['add','.']);git(['-c','user.name=E023 Test','-c','user.email=e023@example.invalid','-c','core.hooksPath=/dev/null','commit','--quiet','-m','fixture'])
  await mkdir(path.join(root,'build'));await writeFile(path.join(root,'build/output'),'ignored output')
  for(const label of ['Moddable','emsdk','fontbm']){
   assert.doesNotThrow(()=>verifyCleanSource(root,label))
   for(const file of ['injected.h','injected.cmake']){
    await writeFile(path.join(root,file),'unexpected input')
    assert.throws(()=>verifyCleanSource(root,label),new RegExp(label+' source has tracked or untracked changes'))
    await rm(path.join(root,file))
   }
   await writeFile(path.join(root,'source.c'),'modified\n')
   assert.throws(()=>verifyCleanSource(root,label),/tracked or untracked changes/)
   await writeFile(path.join(root,'source.c'),'original\n')
  }
 }finally{await rm(root,{recursive:true,force:true})}
})

test('compiler rebuilds reject dirty sources or changed HEAD before tool attestation',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'e023-rebuild-'))
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
 const commit=['-c','user.name=E023 Test','-c','user.email=e023@example.invalid','-c','core.hooksPath=/dev/null','commit','--quiet','-m','fixture']
 try{
  git(['init','--quiet']);await writeFile(path.join(root,'source.c'),'original');git(['add','.']);git(commit)
  const pin=git(['rev-parse','HEAD'])
  for(const label of ['Moddable','fontbm']){
   await rebuildVerifiedSource(root,label,pin,async()=>{})
   await assert.rejects(rebuildVerifiedSource(root,label,pin,async()=>{await writeFile(path.join(root,'source.c'),'changed')}),/tracked or untracked/)
   git(['restore','source.c'])
   await assert.rejects(rebuildVerifiedSource(root,label,pin,async()=>{await writeFile(path.join(root,'injected.h'),'new input')}),/tracked or untracked/)
   await rm(path.join(root,'injected.h'))
   await assert.rejects(rebuildVerifiedSource(root,label,pin,async()=>{await writeFile(path.join(root,'source.c'),'new commit');git(['add','.']);git(commit)}),/commit mismatch/)
   git(['reset','--hard',pin])
  }
 }finally{await rm(root,{recursive:true,force:true})}
})

test('WASM build rejects Emscripten tree and emsdk checkout mutations before provenance',async()=>{
 const {installedTreeSha256}=await import('./installed-tree.mjs')
 const {buildWithVerifiedCompiler}=await import('./build-safety.mjs')
 const root=await mkdtemp(path.join(tmpdir(),'e023-emsdk-'))
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
 const commit=['-c','user.name=E023 Test','-c','user.email=e023@example.invalid','-c','core.hooksPath=/dev/null','commit','--quiet','-m','fixture']
 try{
  git(['init','--quiet']);await writeFile(path.join(root,'.gitignore'),'upstream/\n');await writeFile(path.join(root,'emsdk.py'),'pinned source');git(['add','.']);git(commit)
  const pin=git(['rev-parse','HEAD'])
  await mkdir(path.join(root,'upstream'));await writeFile(path.join(root,'upstream/emcc.py'),'compiler')
  const digest=await installedTreeSha256(path.join(root,'upstream'))
  await buildWithVerifiedCompiler(root,pin,digest,async()=>{})
  for(const mutate of [
   ()=>writeFile(path.join(root,'upstream/emcc.py'),'changed compiler'),
   ()=>writeFile(path.join(root,'emsdk.py'),'changed checkout'),
   ()=>writeFile(path.join(root,'injected.py'),'new input'),
   async()=>{await writeFile(path.join(root,'emsdk.py'),'new commit');git(['add','.']);git(commit)},
  ]){
   await assert.rejects(buildWithVerifiedCompiler(root,pin,digest,mutate),/tree changed|tracked or untracked|commit mismatch/)
   git(['reset','--hard',pin]);await rm(path.join(root,'injected.py'),{force:true});await writeFile(path.join(root,'upstream/emcc.py'),'compiler')
  }
  await writeFile(path.join(root,'upstream/emcc.py'),'dirty before build')
  let called=false
  await assert.rejects(buildWithVerifiedCompiler(root,pin,digest,async()=>{called=true}),/tree changed/)
  assert.equal(called,false)
 }finally{await rm(root,{recursive:true,force:true})}
})
