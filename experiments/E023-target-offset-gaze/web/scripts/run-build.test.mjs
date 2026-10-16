import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {cleanBuild,assertBuildCurrent} from './run-build.mjs'
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'e023-build-'))
 for(const dir of ['web/src','web/scripts','web/generated/public','web/dist','mod','server'])await mkdir(path.join(root,dir),{recursive:true})
 for(const file of ['web/package.json','web/package-lock.json','web/vite.config.ts','web/tsconfig.json','web/index.html','server/pyproject.toml','server/uv.lock'])await writeFile(path.join(root,file),'{}')
 await writeFile(path.join(root,'web/src/main.ts'),'current source')
 await writeFile(path.join(root,'web/dist/stale.js'),'stale bundle')
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
