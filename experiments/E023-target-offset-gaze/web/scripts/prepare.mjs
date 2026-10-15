/** No SDK patch or compiler installation: package the MOD with pinned SDK tools. */
import {execFileSync} from 'node:child_process'
import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const web=fileURLToPath(new URL('../',import.meta.url)),repo=path.resolve(web,'../../..'),vendor=path.join(repo,'vendor/stack-chan'),out=path.join(web,'generated'),pin='b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const git=(args,cwd)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim()
await mkdir(out,{recursive:true});await rm(path.join(out,'public'),{recursive:true,force:true})
try{
 if(git(['rev-parse','HEAD:vendor/stack-chan'],repo)!==pin||git(['rev-parse','HEAD'],vendor)!==pin||git(['status','--porcelain=v1','--untracked-files=all'],vendor))throw Error('pinned vendor mismatch/dirty')
 const publicRoot=path.join(out,'public');await mkdir(publicRoot,{recursive:true})
 const emitted=path.join(out,'mod')
 execFileSync(path.join(web,'node_modules/.bin/tsc'),['-p',path.join(web,'../mod/tsconfig.json'),'--noEmit','false','--outDir',emitted],{stdio:'inherit'})
 const {buildModArchive,isXsArchive}=await import(pathToFileURL(path.join(vendor,'web/editor/mod-builder.mjs')))
 const {default:createTools}=await import(pathToFileURL(path.join(vendor,'web/editor/vendor/tools.js')))
 const modJs=await readFile(path.join(emitted,'mod.js'),'utf8'),protocol=await readFile(path.join(emitted,'protocol.js'))
 const archive=await buildModArchive(createTools,{modJs,name:'coami-e023',files:[{path:'protocol.js',bytes:protocol}],manifest:{modules:{'*':['./mod','./protocol']}}})
 if(!isXsArchive(archive))throw Error('invalid MOD archive')
 await writeFile(path.join(out,'coami-mod.xsa'),archive)
 const modSources={}
 for(const file of ['mod.ts','protocol.ts'])modSources[file]=sha(await readFile(path.join(web,'../mod',file)))
 await writeFile(path.join(out,'mod-provenance.json'),JSON.stringify({sha256:sha(archive),sources:modSources,sourceCommit:pin},null,2)+'\n')
 const runtime=process.env.E023_RUNTIME_DIR
 if(!runtime)throw Error('E023_RUNTIME_DIR is required; no pinned WASM host is bundled')
 const pins={'mc.js':'9e7c0128e4b94ac78cb3646a488a04be227272e61b7fee77cd2b6ec91aa745f0','mc.wasm':'bc8f5a40fe4e6e1b0f0fd9f29cf5089129fdfca2b9cc0ce229f6788328676ac2'}
 for(const [name,expected]of Object.entries(pins)){
  const bytes=await readFile(path.join(runtime,name));if(sha(bytes)!==expected)throw Error(`runtime hash mismatch: ${name}`)
  await mkdir(path.join(publicRoot,'simulator'),{recursive:true});await writeFile(path.join(publicRoot,'simulator',name),bytes)
 }
 await cp(path.join(vendor,'web/simulator/assets'),path.join(publicRoot,'simulator/assets'),{recursive:true})
 await writeFile(path.join(publicRoot,'coami-mod.xsa'),archive)
 const hashes={...pins,'assets/case/v1/shell.stl':sha(await readFile(path.join(publicRoot,'simulator/assets/case/v1/shell.stl'))),'coami-mod.xsa':sha(archive)}
 const sources={}
 for(const file of ['mod.ts','protocol.ts'])sources[`mod/${file}`]=sha(await readFile(path.join(web,'../mod',file)))
 for(const file of ['src/services/simulator/simulator-engine.mjs','simulator/geometry.mjs','simulator/bridge.mjs'])sources[`vendor/web/${file}`]=sha(await readFile(path.join(vendor,'web',file)))
 await writeFile(path.join(publicRoot,'runtime-provenance.json'),JSON.stringify({experiment:'E023',sourceCommit:pin,hashes,sources,limitation:'Exact reviewed runtime bytes; no new compiler provenance claimed'},null,2)+'\n')
 await writeFile(path.join(out,'preflight.json'),JSON.stringify({status:'prepared',hashes},null,2)+'\n')
 console.log('Prepared exact pinned host and E023 MOD; roundtrip NOT yet executed')
}catch(error){
 await rm(path.join(out,'public'),{recursive:true,force:true})
 await writeFile(path.join(out,'preflight.json'),JSON.stringify({status:'blocked',reason:String(error),experiment:'無法判定'},null,2)+'\n')
 throw error
}
