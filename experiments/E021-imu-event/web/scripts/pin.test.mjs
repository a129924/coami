import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, appendFile, rm, copyFile, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { verifyVendor, base, repo } from './stage-host.mjs'

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim()
test('shared vendor guard rejects dirty checkout, moved HEAD and mismatched gitlink', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'e021-pin-test-'))
  const repository = path.join(scratch, 'repo'), vendor = path.join(repository, 'vendor/stack-chan')
  try {
    git(scratch, 'clone', '--shared', '--no-checkout', repo, repository)
    await mkdir(path.dirname(vendor), { recursive: true })
    git(scratch, 'clone', '--shared', path.join(repo, 'vendor/stack-chan'), vendor)
    git(vendor, 'checkout', '--detach', base)
    assert.doesNotThrow(() => verifyVendor(vendor, repository))
    const scripts = path.join(repository, 'experiments/E021-imu-event/web/scripts')
    const output = path.join(scripts, '../generated/public')
    await mkdir(scripts, { recursive: true }); await mkdir(output, { recursive: true })
    for (const name of ['build-mod.mjs', 'stage-host.mjs'])
      await copyFile(new URL(name, import.meta.url), path.join(scripts, name))
    const provenance = path.join(output, 'runtime-provenance.json')
    await writeFile(provenance, JSON.stringify({ sourceCommit: base }))
    const rejectBuild = async expected => {
      const archive = path.join(output, 'coami-mod.xsa')
      await writeFile(archive, 'stale archive')
      assert.throws(() => execFileSync(process.execPath, [path.join(scripts, 'build-mod.mjs')],
        { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }), expected)
      await assert.rejects(readFile(archive), { code: 'ENOENT' })
    }
    await appendFile(path.join(vendor, 'firmware/package.json'), '\n')
    assert.throws(() => verifyVendor(vendor, repository), /vendor is not clean/)
    await rejectBuild(/vendor is not clean/)
    git(vendor, 'restore', 'firmware/package.json')
    const parent = git(vendor, '-c', 'user.name=E021 Test', '-c', 'user.email=e021@example.invalid', 'commit-tree', git(vendor, 'rev-parse', `${base}^{tree}`), '-p', base, '-m', 'fixture moved vendor')
    git(vendor, 'checkout', '--detach', parent)
    assert.throws(() => verifyVendor(vendor, repository), /pinned SDK mismatch/)
    await rejectBuild(/pinned SDK mismatch/)
    git(vendor, 'checkout', '--detach', base)
    await writeFile(provenance, JSON.stringify({ sourceCommit: parent }))
    await rejectBuild(/runtime provenance SDK pin mismatch/)
    await mkdir(path.join(scripts, '../../runtime'), { recursive: true })
    await writeFile(path.join(scripts, '../../runtime/wasm-imu.patch'), 'current browser/runtime patch')
    await writeFile(provenance, JSON.stringify({ sourceCommit: base, patchSha256: 'stale-patch-hash' }))
    await rejectBuild(/runtime patch mismatch; run npm run runtime/)
    git(repository, 'read-tree', 'HEAD')
    git(repository, 'update-index', '--add', '--cacheinfo', `160000,${parent},vendor/stack-chan`)
    const tree = git(repository, 'write-tree')
    const commit = git(repository, '-c', 'user.name=E021 Test', '-c', 'user.email=e021@example.invalid', 'commit-tree', tree, '-p', 'HEAD', '-m', 'fixture gitlink mismatch')
    git(repository, 'update-ref', 'HEAD', commit)
    assert.throws(() => verifyVendor(vendor, repository), /pinned SDK mismatch/)
    await rejectBuild(/pinned SDK mismatch/)
  } finally { await rm(scratch, { recursive: true, force: true }) }
})


