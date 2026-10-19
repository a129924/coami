import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {installDependencies} from './run-dependencies.mjs'
import {cleanBuild as buildRun,assertBuildCurrent as checkRun} from './run-build.mjs'
import {verifyVendor as checkVendor} from './build-safety.mjs'
const vendors=new Map()
const verifyVendor=root=>()=>{const {repo,vendor,pin}=vendors.get(root);checkVendor(repo,vendor,pin);return pin}
const install=web=>installDependencies(web,(_command,_args,{cwd})=>execFileSync(process.execPath,['-e',"const fs=require('node:fs');fs.rmSync('node_modules',{recursive:true,force:true});fs.mkdirSync('node_modules');fs.writeFileSync('node_modules/geometry.js','locked fixture')"],{cwd}))
const cleanBuild=(root,options)=>buildRun(root,{install,...options,verifyVendor:verifyVendor(root)})
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

for(const phase of ['during','after'])test(`installed dependency edits rejected ${phase} bundling`,async()=>{
 const root=await fixture()
 const mutate=()=>writeFile(path.join(root,'web/node_modules/geometry.js'),'modified geometry')
 try{
  if(phase==='during')await assert.rejects(cleanBuild(root,{build:async web=>{build(web);await mutate()}}),/installed dependencies changed/)
  else{const manifest=await cleanBuild(root,{build});await mutate();await assert.rejects(assertBuildCurrent(root,manifest),/installed dependencies changed/)}
 }finally{vendors.delete(root);await rm(root,{recursive:true,force:true})}
})

test('attested build rejects Node preload inputs and isolates child environment',async()=>{
 const root=await fixture(),marker=path.join(root,'preload-ran'),hook=path.join(root,'hook.cjs')
 const saved={NODE_OPTIONS:process.env.NODE_OPTIONS,NODE_PATH:process.env.NODE_PATH,VITE_UNRECORDED:process.env.VITE_UNRECORDED,NODE_ENV:process.env.NODE_ENV}
 try{
  await writeFile(hook,`require('node:fs').writeFileSync(${JSON.stringify(marker)},'preloaded')`)
  process.env.NODE_OPTIONS=`--require ${hook}`
  let invoked=false
  await assert.rejects(cleanBuild(root,{build:()=>{invoked=true}}),/unrecorded Node startup inputs/)
  assert.equal(invoked,false)
  delete process.env.NODE_OPTIONS
  process.env.VITE_UNRECORDED='unrecorded setting';process.env.NODE_ENV='test'
  const manifest=await cleanBuild(root,{build:(web,env)=>{
   assert.ok(env,'controlled environment required')
   assert.equal(env.NODE_OPTIONS,undefined);assert.equal(env.NODE_PATH,undefined);assert.equal(env.VITE_UNRECORDED,undefined);assert.equal(env.NODE_ENV,undefined)
   execFileSync(process.execPath,['-e',"const fs=require('node:fs');if(process.env.VITE_UNRECORDED||process.env.NODE_ENV)throw Error('ambient env');fs.mkdirSync('dist');fs.copyFileSync('src/main.ts','dist/main.js')"],{cwd:web,env})
  }})
  assert.equal(manifest.environment.kind,'controlled allowlist v1')
  await assert.rejects(readFile(marker),{code:'ENOENT'})
 }finally{
  for(const [key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value}
  vendors.delete(root);await rm(root,{recursive:true,force:true})
 }
})

test('project npm config is rejected before attributed install/build and after build',async()=>{
 const root=await fixture(),web=path.join(root,'web'),config=path.join(web,'.npmrc')
 try{
  await writeFile(config,'node-options=--require=/tmp/unrecorded-hook.cjs\n')
  let called=false
  await assert.rejects(cleanBuild(root,{build:()=>{called=true}}),/project npm configuration/)
  assert.equal(called,false)
  await rm(config)
  await assert.rejects(cleanBuild(root,{build:async web=>{build(web);await writeFile(config,'node-options=--require=/tmp/unrecorded-hook.cjs\n')}}),/project npm configuration/)
  await rm(config)
  const manifest=await cleanBuild(root,{build})
  await writeFile(config,'')
  await assert.rejects(assertBuildCurrent(root,manifest),/project npm configuration/)
 }finally{vendors.delete(root);await rm(root,{recursive:true,force:true})}
})
