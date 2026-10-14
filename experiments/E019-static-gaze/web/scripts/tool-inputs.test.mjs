import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,access,rm,cp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {prepareCompilerEnvironment,rebuildFontbm} from './tool-inputs.mjs'
import {verifyStagedHost} from './host-inputs.mjs'
test('controlled compiler config ignores hostile config and tool overrides',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'gaze-compiler-'));try{
  const sdk=path.join(root,'sdk'),generated=path.join(root,'generated');await mkdir(generated)
  for(const dir of ['upstream/bin','node/22.16.0_64bit/bin'])await mkdir(path.join(sdk,dir),{recursive:true})
  await cp(new URL('../generated/toolchain/emsdk/node/22.16.0_64bit/bin/node',import.meta.url),path.join(sdk,'node/22.16.0_64bit/bin/node'))
  const result=await prepareCompilerEnvironment(sdk,generated,{PATH:'/bin',EM_CONFIG:'/bad/config',EM_LLVM_ROOT:'/bad/llvm',EM_BINARYEN_ROOT:'/bad/bin',EM_NODE_JS:'/bad/node',EM_COMPILER_WRAPPER:'bad',LLVM:'/bad/legacy',NODE_OPTIONS:'--require bad'})
  assert.equal(result.env.PATH,'/bin');for(const key of ['EM_LLVM_ROOT','EM_BINARYEN_ROOT','EM_NODE_JS','EM_COMPILER_WRAPPER','LLVM','NODE_OPTIONS'])assert.equal(result.env[key],undefined)
  const config=await readFile(result.env.EM_CONFIG,'utf8');assert.ok(config.includes(path.join(sdk,'upstream/bin')));assert.ok(config.includes(path.join(sdk,'upstream')));assert.ok(!config.includes('/bad/'))
  assert.equal(result.env.EM_CACHE,path.join(generated,'em-cache'));assert.equal(result.provenance.configSha256.length,64)
  await writeFile(path.join(sdk,'node/22.16.0_64bit/bin/node'),'replaced node')
  await assert.rejects(prepareCompilerEnvironment(sdk,generated,{}),/Node executable mismatch/)
 }finally{await rm(root,{recursive:true,force:true})}
})
test('fontbm clean rebuild discards the binary and CMake cache before configure',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'gaze-font-'));try{
  await mkdir(path.join(root,'build'));await writeFile(path.join(root,'build/fontbm'),'old');await writeFile(path.join(root,'build/CMakeCache.txt'),'stale')
  const calls=[];await rebuildFontbm(root,(cmd,args)=>{calls.push({cmd,args})})
  await assert.rejects(access(path.join(root,'build/fontbm')));await assert.rejects(access(path.join(root,'build/CMakeCache.txt')))
  assert.equal(calls.length,2);assert.ok(calls[0].args.includes('-DCMAKE_BUILD_TYPE=Release'));assert.ok(calls[1].args.includes('fontbm'))
 }finally{await rm(root,{recursive:true,force:true})}
})
test('staged simulator host is authenticated without reading the live vendor',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'gaze-host-'));try{
  const pins=JSON.parse(await readFile(new URL('./host-pin.json',import.meta.url),'utf8'))
  const source=new URL('../../../../vendor/stack-chan/web/',import.meta.url)
  for(const file of Object.keys(pins)){const dest=path.join(root,file);await mkdir(path.dirname(dest),{recursive:true});await cp(new URL(file,source),dest)}
  assert.deepEqual((await verifyStagedHost(root)).sha256,pins)
  await writeFile(path.join(root,'simulator/bridge.mjs'),'changed bridge')
  await assert.rejects(verifyStagedHost(root),/host source mismatch/)
 }finally{await rm(root,{recursive:true,force:true})}
})
