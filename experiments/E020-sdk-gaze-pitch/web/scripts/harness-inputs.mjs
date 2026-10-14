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
 const read=file=>execFileSync('git',['show',`${commit}:${path.relative(root,path.join(web,file))}`],{cwd:root,encoding:'utf8'})
 return {commit,read}
}
export async function verifyHarnessInputs(web){
 const anchor=committedExperiment(web),reviewed=anchor.read('src/harness-pin.json')
 if(hash(await readFile(path.join(web,'src/harness-pin.json')))!==hash(reviewed))throw Error('Reviewed harness manifest mismatch')
 const pins=JSON.parse(reviewed)
 for(const [file,expected] of Object.entries(pins))
  if(hash(await readFile(path.join(web,file)))!==expected)throw Error(`Reviewed harness input mismatch: ${file}`)
 return pins
}
export async function verifyProductionBundle(web,dist){
 const sources=await verifyHarnessInputs(web)
 const pin=JSON.parse(committedExperiment(web).read('scripts/production-bundle-pin.json'))
 const actual=JSON.parse(await readFile(path.join(dist,'harness-provenance.json'),'utf8'))
 if(actual.mode!=='production'||actual.sourceCommit!==pin.sourceCommit||JSON.stringify(actual.sources)!==JSON.stringify(sources)
  ||JSON.stringify(actual.bundleSha256)!==JSON.stringify(pin.bundleSha256)||Object.keys(pin.bundleSha256).length===0)throw Error('Reviewed production bundle provenance mismatch')
 for(const [file,expected] of Object.entries(pin.bundleSha256))
  if(hash(await readFile(path.join(dist,file)))!==expected)throw Error(`Reviewed production bundle mismatch: ${file}`)
 return pin
}
export function bundleHashes(bundle){
 return Object.fromEntries(Object.entries(bundle).sort(([a],[b])=>a.localeCompare(b)).map(([file,item])=>[file,hash(item.type==='chunk'?item.code:item.source)]))
}
export function harnessPlugin(web){
 let outDir
 return {name:'reviewed-evidence-harness',enforce:'post',
  configResolved(config){outDir=config.build.outDir},
  async buildStart(){await verifyHarnessInputs(web)},
  async configurePreviewServer(){await verifyProductionBundle(web,path.resolve(web,outDir))},
  async handleHotUpdate(){await verifyHarnessInputs(web)},
  async configureServer(server){
   await verifyHarnessInputs(web)
   server.middlewares.use('/harness-provenance.json',async(_req,res,next)=>{
    try{const sources=await verifyHarnessInputs(web);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({mode:'development',sourceCommit:committedExperiment(web).commit,sources,bundleSha256:null}))}catch(error){next(error)}
   })
  },
  async writeBundle(_options,bundle){
   const sources=await verifyHarnessInputs(web)
   await writeFile(path.resolve(web,outDir,'harness-provenance.json'),JSON.stringify({mode:'production',sourceCommit:committedExperiment(web).commit,sources,bundleSha256:bundleHashes(bundle)},null,2)+'\n')
  },
 }
}
