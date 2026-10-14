import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {verifyHarnessInputs,verifyProductionBundle} from './harness-inputs.mjs'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
async function fixture(run){
 const root=await mkdtemp(path.join(tmpdir(),'gaze-reviewed-')),web=path.join(root,'experiments/test/web')
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()
 try{
  await mkdir(path.join(web,'src'),{recursive:true});await mkdir(path.join(web,'scripts'));await mkdir(path.join(web,'dist'))
  await writeFile(path.join(root,'.gitignore'),'dist/\n')
  await writeFile(path.join(web,'src/main.ts'),'reviewed logic')
  const sources={'src/main.ts':hash('reviewed logic')}
  await writeFile(path.join(web,'src/harness-pin.json'),JSON.stringify(sources))
  await writeFile(path.join(web,'dist/app.js'),'reviewed bundle')
  const pin={sourceCommit:'build-commit',bundleSha256:{'app.js':hash('reviewed bundle')}}
  await writeFile(path.join(web,'scripts/production-bundle-pin.json'),JSON.stringify(pin))
  await writeFile(path.join(web,'dist/harness-provenance.json'),JSON.stringify({mode:'production',sources,...pin}))
  git('init','-q');git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','-c','core.hooksPath=/dev/null','commit','-qm','reviewed fixture')
  pin.sourceCommit=git('rev-parse','HEAD')
  await writeFile(path.join(web,'scripts/production-bundle-pin.json'),JSON.stringify(pin))
  await writeFile(path.join(web,'dist/harness-provenance.json'),JSON.stringify({mode:'production',sources,...pin}))
  git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','-c','core.hooksPath=/dev/null','commit','-qm','record build pin')
  await run({web,git,sources})
 }finally{await rm(root,{recursive:true,force:true})}
}
test('source edits with recomputed harness pins cannot bypass clean Git anchor',async()=>fixture(async({web,sources})=>{
 assert.deepEqual(await verifyHarnessInputs(web),sources)
 await writeFile(path.join(web,'src/main.ts'),'altered pass logic')
 await writeFile(path.join(web,'src/harness-pin.json'),JSON.stringify({'src/main.ts':hash('altered pass logic')}))
 await assert.rejects(verifyHarnessInputs(web),/clean committed experiment/)
}))
test('modified dist plus recomputed provenance fails committed production pin',async()=>fixture(async({web,git})=>{
 await verifyProductionBundle(web,path.join(web,'dist'))
 const manifest=path.join(web,'dist/harness-provenance.json'),rebuilt=JSON.parse(await readFile(manifest,'utf8'));rebuilt.sourceCommit=git('rev-parse','HEAD');await writeFile(manifest,JSON.stringify(rebuilt))
 await verifyProductionBundle(web,path.join(web,'dist'))
 await writeFile(path.join(web,'dist/app.js'),'altered pass logic')
 const f=path.join(web,'dist/harness-provenance.json'),p=JSON.parse(await readFile(f,'utf8'));p.bundleSha256['app.js']=hash('altered pass logic');await writeFile(f,JSON.stringify(p))
 await assert.rejects(verifyProductionBundle(web,path.join(web,'dist')),/production bundle/)
}))
