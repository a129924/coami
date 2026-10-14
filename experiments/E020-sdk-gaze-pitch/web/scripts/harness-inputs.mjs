import {verifyPublicInputs} from './public-inputs.mjs'
import {readFile,writeFile} from 'node:fs/promises'
import {realpathSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import path from 'node:path'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
function committedExperiment(web){
 web=realpathSync(web)
 const root=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:web,encoding:'utf8'}).trim()
 const scope=path.relative(root,path.dirname(web))
 const dirty=execFileSync('git',['status','--porcelain=v1','--untracked-files=all','--',scope],{cwd:root,encoding:'utf8'})
 if(dirty.trim())throw Error('Evidence requires a clean committed experiment checkout')
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
 const read=(file,revision=commit)=>execFileSync('git',['show',`${revision}:${path.relative(root,path.join(web,file))}`],{cwd:root,encoding:'utf8'})
 const sourceCommit=execFileSync('git',['log','-1','--format=%H','--',path.relative(root,path.join(web,'src/harness-pin.json'))],{cwd:root,encoding:'utf8'}).trim()
 return {commit,sourceCommit,read}
}
function sourceIdentity(anchor){
 const sourceManifestSha256=hash(anchor.read('src/harness-pin.json'))
 const pin=JSON.parse(anchor.read('scripts/production-bundle-pin.json'))
 // The reference names the reviewed input, even when squash omits its Git object.
 // Changed inputs get a new candidate reference and require a new reviewed pin.
 const sourceCommit=pin.sourceManifestSha256===sourceManifestSha256?pin.sourceCommit:anchor.sourceCommit
 if(typeof sourceCommit!=='string'||! /^[a-f0-9]{40}$/.test(sourceCommit))throw Error('Invalid reviewed source reference')
 return {sourceCommit,sourceManifestSha256}
}
export async function verifyHarnessInputs(web){
 const anchor=committedExperiment(web),reviewed=anchor.read('src/harness-pin.json')
 if(hash(await readFile(path.join(web,'src/harness-pin.json')))!==hash(reviewed))throw Error('Reviewed harness manifest mismatch')
 const pins=JSON.parse(reviewed)
 for(const [file,expected] of Object.entries(pins))
  if(hash(await readFile(path.join(web,file)))!==expected)throw Error(`Reviewed harness input mismatch: ${file}`)
 return pins
}
export async function verifyProductionBundle(web,dist,read=file=>readFile(path.join(dist,file))){
 const sources=await verifyHarnessInputs(web)
 const anchor=committedExperiment(web),pin=JSON.parse(anchor.read('scripts/production-bundle-pin.json'))
 const actual=JSON.parse(await read('harness-provenance.json'))
 if(actual.mode!=='production'||JSON.stringify(actual.sources)!==JSON.stringify(sources)
  ||JSON.stringify(actual.bundleSha256)!==JSON.stringify(pin.bundleSha256)||Object.keys(pin.bundleSha256).length===0)throw Error('Reviewed production bundle provenance mismatch')
 if(actual.sourceCommit!==pin.sourceCommit||typeof actual.sourceCommit!=='string'||! /^[a-f0-9]{40}$/.test(actual.sourceCommit))throw Error('Reviewed production build source mismatch')
 if(actual.sourceManifestSha256!==pin.sourceManifestSha256||pin.sourceManifestSha256!==hash(anchor.read('src/harness-pin.json')))throw Error('Reviewed production source manifest mismatch')
 for(const [file,expected] of Object.entries(pin.bundleSha256))
  if(hash(await read(file))!==expected)throw Error(`Reviewed production bundle mismatch: ${file}`)
 return pin
}
export async function createPreviewSnapshot(web,dist){
 const pin=await verifyProductionBundle(web,dist)
 const names=[...Object.keys(pin.bundleSha256),'harness-provenance.json','runtime-provenance.json','mod-provenance.json','coami-mod.xsa','simulator/mc.js','simulator/mc.wasm','simulator/assets/case/v1/shell.stl']
 const files=new Map(await Promise.all(names.map(async file=>[file,await readFile(path.join(dist,file))])))
 const read=async file=>{if(!files.has(file))throw Error(`Missing snapshot asset: ${file}`);return files.get(file)}
 // Authenticate the captured bytes, not an earlier read of the mutable directory.
 await verifyProductionBundle(web,dist,read)
 await verifyPublicInputs(web,read)
 return files
}
export function snapshotMiddleware(files){
 const snapshot=new Map([...files].map(([name,bytes])=>[name,Buffer.from(bytes)]))
 const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm'}
 return (req,res)=>{
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return}
  let file;try{file=decodeURIComponent(new URL(req.url,'http://preview.invalid').pathname).slice(1)||'index.html'}catch{res.statusCode=400;res.end();return}
  const bytes=snapshot.get(file)
  if(!bytes){res.statusCode=404;res.end();return}
  res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.setHeader('Content-Length',bytes.length)
  res.end(req.method==='HEAD'?undefined:bytes)
 }
}
export function bundleHashes(bundle){
 return Object.fromEntries(Object.entries(bundle).sort(([a],[b])=>a.localeCompare(b)).map(([file,item])=>[file,hash(item.type==='chunk'?item.code:item.source)]))
}
export function harnessPlugin(web){
 let outDir
 return {name:'reviewed-evidence-harness',enforce:'post',
  configResolved(config){outDir=config.build.outDir},
  async buildStart(){await verifyHarnessInputs(web)},
  async configurePreviewServer(server){const files=await createPreviewSnapshot(web,path.resolve(web,outDir));server.middlewares.use(snapshotMiddleware(files))},
  async handleHotUpdate(){await verifyHarnessInputs(web)},
  async configureServer(server){
   await verifyHarnessInputs(web)
   server.middlewares.use('/harness-provenance.json',async(_req,res,next)=>{
    try{const sources=await verifyHarnessInputs(web);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({mode:'development',...sourceIdentity(committedExperiment(web)),sources,bundleSha256:null}))}catch(error){next(error)}
   })
  },
  async writeBundle(_options,bundle){
   const sources=await verifyHarnessInputs(web)
   await writeFile(path.resolve(web,outDir,'harness-provenance.json'),JSON.stringify({mode:'production',...sourceIdentity(committedExperiment(web)),sources,bundleSha256:bundleHashes(bundle)},null,2)+'\n')
  },
 }
}
