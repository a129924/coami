import {prepareCompilerEnvironment,rebuildFontbm} from './tool-inputs.mjs'
import {verifyStagedHost} from './host-inputs.mjs'
import {rebuildModdableTools,replaceCache} from './build-safety.mjs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { cp, lstat, mkdir, readdir, readFile, readlink, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PINNED_COMMIT = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const PINNED_MODDABLE_COMMIT = 'b6e06ba70506a7381ffb28e09e3175bf4e99f305'
const PINNED_EMSDK_COMMIT = '14c18b569f55138fe4963924162244251f454fb0'
const PINNED_EMSCRIPTEN_COMMIT = '8c5f43157a3f069ade75876e23061330521eabde'
const PINNED_EMSCRIPTEN_RELEASE = 'bf32ae8b61ac8efeb7eca01b54c8307f992724f7'
// Official emsdk 5.0.1 mac arm64 archive, plus emsdk's documented version marker.
// The archive itself is verified by install-compiler.mjs before extraction.
const PINNED_EMSCRIPTEN_TREE_SHA256 = '42ce84c65e00be2818a7733704b9f0217f4c3ee9c7f2bb3366293f60c8e47295'
const PINNED_FONTBM_COMMIT = '7677b908523e909679f67cd5c170396bb9def1aa'
const webRoot = fileURLToPath(new URL('../', import.meta.url))
const repositoryRoot = path.resolve(webRoot, '../../..')
const vendorRoot = path.join(repositoryRoot, 'vendor/stack-chan')
const generatedRoot = path.join(webRoot, 'generated')
const sourceRoot = path.join(generatedRoot, 'pinned-stack-chan')
const publicRoot = path.join(generatedRoot, 'public')
const publicSimulator = path.join(publicRoot, 'simulator')
const provenancePath = path.join(generatedRoot, 'runtime-provenance.json')
// emcc's python -E ignores PYTHONDONTWRITEBYTECODE; the verified installer
// creates a -B wrapper so version checks do not mutate the pinned tree.
process.env.EMSDK_PYTHON = path.join(generatedRoot, 'python-no-bytecode')
process.env.EM_CACHE = path.join(generatedRoot, 'em-cache')

function output(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options }).trim()
}

async function installedTreeSha256(root) {
  const tree = createHash('sha256')
  async function visit(directory, prefix = '') {
    for (const name of (await readdir(directory)).sort()) {
      const absolute = path.join(directory, name)
      const relative = prefix ? `${prefix}/${name}` : name
      const info = await lstat(absolute)
      if (info.isDirectory()) {
        tree.update(`d\0${relative}\0`)
        await visit(absolute, relative)
      } else if (info.isSymbolicLink()) {
        tree.update(`l\0${relative}\0${await readlink(absolute)}\0`)
      } else if (info.isFile()) {
        const file = createHash('sha256')
        for await (const chunk of createReadStream(absolute)) file.update(chunk)
        tree.update(`f\0${relative}\0${info.mode & 0o111 ? 'x' : '-'}\0${file.digest('hex')}\0`)
      } else throw new Error(`unsupported installed file ${relative}`)
    }
  }
  await visit(root)
  return tree.digest('hex')
}

// A failed repeat build must never leave a previously served runtime or MOD in place.
await rm(publicRoot, { recursive: true, force: true })
await rm(provenancePath, { force: true })

