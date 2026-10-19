import {defineConfig} from 'vite'
import {execFileSync} from 'node:child_process'
import {existsSync,readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const web=fileURLToPath(new URL('.',import.meta.url))
const repo=path.resolve(web,'../../..'),vendor=path.join(repo,'vendor/stack-chan'),pin='b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const git=(args:string[],cwd:string):string=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim()
if(git(['rev-parse','HEAD:vendor/stack-chan'],repo)!==pin||git(['rev-parse','HEAD'],vendor)!==pin||git(['status','--porcelain=v1','--untracked-files=all'],vendor))throw Error('pinned vendor mismatch/dirty')
const archive=path.join(web,'generated/coami-mod.xsa')
const manifest=path.join(web,'generated/mod-provenance.json')
if(existsSync(archive)){
 if(!existsSync(manifest))throw Error('prepare:poc required: MOD provenance missing')
 const p=JSON.parse(readFileSync(manifest,'utf8')) as {sha256:string;sources:Record<string,string>}
 if(createHash('sha256').update(readFileSync(archive)).digest('hex')!==p.sha256)throw Error('MOD archive changed; prepare:poc required')
 for(const [file,hash]of Object.entries(p.sources))if(createHash('sha256').update(readFileSync(path.join(web,'../mod',file))).digest('hex')!==hash)throw Error('MOD sources changed; prepare:poc required')
}
const modSha=existsSync(archive)?createHash('sha256').update(readFileSync(archive)).digest('hex'):''
export default defineConfig({define:{__MOD_SHA256__:JSON.stringify(modSha)},publicDir:'generated/public',resolve:{alias:[{find:/^three\/addons\/(.*)$/,replacement:path.join(web,'node_modules/three/examples/jsm/$1')},{find:/^three$/,replacement:path.join(web,'node_modules/three/build/three.module.js')}]},server:{host:'127.0.0.1',port:5203,strictPort:true,fs:{allow:[path.resolve(web,'../../..')]}},preview:{host:'127.0.0.1',port:5203,strictPort:true}})
