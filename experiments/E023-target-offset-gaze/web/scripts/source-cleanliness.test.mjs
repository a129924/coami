import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {verifyCleanSource} from './build-safety.mjs'

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