test('failed preparation clears runnable assets but preserves accepted provenance for missing/mismatched tools',async()=>{
 const scratch=await mkdtemp(path.join(tmpdir(),'e021-prepare-guard-'))
 try {
  const web=path.join(scratch,'web'),scripts=path.join(web,'scripts'),output=path.join(web,'generated/public'),evidence=path.join(scratch,'evidence/runtime-provenance.json')
  await mkdir(scripts,{recursive:true});await mkdir(path.dirname(evidence),{recursive:true})
  for(const name of ['prepare-runtime.mjs','stage-host.mjs'])await copyFile(new URL(name,import.meta.url),path.join(scripts,name))
  const accepted='accepted historical provenance bytes\n'
  const env={...process.env};for(const k of ['MODDABLE','EMSDK','FONTBM_SOURCE','FONTBM'])delete env[k]
  const attempt=async(pattern)=>{
   await mkdir(output,{recursive:true});await writeFile(path.join(output,'mc.wasm'),'stale runnable');await writeFile(evidence,accepted)
   assert.throws(()=>execFileSync(process.execPath,[path.join(scripts,'prepare-runtime.mjs')],{env,stdio:['ignore','pipe','pipe']}),pattern)
   assert.equal(await readFile(evidence,'utf8'),accepted)
   await assert.rejects(readFile(path.join(output,'mc.wasm')),{code:'ENOENT'})
  }
  await attempt(/moddable is not configured/)
  const tool=path.join(web,'generated/toolchain/moddable');await mkdir(tool,{recursive:true});git(tool,'init')
  const tree=git(tool,'write-tree'),commit=git(tool,'-c','user.name=E021 Test','-c','user.email=e021@example.invalid','commit-tree',tree,'-m','wrong tool pin');git(tool,'update-ref','HEAD',commit)
  Object.assign(env,{MODDABLE:tool,EMSDK:tool,FONTBM_SOURCE:tool})
  await attempt(/source pin or tracked cleanliness mismatch/)
 }finally{await rm(scratch,{recursive:true,force:true})}
})

