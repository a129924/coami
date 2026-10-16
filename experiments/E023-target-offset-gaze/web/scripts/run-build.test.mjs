import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {cleanBuild as buildRun,assertBuildCurrent as checkRun} from './run-build.mjs'
import {verifyVendor as checkVendor} from './build-safety.mjs'
const vendors=new Map()
const verifyVendor=root=>()=>{const {repo,vendor,pin}=vendors.get(root);checkVendor(repo,vendor,pin);return pin}
const cleanBuild=(root,options)=>buildRun(root,{...options,verifyVendor:verifyVendor(root)})
const assertBuildCurrent=(root,manifest)=>checkRun(root,manifest,{verifyVendor:verifyVendor(root)})
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'e023-build-'))
 for(const dir of ['web/src','web/scripts','web/generated/public','web/dist','mod','server'])await mkdir(path.join(root,dir),{recursive:true})
 for(const file of ['web/package.json','web/package-lock.json','web/vite.config.ts','web/tsconfig.json','web/index.html','server/pyproject.toml','server/uv.lock'])await writeFile(path.join(root,file),'{}')
 await writeFile(path.join(root,'web/src/main.ts'),'current source')
 await writeFile(path.join(root,'web/dist/stale.js'),'stale bundle')
 const repo=path.join(root,'fixture-repo'),vendor=path.join(repo,'vendor/stack-chan')
 await mkdir(vendor,{recursive:true})
 const git=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
 const commit=['-c','user.name=E023 Test','-c','user.email=e023@example.invalid','-c','core.hooksPath=/dev/null','commit','--quiet','-m','fixture']
 git(vendor,['init','--quiet']);await writeFile(path.join(vendor,'simulator-engine.mjs'),'pinned source')
 git(vendor,['add','.']);git(vendor,commit);const pin=git(vendor,['rev-parse','HEAD'])
 git(repo,['init','--quiet']);git(repo,['update-index','--add','--cacheinfo',`160000,${pin},vendor/stack-chan`]);git(repo,commit)
 vendors.set(root,{repo,vendor,pin})
 return root
}
const build=web=>execFileSync(process.execPath,['-e',"const fs=require('node:fs');if(fs.existsSync('dist'))throw Error('stale dist survived');fs.mkdirSync('dist');fs.copyFileSync('src/main.ts','dist/main.js')"],{cwd:web})
test('clean build replaces stale dist and binds sources to output; later edits rejected',async()=>{
 const root=await fixture()
 try{
  const manifest=await cleanBuild(root,{build});await assertBuildCurrent(root,manifest)
  await assert.rejects(readFile(path.join(root,'web/dist/stale.js')),{code:'ENOENT'})
  assert.equal(await readFile(path.join(root,'web/dist/main.js'),'utf8'),'current source')
  await writeFile(path.join(root,'web/src/main.ts'),'edited source')
  await assert.rejects(assertBuildCurrent(root,manifest),/sources changed after build/)
  await writeFile(path.join(root,'web/src/main.ts'),'current source')
  await writeFile(path.join(root,'web/dist/main.js'),'replaced bundle')
  await assert.rejects(assertBuildCurrent(root,manifest),/bundle changed after build/)
 }finally{await rm(root,{recursive:true,force:true})}
})
test('a source edit during the build cannot produce attributed evidence',async()=>{
 const root=await fixture()
 try{await assert.rejects(cleanBuild(root,{build:async web=>{await writeFile(path.join(web,'src/main.ts'),'changed mid-build');build(web)}}),/sources changed during build/)}
 finally{await rm(root,{recursive:true,force:true})}
})

for(const phase of ['before','during','after'])test(`vendor source mutation is rejected ${phase} build`,async()=>{
 const root=await fixture(),{vendor}=vendors.get(root)
 const modify=()=>writeFile(path.join(vendor,'simulator-engine.mjs'),'mutated transitive simulator input')
 try{
  if(phase==='before'){
   await modify();await assert.rejects(cleanBuild(root,{build}),/Pinned vendor/)
   assert.equal(await readFile(path.join(root,'web/dist/stale.js'),'utf8'),'stale bundle')
  }else if(phase==='during'){
   await assert.rejects(cleanBuild(root,{build:async web=>{build(web);await modify()}}),/Pinned vendor/)
  }else{
   const manifest=await cleanBuild(root,{build});await modify()
   await assert.rejects(assertBuildCurrent(root,manifest),/Pinned vendor/)
  }
 }finally{vendors.delete(root);await rm(root,{recursive:true,force:true})}
})
