import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const web = fileURLToPath(new URL('../', import.meta.url)), experiment = path.resolve(web,'..'), repo = path.resolve(web,'../../..')
const pin = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322', artifactId=10585271971
const expected='0570742fb76a8dd73289d4a06b8b72aaa6f3c516a6cc831a53cdb6320da6d0e7'
const cache=path.join(experiment,'.cache'), target=path.join(web,'public'), archive=path.join(cache,'official-runtime.zip')
await rm(target,{recursive:true,force:true})
await mkdir(cache,{recursive:true})
const meta=JSON.parse(execFileSync('gh',['api',`repos/stack-chan/stack-chan/actions/artifacts/${artifactId}`],{encoding:'utf8'}))
if(meta.id!==artifactId||meta.expired||meta.workflow_run?.id!==35444663129||meta.workflow_run?.head_sha!==pin||meta.digest!==`sha256:${expected}`)throw Error('Official artifact provenance/availability mismatch')
execFileSync('gh',['api',`repos/stack-chan/stack-chan/actions/artifacts/${artifactId}/zip`],{stdio:['ignore',await import('node:fs').then(m=>m.openSync(archive,'w')),'inherit'],maxBuffer:20*1024*1024})
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
if(hash(await readFile(archive))!==expected)throw Error('Official archive SHA mismatch')
const entries=execFileSync('/usr/bin/unzip',['-Z1',archive],{encoding:'utf8'}).trim().split('\n')
if(entries.some(n=>n.startsWith('/')||n.includes('\\')||n.split('/').includes('..')))throw Error('Unsafe archive entry')
const names=['simulator/mc.js','simulator/mc.wasm','simulator/assets/case/v1/shell.stl']
const vendor=path.join(repo,'vendor/stack-chan')
if(execFileSync('git',['rev-parse','HEAD'],{cwd:vendor,encoding:'utf8'}).trim()!==pin||execFileSync('git',['status','--porcelain'],{cwd:vendor,encoding:'utf8'}).trim())throw Error('SDK must be pinned and clean')
for(const name of names){
 if(entries.filter(n=>n===name).length!==1)throw Error('Missing/duplicate expected entry')
 const bytes=execFileSync('/usr/bin/unzip',['-p',archive,name],{maxBuffer:20*1024*1024})
 await mkdir(path.dirname(path.join(target,name)),{recursive:true});await writeFile(path.join(target,name),bytes)
}
const provenance={experiment:'E028',checkedAt:new Date().toISOString(),sourceCommit:pin,buildPolicy:'official pinned CI runtime; freshly compiled E028 MOD',official:{runId:35444663129,artifactId,archiveSha256:expected,headSha:pin,expired:meta.expired},sha256:Object.fromEntries(await Promise.all(names.map(async n=>[n,hash(await readFile(path.join(target,n)))])))}
await writeFile(path.join(target,'runtime-provenance.json'),JSON.stringify(provenance,null,2)+'\n')
console.log(JSON.stringify(provenance,null,2))
