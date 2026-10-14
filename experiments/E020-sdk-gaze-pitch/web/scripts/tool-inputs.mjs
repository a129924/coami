import {installedTreeSha256} from './installed-tree.mjs'
import {mkdir,readFile,writeFile,rm,realpath} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function prepareCompilerEnvironment(sdk,generated,inherited=process.env){
 const node=await realpath(path.join(sdk,'node/22.16.0_64bit/bin/node'))
 const nodeSha256=hash(await readFile(node))
 if(nodeSha256!=='a45751fbfe88440bebff63cd44814e4ed6deb642bc3e3c4a14c4f8ae0ed9e019')throw Error('Pinned SDK Node executable mismatch')
 const pythonBinary=await realpath(path.join(sdk,'python/3.13.3_64bit/bin/python3'))
 if(pythonBinary!==path.join(await realpath(sdk),'python/3.13.3_64bit/bin/python3.13'))throw Error('Pinned SDK Python executable path mismatch')
 const pythonSha256=hash(await readFile(pythonBinary))
 if(pythonSha256!=='051ecc026af314195484c2a8e3ae3de85db8a09ae7998d9cace75323e7a40d81')throw Error('Pinned SDK Python executable mismatch')
 const pythonTreeSha256=await installedTreeSha256(path.join(sdk,'python/3.13.3_64bit'))
 if(pythonTreeSha256!=='a8c4f3a2be714ebb6fdd01cf4200c177f78d8ff63b57141982f49426250dff61')throw Error('Pinned SDK Python installation mismatch')
 const env={...inherited}
 for(const key of Object.keys(env))if(/^(EM_|EMCC_|EMSDK_|LLVM|BINARYEN|NODE|PYTHON)/.test(key))delete env[key]
 const config=path.join(generated,'controlled-emscripten.py')
 const paths={LLVM_ROOT:path.join(sdk,'upstream/bin'),BINARYEN_ROOT:path.join(sdk,'upstream'),NODE_JS:[node]}
 const bytes=Object.entries(paths).map(([k,v])=>`${k} = ${JSON.stringify(v)}`).join('\n')+'\nCOMPILER_WRAPPER = None\n'
 await mkdir(generated,{recursive:true});await writeFile(config,bytes)
 const python=path.join(generated,'python-no-bytecode')
 await writeFile(python,'#!/bin/sh\nexec "$COAMI_PYTHON" -B "$@"\n',{mode:0o755})
 Object.assign(env,{EM_CONFIG:config,EMSDK:sdk,COAMI_PYTHON:pythonBinary,EMSDK_PYTHON:python,EM_CACHE:path.join(generated,'em-cache'),PYTHONDONTWRITEBYTECODE:'1'})
 return {env,provenance:{configPath:config,configSha256:hash(bytes),paths,nodeSha256,pythonBinary,pythonSha256,pythonTreeSha256}}
}
export async function rebuildFontbm(root,run=execFileSync){
 const build=path.join(root,'build');await rm(build,{recursive:true,force:true})
 const env={...process.env}
 for(const key of Object.keys(env))if(/^(CMAKE_|CC$|CXX$|CFLAGS$|CPPFLAGS$|CXXFLAGS$|LDFLAGS$)/.test(key))delete env[key]
 run('/opt/homebrew/bin/cmake',['-S',root,'-B',build,'-DCMAKE_BUILD_TYPE=Release','-DCMAKE_CXX_COMPILER=/usr/bin/c++'],{env,stdio:'inherit'})
 run('/opt/homebrew/bin/cmake',['--build',build,'--target','fontbm','--parallel','2'],{env,stdio:'inherit'})
}