const gitlink = output('git', ['rev-parse', 'HEAD:vendor/stack-chan'], { cwd: repositoryRoot })
const checkout = output('git', ['rev-parse', 'HEAD'], { cwd: vendorRoot })
if (gitlink !== PINNED_COMMIT || checkout !== PINNED_COMMIT) {
  throw new Error(`Pinned vendor mismatch: gitlink=${gitlink}, checkout=${checkout}`)
}
const vendorChanges = output('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: vendorRoot })
if (vendorChanges) throw new Error('BLOCKED: pinned vendor checkout has tracked or untracked changes')
const moddable = process.env.MODDABLE
if (!moddable) throw new Error('BLOCKED: MODDABLE 9.5.0 is not configured')
let moddableRoot, moddableVersion, moddableTools
try {
  moddableRoot = await realpath(moddable)
  const checkoutRoot = await realpath(output('git', ['rev-parse', '--show-toplevel'], { cwd: moddableRoot }))
  if (checkoutRoot !== moddableRoot) throw new Error('MODDABLE is not the checkout root')
  const sourceCommit = output('git', ['rev-parse', 'HEAD'], { cwd: moddableRoot })
  if (sourceCommit !== PINNED_MODDABLE_COMMIT) throw new Error(`Moddable source commit is ${sourceCommit}`)
  const trackedChanges = output('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: moddableRoot })
  if (trackedChanges) throw new Error('Moddable source has tracked changes')
  moddableVersion = (await readFile(path.join(moddableRoot, 'tools/VERSION'), 'utf8')).trim()
  if (moddableVersion !== '9.5.0') throw new Error(`Moddable 9.5.0 required, found ${moddableVersion}`)
  await rebuildModdableTools(moddableRoot)
  moddableTools = {}
  for (const name of ['mcconfig', 'xsc', 'xsid', 'xsl', 'tools']) {
    const binary = await realpath(path.join(moddableRoot, 'build/bin/mac/release', name))
    if (['mcconfig','xsc'].includes(name) && await realpath(output('which',[name])) !== binary)
      throw new Error(`${name} on PATH is not the freshly rebuilt tool`)
    const info = await stat(binary)
    if (!info.isFile() || (info.mode & 0o111) === 0) throw new Error(`${name} is not executable`)
    const relative = path.relative(path.join(moddableRoot, 'build/bin'), binary)
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
      throw new Error(`${name} is outside the Moddable build/bin directory`)
    moddableTools[name] = { path: binary, sha256: createHash('sha256').update(await readFile(binary)).digest('hex') }
  }
} catch (error) {
  throw new Error(`BLOCKED: pinned Moddable source and tools could not be verified: ${String(error)}`)
}
const emsdk = process.env.EMSDK
if (!emsdk) throw new Error('BLOCKED: pinned emsdk 5.0.1 is not configured')
let emsdkRoot, emccBinary, emccSha256, emccVersion, emscriptenTreeSha256, compilerEnvironment
try {
  emsdkRoot = await realpath(emsdk)
  const checkoutRoot = await realpath(output('git', ['rev-parse', '--show-toplevel'], { cwd: emsdkRoot }))
  if (checkoutRoot !== emsdkRoot) throw new Error('EMSDK is not the checkout root')
  const sourceCommit = output('git', ['rev-parse', 'HEAD'], { cwd: emsdkRoot })
  if (sourceCommit !== PINNED_EMSDK_COMMIT) throw new Error(`emsdk source commit is ${sourceCommit}`)
  const trackedChanges = output('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: emsdkRoot })
  if (trackedChanges) throw new Error('emsdk source has tracked changes')
  const releases = JSON.parse(await readFile(path.join(emsdkRoot, 'emscripten-releases-tags.json'), 'utf8'))
  if (releases.releases['5.0.1'] !== PINNED_EMSCRIPTEN_RELEASE)
    throw new Error('emsdk 5.0.1 release mapping differs from the pinned package')
  if (process.platform !== 'darwin' || process.arch !== 'arm64')
    throw new Error('installed Emscripten tree is attested only for macOS arm64')
  emscriptenTreeSha256 = await installedTreeSha256(path.join(emsdkRoot, 'upstream'))
  if (emscriptenTreeSha256 !== PINNED_EMSCRIPTEN_TREE_SHA256)
    throw new Error(`installed Emscripten tree differs from the pinned package: ${emscriptenTreeSha256}`)
  emccBinary = await realpath(output('which', ['emcc']))
  const binaryInfo = await stat(emccBinary)
  if (!binaryInfo.isFile() || (binaryInfo.mode & 0o111) === 0) throw new Error('emcc is not executable')
  const relative = path.relative(path.join(emsdkRoot, 'upstream/emscripten'), emccBinary)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('emcc is outside the emsdk upstream/emscripten directory')
  compilerEnvironment = await prepareCompilerEnvironment(emsdkRoot,generatedRoot)
  emccVersion = output(emccBinary, ['--version'],{env:compilerEnvironment.env}).split('\n')[0]
  if (!emccVersion.includes(' 5.0.1 ') || !emccVersion.includes(PINNED_EMSCRIPTEN_COMMIT))
    throw new Error(`Emscripten 5.0.1 (${PINNED_EMSCRIPTEN_COMMIT}) required, found ${emccVersion}`)
  emccSha256 = createHash('sha256').update(await readFile(emccBinary)).digest('hex')
} catch (error) {
  throw new Error(`BLOCKED: pinned Emscripten source and executable could not be verified: ${String(error)}`)
}
const fontbmSource = process.env.FONTBM_SOURCE
if(!fontbmSource)throw Error('BLOCKED: FONTBM_SOURCE must identify the pinned source checkout')
let fontbmBinary, fontbmSourceRoot, fontbmCommit, fontbmSha256
try {
 fontbmSourceRoot=await realpath(fontbmSource)
 const checkoutRoot=await realpath(output('git',['rev-parse','--show-toplevel'],{cwd:fontbmSourceRoot}))
 if(checkoutRoot!==fontbmSourceRoot)throw Error('fontbm source is not the checkout root')
 fontbmCommit=output('git',['rev-parse','HEAD'],{cwd:fontbmSourceRoot})
 if(fontbmCommit!==PINNED_FONTBM_COMMIT)throw Error(`fontbm source commit is ${fontbmCommit}`)
 if(output('git',['status','--porcelain=v1','--untracked-files=no'],{cwd:fontbmSourceRoot}))throw Error('fontbm source has tracked changes')
 const expected=path.join(fontbmSourceRoot,'build/fontbm')
 if(process.env.FONTBM && path.resolve(process.env.FONTBM)!==expected)throw Error('FONTBM must select the clean-built source target')
 await rebuildFontbm(fontbmSourceRoot)
 fontbmBinary=await realpath(expected)
 const info=await stat(fontbmBinary)
 if(!info.isFile()||(info.mode&0o111)===0)throw Error('fontbm is not executable')
 fontbmSha256=createHash('sha256').update(await readFile(fontbmBinary)).digest('hex')
} catch(error){throw Error(`BLOCKED: clean pinned fontbm build failed: ${String(error)}`)}

await mkdir(generatedRoot, { recursive: true })
await rm(sourceRoot, { recursive: true, force: true })
await cp(vendorRoot, sourceRoot, {
  recursive: true,
  force: true,
  filter: (source) => !['.git', 'node_modules', 'dist', 'mc.js', 'mc.wasm'].includes(path.basename(source)),
})
execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: path.join(sourceRoot, 'firmware'), stdio: 'inherit',
  env: { ...compilerEnvironment.env, CI: '1', LEFTHOOK: '0' } })
await replaceCache(path.join(emsdkRoot,'upstream/emscripten/cache'),path.join(generatedRoot,'em-cache'))
execFileSync('npm', ['run', 'build:wasm'], { cwd: path.join(sourceRoot, 'firmware'), stdio: 'inherit',
  env: { ...compilerEnvironment.env, FONTBM: fontbmBinary, EM_CACHE: path.join(generatedRoot, 'em-cache'), PYTHONDONTWRITEBYTECODE: '1' } })

await mkdir(path.join(publicSimulator, 'assets/case/v1'), { recursive: true })
const hashes = {}
for (const name of ['mc.js', 'mc.wasm']) {
  const bytes = await readFile(path.join(sourceRoot, 'web/simulator', name))
  hashes[name] = createHash('sha256').update(bytes).digest('hex')
  await writeFile(path.join(publicSimulator, name), bytes)
}
await cp(path.join(vendorRoot, 'web/simulator/assets/case/v1/shell.stl'),
  path.join(publicSimulator, 'assets/case/v1/shell.stl'))
hashes['assets/case/v1/shell.stl'] = createHash('sha256').update(await readFile(path.join(publicSimulator,'assets/case/v1/shell.stl'))).digest('hex')
const host = await verifyStagedHost(path.join(sourceRoot,'web'))
const provenance = { host, sourceCommit: PINNED_COMMIT, moddableVersion, emccVersion,
  moddable: { path: moddableRoot, sourceCommit: PINNED_MODDABLE_COMMIT, build: 'clean release xsc/xsid/xsl/tools from verified checkout', tools: moddableTools },
  emscripten: { emsdkPath: emsdkRoot, emsdkCommit: PINNED_EMSDK_COMMIT,
    controlledConfig: compilerEnvironment.provenance, release: PINNED_EMSCRIPTEN_RELEASE, upstreamCommit: PINNED_EMSCRIPTEN_COMMIT,
    installedTreeSha256: emscriptenTreeSha256, emccPath: emccBinary, emccSha256 },
  fontbm: { path: fontbmBinary, build: 'clean CMake Release from verified checkout', sourceCommit: fontbmCommit, sha256: fontbmSha256 }, sha256: hashes }
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`)
await writeFile(path.join(publicRoot, 'runtime-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`)
console.log(JSON.stringify(provenance, null, 2))
