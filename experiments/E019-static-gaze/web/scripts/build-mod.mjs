import {clearModOutputs,verifyVendor} from './build-safety.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
const web = fileURLToPath(new URL('../', import.meta.url))
const repo = path.resolve(web, '../../..')
await clearModOutputs(path.join(web,'generated'))
verifyVendor(repo,path.join(repo,'vendor/stack-chan'),'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322')
const editor = path.join(repo, 'vendor/stack-chan/web/editor')
const { buildModArchive, isXsArchive } = await import(pathToFileURL(path.join(editor, 'mod-builder.mjs')))
const { default: createTools } = await import(pathToFileURL(path.join(editor, 'vendor/tools.js')))
const out = path.join(web, 'generated/mod')
execFileSync(path.join(web,'node_modules/.bin/tsc'), ['-p',path.join(web,'../mod/tsconfig.json'),'--noEmit','false','--outDir',out],{stdio:'inherit'})
const modJs = await readFile(path.join(out,'mod.js'),'utf8')
const control = await readFile(path.join(out,'gaze-control.js'))
const archive = await buildModArchive(createTools, { modJs, name:'coami-e019',
  files:[{path:'gaze-control.js',bytes:control}], manifest:{modules:{'*':['./mod','./gaze-control']}}, onLog:console.log })
if (!isXsArchive(archive)) throw Error('invalid XS archive')
const publicRoot = path.join(web,'generated/public'); await mkdir(publicRoot,{recursive:true})
await writeFile(path.join(publicRoot,'coami-mod.xsa'),archive)
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
await writeFile(path.join(publicRoot,'mod-provenance.json'),JSON.stringify({experiment:'E019',vendorCommit:'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322',sha256:hash(archive),
  sources:{'mod.ts':hash(await readFile(path.join(web,'../mod/mod.ts'))),'gaze-control.ts':hash(await readFile(path.join(web,'../mod/gaze-control.ts')))}} ,null,2)+'\n')
console.log(`E019 MOD: ${archive.length} bytes, sha256=${hash(archive)}`)
