import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
const pins=JSON.parse(await readFile(new URL('../src/harness-pin.json',import.meta.url),'utf8'))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function verifyHarnessInputs(web){
 for(const [file,expected] of Object.entries(pins))
  if(hash(await readFile(path.join(web,file)))!==expected)throw Error(`Reviewed harness input mismatch: ${file}`)
 return pins
}
export function bundleHashes(bundle){
 return Object.fromEntries(Object.entries(bundle).sort(([a],[b])=>a.localeCompare(b)).map(([file,item])=>[file,hash(item.type==='chunk'?item.code:item.source)]))
}
export function harnessPlugin(web){
 let outDir
 return {name:'reviewed-evidence-harness',enforce:'post',
  configResolved(config){outDir=config.build.outDir},
  async buildStart(){await verifyHarnessInputs(web)},
  async handleHotUpdate(){await verifyHarnessInputs(web)},
  async configureServer(server){
   await verifyHarnessInputs(web)
   server.middlewares.use('/harness-provenance.json',async(_req,res,next)=>{
    try{const sources=await verifyHarnessInputs(web);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({mode:'development',sources,bundleSha256:null}))}catch(error){next(error)}
   })
  },
  async writeBundle(_options,bundle){
   const sources=await verifyHarnessInputs(web)
   await writeFile(path.resolve(web,outDir,'harness-provenance.json'),JSON.stringify({mode:'production',sources,bundleSha256:bundleHashes(bundle)},null,2)+'\n')
  },
 }
}
