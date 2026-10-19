import {controlledNodeEnvironment,assertNoProjectNpmConfig} from './node-environment.mjs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFile,readdir,rm} from 'node:fs/promises'
import path from 'node:path'
import {installDependencies,verifyDependencies} from './run-dependencies.mjs'
import {verifyVendor as verifyVendorCheckout} from './build-safety.mjs'
const VENDOR_PIN='b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
export function verifyPinnedVendor(root){
 const repo=path.resolve(root,'../..')
 verifyVendorCheckout(repo,path.join(repo,'vendor/stack-chan'),VENDOR_PIN)
 return VENDOR_PIN
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
async function treeHashes(base){
 const hashes={}
 async function walk(dir,prefix=''){
  for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const key=prefix+entry.name,absolute=path.join(dir,entry.name)
   if(entry.isDirectory())await walk(absolute,key+'/')
   else if(entry.isFile())hashes[key]=sha(await readFile(absolute))
   else throw Error('unsupported build input: '+absolute)
  }
 }
 await walk(base);return hashes
}
export async function sourceHashes(root){
 const hashes={}
 for(const directory of ['web/src','web/scripts','mod'])
  for(const [file,hash] of Object.entries(await treeHashes(path.join(root,directory))))hashes[directory+'/'+file]=hash
 for(const file of ['web/package.json','web/package-lock.json','web/vite.config.ts','web/tsconfig.json','web/index.html','server/pyproject.toml','server/uv.lock',...(await readdir(path.join(root,'server'))).filter(f=>f.endsWith('.py')).map(f=>'server/'+f)])
  hashes[file]=sha(await readFile(path.join(root,file)))
 for(const [file,hash] of Object.entries(await treeHashes(path.join(root,'web/generated/public'))))hashes['web/generated/public/'+file]=hash
 return Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b)))
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export async function cleanBuild(root,{build=(web,env)=>execFileSync('npm',['run','build'],{cwd:web,env,stdio:'inherit',timeout:60000}),verifyVendor=()=>verifyPinnedVendor(root),install=installDependencies}={}){
 const env=controlledNodeEnvironment(path.join(root,'web'))
 const vendorSourceCommit=verifyVendor()
 const web=path.join(root,'web'),sources=await sourceHashes(root)
 const dependencies=await install(web)
 await rm(path.join(web,'dist'),{recursive:true,force:true})
 assertNoProjectNpmConfig(web)
 await build(web,env)
 assertNoProjectNpmConfig(web)
 await verifyDependencies(web,dependencies)
 verifyVendor()
 if(!same(sources,await sourceHashes(root)))throw Error('sources changed during build')
 return {vendorSourceCommit,dependencies,environment:{kind:'controlled allowlist v1',values:env},kind:'clean build immediately before preview',sourcesSha256:sources,distSha256:await treeHashes(path.join(web,'dist'))}
}
export async function assertBuildCurrent(root,manifest,{verifyVendor=()=>verifyPinnedVendor(root)}={}){
 assertNoProjectNpmConfig(path.join(root,'web'))
 await verifyDependencies(path.join(root,'web'),manifest.dependencies)
 verifyVendor()
 if(!same(manifest.sourcesSha256,await sourceHashes(root)))throw Error('sources changed after build')
 if(!same(manifest.distSha256,await treeHashes(path.join(root,'web/dist'))))throw Error('bundle changed after build')
 assertNoProjectNpmConfig(path.join(root,'web'))
 await verifyDependencies(path.join(root,'web'),manifest.dependencies)
 verifyVendor()
}
