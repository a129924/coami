import { createHash } from 'node:crypto'
import { readFile, writeFile, rm, mkdir, copyFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { stageHost, base, web, source, patch, run, capture } from './stage-host.mjs'

const publicRoot = path.join(web, 'generated/public')
const hash = async file => createHash('sha256').update(await readFile(file)).digest('hex')
// Failure cannot leave a stale runnable runtime/MOD behind.
await rm(publicRoot, { recursive: true, force: true })
const pins = {
  moddable: 'b6e06ba70506a7381ffb28e09e3175bf4e99f305',
  emsdk: '14c18b569f55138fe4963924162244251f454fb0',
  fontbm: '7677b908523e909679f67cd5c170396bb9def1aa',
}
const roots = { moddable: process.env.MODDABLE, emsdk: process.env.EMSDK, fontbm: process.env.FONTBM_SOURCE }
const generated = await realpath(path.join(web, 'generated'))
for (const [name, root] of Object.entries(roots)) {
  if (!root) throw new Error(`BLOCKED: ${name} is not configured`)
  const actual = await realpath(root)
  if (!actual.startsWith(`${generated}${path.sep}`)) throw new Error(`BLOCKED: ${name} must be an E021 isolated copy`)
  if (capture('git', ['rev-parse','HEAD'], actual) !== pins[name] || capture('git',['status','--porcelain','--untracked-files=no'],actual))
    throw new Error(`BLOCKED: ${name} source pin or tracked cleanliness mismatch`)
}
const moddableVersion = (await readFile(path.join(roots.moddable,'tools/VERSION'),'utf8')).trim()
if (moddableVersion !== '9.5.0') throw new Error('Moddable 9.5.0 required')
const emcc = capture('which',['emcc'],web)
if (!(await realpath(emcc)).startsWith(`${await realpath(roots.emsdk)}${path.sep}`)) throw new Error('emcc outside isolated E021 emsdk')
const emccVersion = capture(emcc,['--version'],web).split('\n')[0]
if (!emccVersion.includes(' 5.0.1 ') || !emccVersion.includes('8c5f43157a3f069ade75876e23061330521eabde')) throw new Error('Emscripten version/source mismatch')
const fontbm = await realpath(process.env.FONTBM ?? '')
if (!fontbm.startsWith(`${await realpath(roots.fontbm)}${path.sep}`)) throw new Error('fontbm outside isolated source')
await stageHost()
const originalTime = path.join(roots.moddable,'modules/base/time/time.js')
if (!(await readFile(originalTime)).equals(await readFile(path.join(source,'firmware/host/modules/input/wasm/pinned-time.js')))) throw new Error('BLOCKED: private Time alias differs from pinned Moddable source')
const firmware = path.join(source,'firmware')
const env = { ...process.env, CI: '1', LEFTHOOK: '0' }
run('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],firmware,env)
run('npm',['run','build:wasm'],firmware,env)
const simulator = path.join(publicRoot,'simulator')
await mkdir(simulator,{recursive:true})
const sha256 = {}
for (const file of ['mc.js','mc.wasm']) {
  await copyFile(path.join(source,'web/simulator',file),path.join(simulator,file))
  sha256[file] = await hash(path.join(simulator,file))
}
const tools = { originalTimeJsSha256: await hash(originalTime), originalWasmTimeCSha256: await hash(path.join(roots.moddable,'modules/base/time/wasm/modTime.c')), moddableVersion, sourceCommits: pins, emccVersion, emccSha256: await hash(emcc), fontbmSha256: await hash(fontbm) }
for (const name of ['mcconfig','xsc']) {
  const binary = await realpath(capture('which',[name],web))
  if (!binary.startsWith(`${await realpath(roots.moddable)}${path.sep}`)) throw new Error(`${name} outside isolated Moddable`)
  tools[`${name}Sha256`] = await hash(binary)
}
const provenance = { clockCompatibility: { scope:'owner-approved E021 scratch platform only', source:'emscripten_get_now', unit:'real monotonic milliseconds', originalPinnedWasmClock:'xs_time_ticks stub preserved; E021 WASM time module wrapper uses native monotonic ticks; original Time module preserved under private alias', artificialClock:false }, experiment:'E021', sourceCommit:base, patchSha256:await hash(patch), tools, sha256,
  commands:['npm ci --ignore-scripts --no-audit --no-fund','npm run build:wasm'],
  scope:'simulator-only; isolated copies of pinned tool sources, including existing local compiler cache; no hardware evidence' }
const bytes = `${JSON.stringify(provenance,null,2)}\n`
// Runtime-only provenance is staged; build-mod publishes the complete ledger.
try {
  await writeFile(path.join(publicRoot,'runtime-provenance.json'),bytes)
} catch(error) {
  await rm(publicRoot,{recursive:true,force:true})
  throw error
}
console.log(bytes)
