import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir,readFile,writeFile,rename } from 'node:fs/promises'
import { fileURLToPath,pathToFileURL } from 'node:url'
import path from 'node:path'
const web=fileURLToPath(new URL('../',import.meta.url))
const editor=path.join(web,'generated/pinned-stack-chan/web/editor')
const {buildModArchive,isXsArchive}=await import(pathToFileURL(path.join(editor,'mod-builder.mjs')).href)
const {default:createTools}=await import(pathToFileURL(path.join(editor,'vendor/tools.js')).href)
const out=path.join(web,'generated/mod')
execFileSync(path.join(web,'node_modules/.bin/tsc'),['-p',path.join(web,'../mod/tsconfig.json'),'--noEmit','false','--outDir',out],{stdio:'inherit'})
const archive=await buildModArchive(createTools,{modJs:await readFile(path.join(out,'main.js'),'utf8'),name:'coami-e016',manifest:JSON.parse(await readFile(path.join(web,'../mod/manifest.json'),'utf8')),onLog:console.log})
if(!isXsArchive(archive))throw new Error('Invalid MOD XS archive')
await mkdir(path.join(web,'generated/public'),{recursive:true})
await writeFile(path.join(web,'generated/public/coami-mod.xsa'),archive)
const provenanceFile=path.join(web,'generated/runtime-provenance.json')
const provenance=JSON.parse(await readFile(provenanceFile,'utf8'))
provenance.servedHashes=null
delete provenance.servedAt
delete provenance.servedBaseUrl
provenance.modArchiveSha256=createHash('sha256').update(archive).digest('hex')
provenance.publicHashes={}
for(const name of ['mc.js','mc.wasm']) provenance.publicHashes[name]=createHash('sha256').update(await readFile(path.join(web,'generated/public/simulator',name))).digest('hex')
// These are disk artifact hashes, not claims about bytes fetched over HTTP.
for(const file of [provenanceFile,path.join(web,'generated/public/runtime-provenance.json')]) {
  await writeFile(`${file}.tmp`,JSON.stringify(provenance,null,2)+'\n')
  await rename(`${file}.tmp`,file)
}
console.log(`Built E016 MOD (${archive.length} bytes); per-run provenance saved under generated/`)