test('only complete runtime plus MOD success atomically publishes accepted provenance',async()=>{
 const scratch=await mkdtemp(path.join(tmpdir(),'e021-prepare-atomic-'))
 try {
  const experiment=path.join(scratch,'repo/experiments/E021'),web=path.join(experiment,'web'),scripts=path.join(web,'scripts'),generated=path.join(web,'generated'),evidence=path.join(experiment,'evidence/runtime-provenance.json')
  const roots=Object.fromEntries(['moddable','emsdk','fontbm'].map(n=>[n,path.join(generated,'toolchain',n)]))
  const source=path.join(generated,'source'),publicRoot=path.join(generated,'public'),tools={emcc:path.join(roots.emsdk,'emcc'),fontbm:path.join(roots.fontbm,'build/fontbm'),mcconfig:path.join(roots.moddable,'bin/mcconfig'),xsc:path.join(roots.moddable,'bin/xsc')}
  await mkdir(scripts,{recursive:true});await mkdir(path.dirname(evidence),{recursive:true})
  await copyFile(new URL('prepare-runtime.mjs',import.meta.url),path.join(scripts,'prepare-runtime.mjs'))
  for(const root of Object.values(roots))await mkdir(root,{recursive:true})
  for(const file of Object.values(tools)){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,'isolated executable fixture')}
  const time=path.join(roots.moddable,'modules/base/time/time.js'),timeC=path.join(roots.moddable,'modules/base/time/wasm/modTime.c')
  for(const file of [time,timeC,path.join(roots.moddable,'tools/VERSION'),path.join(source,'firmware/host/modules/input/wasm/pinned-time.js')]){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,file.endsWith('VERSION')?'9.5.0':'pinned time fixture')}
  const patch=path.join(scratch,'wasm-imu.patch');await writeFile(patch,'patch fixture')
  const pins={moddable:'b6e06ba70506a7381ffb28e09e3175bf4e99f305',emsdk:'14c18b569f55138fe4963924162244251f454fb0',fontbm:'7677b908523e909679f67cd5c170396bb9def1aa'}
  const shim=`import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';
export const web=${JSON.stringify(web)},experiment=${JSON.stringify(experiment)},source=${JSON.stringify(source)},patch=${JSON.stringify(patch)},base='${base}';
const tools=${JSON.stringify(tools)},roots=${JSON.stringify(roots)},pins=${JSON.stringify(pins)};
export const capture=(cmd,args,cwd)=>{if(cmd==='git')return args[0]==='rev-parse'?pins[path.basename(cwd)]:'';if(cmd==='which')return tools[args[0]];if(cmd===tools.emcc)return 'emcc 5.0.1 8c5f43157a3f069ade75876e23061330521eabde';throw new Error('unexpected fixture capture')};
export const stageHost=async()=>{};
export const run=(cmd,args)=>{if(args[1]==='build:wasm'){if(process.env.E021_PREPARE_FAIL)throw new Error('injected build failure');mkdirSync(path.join(source,'web/simulator'),{recursive:true});for(const name of ['mc.js','mc.wasm'])writeFileSync(path.join(source,'web/simulator',name),'new runtime fixture')}};
`
  await writeFile(path.join(scripts,'stage-host.mjs'),shim)
  const env={...process.env,MODDABLE:roots.moddable,EMSDK:roots.emsdk,FONTBM_SOURCE:roots.fontbm,FONTBM:tools.fontbm};delete env.E021_PREPARE_FAIL
  const prepare=()=>execFileSync(process.execPath,[path.join(scripts,'prepare-runtime.mjs')],{env,stdio:['ignore','pipe','pipe']})
  await writeFile(evidence,'accepted provenance bytes');env.E021_PREPARE_FAIL='1';assert.throws(prepare,/injected build failure/);assert.equal(await readFile(evidence,'utf8'),'accepted provenance bytes')
  // Runtime staging must not publish a partial ledger, even if MOD never runs.
  delete env.E021_PREPARE_FAIL;prepare()
  assert.equal(await readFile(evidence,'utf8'),'accepted provenance bytes')
  const runtimeBytes=await readFile(path.join(publicRoot,'runtime-provenance.json'),'utf8')
  assert.equal(JSON.parse(runtimeBytes).sourceCommit,base);assert.equal(JSON.parse(runtimeBytes).mod,undefined)
  await copyFile(new URL('build-mod.mjs',import.meta.url),path.join(scripts,'build-mod.mjs'))
  // build-mod derives repository/editor from the fixture experiment location.
  const editor=path.join(scratch,'repo/vendor/stack-chan/web/editor')
  await mkdir(path.join(editor,'vendor'),{recursive:true})
  await writeFile(path.join(editor,'package.json'),'{"type":"module"}')
  await writeFile(path.join(editor,'vendor/tools.js'),'export default function createTools() {}')
  await writeFile(path.join(editor,'mod-builder.mjs'),`export async function buildModArchive(){if(process.env.E021_MOD_FAIL==='archive')throw new Error('injected archive failure');return new Uint8Array([88,83,65])};export const isXsArchive=()=>process.env.E021_MOD_FAIL!=='invalid';`)
  await appendFile(path.join(scripts,'stage-host.mjs'),'\nexport const verifyVendor=()=>{};\n')
  const compiler=path.join(web,'node_modules/.bin/tsc')
  await mkdir(path.dirname(compiler),{recursive:true})
  await writeFile(compiler,`#!/usr/bin/env node\nconst fs=require('node:fs'),path=require('node:path');if(process.env.E021_MOD_FAIL==='typescript')throw new Error('injected TypeScript failure');const out=process.argv.at(-1);fs.mkdirSync(out,{recursive:true});for(const name of ['mod.js','observer.js'])fs.writeFileSync(path.join(out,name),'compiled MOD fixture');`)
  const {chmod,readdir}=await import('node:fs/promises');await chmod(compiler,0o755)
  await mkdir(path.join(experiment,'mod'),{recursive:true});for(const name of ['mod.ts','observer.ts'])await writeFile(path.join(experiment,'mod',name),'MOD source fixture')
  const build=()=>execFileSync(process.execPath,[path.join(scripts,'build-mod.mjs')],{env,stdio:['ignore','pipe','pipe']})
  for(const mode of ['typescript','archive','invalid']){
   env.E021_MOD_FAIL=mode;await writeFile(path.join(publicRoot,'coami-mod.xsa'),'stale MOD')
   assert.throws(build);assert.equal(await readFile(evidence,'utf8'),'accepted provenance bytes')
   await assert.rejects(readFile(path.join(publicRoot,'coami-mod.xsa')),{code:'ENOENT'})
  }
  delete env.E021_MOD_FAIL;build()
  const complete=await readFile(evidence,'utf8'),parsed=JSON.parse(complete)
  assert.equal(await readFile(path.join(publicRoot,'runtime-provenance.json'),'utf8'),complete)
  assert.ok(parsed.mod.sha256);assert.deepEqual(Object.keys(parsed.mod.sourceSha256),['mod.ts','observer.ts'])
  await rm(evidence);await mkdir(evidence);await writeFile(path.join(evidence,'marker'),'retain destination')
  prepare();assert.equal(await readFile(path.join(evidence,'marker'),'utf8'),'retain destination')
  assert.throws(build);assert.equal(await readFile(path.join(evidence,'marker'),'utf8'),'retain destination')
  await assert.rejects(readFile(path.join(publicRoot,'simulator/mc.wasm')),{code:'ENOENT'})
  assert.deepEqual((await readdir(path.dirname(evidence))).filter(n=>n.startsWith('.runtime-provenance-')),[])
 }finally{await rm(scratch,{recursive:true,force:true})}
})
