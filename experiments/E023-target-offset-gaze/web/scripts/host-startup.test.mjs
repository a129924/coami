import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtemp,mkdir,writeFile,readFile,cp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
test('host coordinator rejects require/import preloads before preparing artifacts',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'e023-host-start-'))
 try{
  await cp(new URL('./',import.meta.url),path.join(root,'web/scripts'),{recursive:true})
  const publicRoot=path.join(root,'web/generated/host-build/public'),sentinel=path.join(publicRoot,'existing-runtime')
  await mkdir(publicRoot,{recursive:true});await writeFile(sentinel,'unchanged')
  const hook=path.join(root,'hook.cjs'),marker=path.join(root,'hook-loaded')
  await writeFile(hook,`require('node:fs').writeFileSync(${JSON.stringify(marker)},'loaded')`)
  for(const [args,options]of [[[],`--require=${hook}`],[['--import',pathToFileURL(hook).href],undefined]]){
   const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH
   if(options)env.NODE_OPTIONS=options
   const result=spawnSync(process.execPath,[...args,path.join(root,'web/scripts/prepare-assets.mjs')],{env,encoding:'utf8',timeout:10000})
   assert.notEqual(result.status,0)
   assert.match(result.stderr,/unrecorded Node startup inputs/)
   assert.equal(await readFile(marker,'utf8'),'loaded','preload ran before coordinator and cannot be undone')
   assert.equal(await readFile(sentinel,'utf8'),'unchanged','coordinator did not begin artifact preparation')
  }
 }finally{await rm(root,{recursive:true,force:true})}
})
