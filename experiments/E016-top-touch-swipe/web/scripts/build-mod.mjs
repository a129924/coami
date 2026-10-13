import { execFileSync } from 'node:child_process'
import { mkdir,readFile,writeFile } from 'node:fs/promises'
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
console.log(`Built E016 MOD (${archive.length} bytes)`)
