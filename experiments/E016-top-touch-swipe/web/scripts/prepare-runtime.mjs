import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, access, writeFile, chmod } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertCleanGitSource, assertTreeHash, attestToolchain, hashTree } from './artifact-attestation.mjs'
import { resetCompilerCache, ensureToolchain, normalizeToolchainSource, pinnedCompilerEnvironment, pythonLauncher, renderEmscriptenConfig, writeConfigAtomically } from './toolchain-cache.mjs'
const web = fileURLToPath(new URL('../', import.meta.url))
const experiment = path.resolve(web, '..')
const repo = path.resolve(experiment, '../..')
const generated = path.join(web, 'generated')
const source = path.join(generated, 'pinned-stack-chan')
const patch = path.join(experiment, 'runtime/wasm-top-touch.patch')
const base = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const fullBuild = !process.argv.includes('--stage-only')
if (fullBuild && process.platform !== 'darwin') {
  throw new Error('E016 WASM preparation supports macOS only (APFS clone copy and Moddable mac tools); use a macOS host. --stage-only remains portable.')
}
// Invalidate served artifacts before source/tool validation, including failed retries.
if (fullBuild) {
  await rm(path.join(generated,'public'),{recursive:true,force:true})
  await rm(path.join(generated,'stage-hash'),{force:true})
}
const previous = fullBuild ? normalizeToolchainSource(process.env.E016_TOOLCHAIN_SOURCE) : undefined
if (fullBuild) {
  for (const name of ['moddable/tools/VERSION','emsdk/.emscripten','fontbm/build/fontbm']) {
    try { await access(path.join(previous,name)) } catch { throw new Error(`Incomplete E016_TOOLCHAIN_SOURCE: missing ${name}; see README prerequisites.`) }
  }
}
const capture = (cmd,args,cwd=repo) => execFileSync(cmd,args,{cwd,encoding:'utf8'}).trim()
const run = (cmd,args,cwd=repo,env=process.env) => execFileSync(cmd,args,{cwd,env,stdio:'inherit'})
const hash = async file => createHash('sha256').update(await readFile(file)).digest('hex')
const common = path.dirname(capture('git',['rev-parse','--path-format=absolute','--git-common-dir']))
const vendor = process.env.STACK_CHAN_SOURCE ?? path.join(common,'vendor/stack-chan')
if (capture('git',['rev-parse','HEAD'],vendor) !== base) throw new Error('Pinned vendor revision mismatch')
const patchHash = await hash(patch)
// Never trust an ignored checkout or marker for pinned-SDK test evidence.
await mkdir(generated,{recursive:true})
await rm(path.join(generated,'stage-hash'),{force:true})
await rm(source,{recursive:true,force:true})
run('git',['clone','--shared','--no-checkout',vendor,source])
run('git',['checkout','--detach',base],source)
run('git',['apply','--check',patch],source)
run('git',['apply',patch],source)
await writeFile(path.join(generated,'stage-hash'),patchHash)
const enginePath = path.join(source,'web/src/services/simulator/simulator-engine.d.mts')
await copyFile(path.join(web,'runtime-types/simulator-engine.d.mts'),enginePath)
if (process.argv.includes('--stage-only')) process.exit(0)
const attestationFile = process.env.E016_TOOLCHAIN_ATTESTATION
if (!attestationFile || !path.isAbsolute(attestationFile)) throw new Error('Set E016_TOOLCHAIN_ATTESTATION to an absolute reviewed tool-tree digest manifest; see README')
const expectedTools = JSON.parse(await readFile(attestationFile,'utf8'))
const publicRoot = path.join(generated,'public')
const toolchain = path.join(generated,'toolchain')
const validateToolchain = async folder => {
  for (const [name,revision] of [['moddable','b6e06ba70506a7381ffb28e09e3175bf4e99f305'],['emsdk','14c18b569f55138fe4963924162244251f454fb0'],['fontbm','7677b908523e909679f67cd5c170396bb9def1aa']]) {
    if (capture('git',['rev-parse','HEAD'],path.join(folder,name))!==revision) throw new Error(`Tool revision mismatch: ${name}`)
    assertCleanGitSource(path.join(folder,name))
  }
  for (const file of ['moddable/tools/VERSION','moddable/build/bin/mac/release/mcconfig','moddable/build/bin/mac/release/xsc','emsdk/node/22.16.0_64bit/bin/node','emsdk/python/3.13.3_64bit/bin/python3','emsdk/upstream/emscripten/emcc','emsdk/upstream/bin/clang','emsdk/upstream/bin/wasm-ld','fontbm/build/fontbm']) await access(path.join(folder,file))
  if ((await readFile(path.join(folder,'moddable/tools/VERSION'),'utf8')).trim()!=='9.5.0') throw new Error('Moddable 9.5.0 required')
  await attestToolchain(folder,expectedTools)
}
// Validate the external source as well as every cached/staged copy.
await validateToolchain(previous)
await ensureToolchain({source:previous,destination:toolchain,validate:validateToolchain,copy:(from,to)=>run('cp',['-cR',from,to])})
const moddable = path.join(toolchain,'moddable')
const emsdk = path.join(toolchain,'emsdk')
const fontbm = path.join(toolchain,'fontbm/build/fontbm')
const config = path.join(emsdk,'.emscripten')
await writeConfigAtomically(config,renderEmscriptenConfig())
const launcher=path.join(generated,'python-no-bytecode')
await writeConfigAtomically(launcher,pythonLauncher(path.join(emsdk,'python/3.13.3_64bit/bin/python3')))
await chmod(launcher,0o755)
const compilerCache = path.join(generated,'em-cache')
// Clear before any compiler invocation, including its version/sanity probe.
await resetCompilerCache(compilerCache)
const env = {...pinnedCompilerEnvironment(process.env,emsdk,launcher),MODDABLE:moddable,EMSDK:emsdk,EM_CONFIG:config,EM_CACHE:compilerCache,PYTHONDONTWRITEBYTECODE:'1',FONTBM:fontbm,CI:'1',LEFTHOOK:'0',PATH:[path.join(moddable,'build/bin/mac/release'),path.join(emsdk,'upstream/emscripten'),path.join(emsdk,'upstream/bin'),process.env.PATH].join(path.delimiter)}
if ((await readFile(path.join(moddable,'tools/VERSION'),'utf8')).trim()!=='9.5.0') throw new Error('Moddable 9.5.0 required')
const emccVersion=execFileSync('emcc',['--version'],{env,encoding:'utf8'}).split('\n')[0]
if (!emccVersion.includes(' 5.0.1 ')) throw new Error('Emscripten 5.0.1 required')
const firmware=path.join(source,'firmware')
const dependencySnapshot=process.env.E016_FIRMWARE_NODE_MODULES
if (dependencySnapshot) {
  await assertTreeHash(dependencySnapshot,process.env.E016_FIRMWARE_NODE_MODULES_SHA256)
  if(await hash(path.join(path.dirname(dependencySnapshot),'package-lock.json'))!==await hash(path.join(firmware,'package-lock.json'))) throw new Error('Dependency snapshot lock mismatch')
  await rm(path.join(firmware,'node_modules'),{recursive:true,force:true})
  run('cp',['-cR',dependencySnapshot,path.join(firmware,'node_modules')])
  await assertTreeHash(path.join(firmware,'node_modules'),process.env.E016_FIRMWARE_NODE_MODULES_SHA256)
} else run('npm',['ci','--prefer-offline','--no-audit','--no-fund','--logs-dir',path.join(generated,'npm-logs')],firmware,{...env,npm_config_fetch_retries:'0',npm_config_fetch_timeout:'15000'})
const dependencyTreeSha256=await hashTree(path.join(firmware,'node_modules'))
const toolchainTrees=await attestToolchain(toolchain,expectedTools)
run('npm',['run','build:wasm'],firmware,env)
await assertTreeHash(path.join(firmware,'node_modules'),dependencyTreeSha256)
await validateToolchain(toolchain)
await mkdir(path.join(publicRoot,'simulator/assets/case/v1'),{recursive:true})
const runtimeHashes={}
for(const name of ['mc.js','mc.wasm']) {
  const file=path.join(source,'web/simulator',name)
  await copyFile(file,path.join(publicRoot,'simulator',name))
  runtimeHashes[name]=await hash(file)
}
await copyFile(path.join(source,'web/simulator/assets/case/v1/shell.stl'),path.join(publicRoot,'simulator/assets/case/v1/shell.stl'))
const hostHashes={}
for(const name of ['web/simulator/bridge.mjs','web/simulator/geometry.mjs','web/simulator/mod-storage.mjs','web/src/services/simulator/simulator-engine.mjs','firmware/host/modules/input/touch-panel-gesture.ts','firmware/host/modules/input/touch-panel.ts','firmware/host/modules/input/wasm/touch-panel-bridge.js','firmware/host/modules/input/wasm/touch-panel-bridge.c']) hostHashes[name]=await hash(path.join(source,name))
const provenance={experiment:'E016',sourceCommit:base,patchSha256:patchHash,moddableCommit:capture('git',['rev-parse','HEAD'],moddable),moddableVersion:'9.5.0',emsdkCommit:capture('git',['rev-parse','HEAD'],emsdk),emccVersion,fontbmCommit:capture('git',['rev-parse','HEAD'],path.join(toolchain,'fontbm')),hostHashes,runtimeHashes,createdAt:new Date().toISOString(),servedHashes:null,buildCommand:'npm run prepare:poc',toolchainIsolated:true,firmwareLockSha256:await hash(path.join(firmware,'package-lock.json')),dependencySource:dependencySnapshot?'snapshot bytes matched supplied baseline; sibling lockfile matched (not lockfile-derived content verification)':'npm ci',dependencyTreeSha256,toolchainTrees,toolchainAttestationSha256:await hash(attestationFile),toolSourceTrackedClean:true,pythonLauncherSha256:await hash(launcher),treeDigestFormat:'E016-tree-v1'}
// Finalized evidence/runtime-provenance.json is immutable historical evidence.
// Reproduction output belongs to this ignored build directory.
await writeFile(path.join(generated,'runtime-provenance.json'),JSON.stringify(provenance,null,2)+'\n')
await writeFile(path.join(publicRoot,'runtime-provenance.json'),JSON.stringify(provenance,null,2)+'\n')
console.log(JSON.stringify(provenance,null,2))
