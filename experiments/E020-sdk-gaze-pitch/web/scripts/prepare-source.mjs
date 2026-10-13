import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const web = fileURLToPath(new URL('../', import.meta.url))
const vendor = path.resolve(web, '../../../vendor/stack-chan')
const source = path.join(web, 'generated/pinned-stack-chan')
const pin = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const git = args => execFileSync('git',args,{cwd:vendor,encoding:'utf8'}).trim()
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
if(git(['rev-parse','HEAD'])!==pin || git(['status','--porcelain','--untracked-files=all']))
 throw Error('Pinned vendor must be clean and at the expected commit')
await mkdir(path.dirname(source),{recursive:true})
await rm(source,{recursive:true,force:true})
await cp(vendor,source,{recursive:true,filter:p=>!['.git','node_modules','dist','mc.js','mc.wasm'].includes(path.basename(p))})
const relative = 'firmware/host/modules/util/stackchan-util.ts'
const target = path.join(source,relative)
const original = await readFile(target)
if(hash(original)!=='d28ad77de7fa759d82167062d67da17f07db422e94b45c8fedc7b6a4b724a141')
 throw Error('Original helper differs from the diagnosed pinned source')
const patch = path.resolve(web,'../patches/body-relative-pitch.patch')
execFileSync('/usr/bin/patch',['--dry-run','-p1','-i',patch],{cwd:source,stdio:'inherit'})
execFileSync('/usr/bin/patch',['-p1','-i',patch],{cwd:source,stdio:'inherit'})
const patched = await readFile(target)
const expected = original.toString().replace('const inversePitch = -bodyRotation.p','const inversePitch = bodyRotation.p')
if(patched.toString()!==expected) throw Error('Patch changed more than the approved pitch sign')
export const sdkPatch = {baseCommit:pin,file:relative,patchSha256:hash(await readFile(patch)),
 originalSha256:hash(original),patchedSha256:hash(patched)}
await writeFile(path.join(web,'generated/sdk-patch.json'),JSON.stringify(sdkPatch,null,2)+'\n')
console.log(JSON.stringify(sdkPatch))
