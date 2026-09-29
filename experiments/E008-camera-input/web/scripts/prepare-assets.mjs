import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PINNED_COMMIT = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const PINNED_MODDABLE_COMMIT = 'b6e06ba70506a7381ffb28e09e3175bf4e99f305'
const PINNED_EMSDK_COMMIT = '14c18b569f55138fe4963924162244251f454fb0'
const PINNED_EMSCRIPTEN_COMMIT = '8c5f43157a3f069ade75876e23061330521eabde'
const PINNED_FONTBM_COMMIT = '7677b908523e909679f67cd5c170396bb9def1aa'
const webRoot = fileURLToPath(new URL('../', import.meta.url))
const repositoryRoot = path.resolve(webRoot, '../../..')
const vendorRoot = path.join(repositoryRoot, 'vendor/stack-chan')
const generatedRoot = path.join(webRoot, 'generated')
const sourceRoot = path.join(generatedRoot, 'pinned-stack-chan')
const publicRoot = path.join(generatedRoot, 'public')
const publicSimulator = path.join(publicRoot, 'simulator')
const provenancePath = path.join(generatedRoot, 'runtime-provenance.json')

function output(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options }).trim()
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
  moddableTools = {}
  for (const name of ['mcconfig', 'xsc']) {
    const binary = await realpath(output('which', [name]))
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
let emsdkRoot, emccBinary, emccSha256, emccVersion
try {
  emsdkRoot = await realpath(emsdk)
  const checkoutRoot = await realpath(output('git', ['rev-parse', '--show-toplevel'], { cwd: emsdkRoot }))
  if (checkoutRoot !== emsdkRoot) throw new Error('EMSDK is not the checkout root')
  const sourceCommit = output('git', ['rev-parse', 'HEAD'], { cwd: emsdkRoot })
  if (sourceCommit !== PINNED_EMSDK_COMMIT) throw new Error(`emsdk source commit is ${sourceCommit}`)
  const trackedChanges = output('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: emsdkRoot })
  if (trackedChanges) throw new Error('emsdk source has tracked changes')
  emccBinary = await realpath(output('which', ['emcc']))
  const binaryInfo = await stat(emccBinary)
  if (!binaryInfo.isFile() || (binaryInfo.mode & 0o111) === 0) throw new Error('emcc is not executable')
  const relative = path.relative(path.join(emsdkRoot, 'upstream/emscripten'), emccBinary)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('emcc is outside the emsdk upstream/emscripten directory')
  emccVersion = output(emccBinary, ['--version']).split('\n')[0]
  if (!emccVersion.includes(' 5.0.1 ') || !emccVersion.includes(PINNED_EMSCRIPTEN_COMMIT))
    throw new Error(`Emscripten 5.0.1 (${PINNED_EMSCRIPTEN_COMMIT}) required, found ${emccVersion}`)
  emccSha256 = createHash('sha256').update(await readFile(emccBinary)).digest('hex')
} catch (error) {
  throw new Error(`BLOCKED: pinned Emscripten source and executable could not be verified: ${String(error)}`)
}
let fontbm = process.env.FONTBM
if (!fontbm) {
  try { fontbm = output('which', ['fontbm']) }
  catch { throw new Error('BLOCKED: fontbm is unavailable') }
}
if (!fontbm) throw new Error('BLOCKED: fontbm is unavailable')
const fontbmSource = process.env.FONTBM_SOURCE ?? path.resolve(fontbm, '../..')
let fontbmBinary, fontbmSourceRoot, fontbmCommit, fontbmSha256
try {
  fontbmBinary = await realpath(fontbm)
  fontbmSourceRoot = await realpath(fontbmSource)
  const binaryInfo = await stat(fontbmBinary)
  if (!binaryInfo.isFile() || (binaryInfo.mode & 0o111) === 0) throw new Error('fontbm is not executable')
  const relativeBinary = path.relative(fontbmSourceRoot, fontbmBinary)
  if (!relativeBinary || relativeBinary === '..' || relativeBinary.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeBinary)) throw new Error('fontbm binary is outside its source checkout')
  const checkoutRoot = await realpath(output('git', ['rev-parse', '--show-toplevel'], { cwd: fontbmSourceRoot }))
  if (checkoutRoot !== fontbmSourceRoot) throw new Error('fontbm source is not the checkout root')
  fontbmCommit = output('git', ['rev-parse', 'HEAD'], { cwd: fontbmSourceRoot })
  if (fontbmCommit !== PINNED_FONTBM_COMMIT) throw new Error(`fontbm source commit is ${fontbmCommit}`)
  const trackedChanges = output('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: fontbmSourceRoot })
  if (trackedChanges) throw new Error('fontbm source has tracked changes')
  fontbmSha256 = createHash('sha256').update(await readFile(fontbmBinary)).digest('hex')
} catch (error) {
  throw new Error(`BLOCKED: pinned fontbm source and executable could not be verified: ${String(error)}`)
}

await mkdir(generatedRoot, { recursive: true })
await rm(sourceRoot, { recursive: true, force: true })
await cp(vendorRoot, sourceRoot, {
  recursive: true,
  force: true,
  filter: (source) => !['.git', 'node_modules', 'dist', 'mc.js', 'mc.wasm'].includes(path.basename(source)),
})
execFileSync('npm', ['ci'], { cwd: path.join(sourceRoot, 'firmware'), stdio: 'inherit',
  env: { ...process.env, CI: '1', LEFTHOOK: '0' } })
execFileSync('npm', ['run', 'build:wasm'], { cwd: path.join(sourceRoot, 'firmware'), stdio: 'inherit',
  env: { ...process.env, FONTBM: fontbmBinary } })

await mkdir(path.join(publicSimulator, 'assets/case/v1'), { recursive: true })
const hashes = {}
for (const name of ['mc.js', 'mc.wasm']) {
  const bytes = await readFile(path.join(sourceRoot, 'web/simulator', name))
  hashes[name] = createHash('sha256').update(bytes).digest('hex')
  await writeFile(path.join(publicSimulator, name), bytes)
}
await cp(path.join(vendorRoot, 'web/simulator/assets/case/v1/shell.stl'),
  path.join(publicSimulator, 'assets/case/v1/shell.stl'))
const provenance = { sourceCommit: PINNED_COMMIT, moddableVersion, emccVersion,
  moddable: { path: moddableRoot, sourceCommit: PINNED_MODDABLE_COMMIT, tools: moddableTools },
  emscripten: { emsdkPath: emsdkRoot, emsdkCommit: PINNED_EMSDK_COMMIT,
    upstreamCommit: PINNED_EMSCRIPTEN_COMMIT, emccPath: emccBinary, emccSha256 },
  fontbm: { path: fontbmBinary, sourceCommit: fontbmCommit, sha256: fontbmSha256 }, sha256: hashes }
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`)
console.log(JSON.stringify(provenance, null, 2))
