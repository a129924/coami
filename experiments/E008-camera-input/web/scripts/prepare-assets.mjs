import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PINNED_COMMIT = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const webRoot = fileURLToPath(new URL('../', import.meta.url))
const repositoryRoot = path.resolve(webRoot, '../../..')
const vendorRoot = path.join(repositoryRoot, 'vendor/stack-chan')
const generatedRoot = path.join(webRoot, 'generated')
const sourceRoot = path.join(generatedRoot, 'pinned-stack-chan')
const publicSimulator = path.join(generatedRoot, 'public/simulator')

function output(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options }).trim()
}

const gitlink = output('git', ['rev-parse', 'HEAD:vendor/stack-chan'], { cwd: repositoryRoot })
const checkout = output('git', ['rev-parse', 'HEAD'], { cwd: vendorRoot })
if (gitlink !== PINNED_COMMIT || checkout !== PINNED_COMMIT) {
  throw new Error(`Pinned vendor mismatch: gitlink=${gitlink}, checkout=${checkout}`)
}
const vendorChanges = output('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: vendorRoot })
if (vendorChanges) throw new Error('BLOCKED: pinned vendor checkout has tracked or untracked changes')
const moddable = process.env.MODDABLE
if (!moddable) throw new Error('BLOCKED: MODDABLE 9.5.0 is not configured')
const moddableVersion = (await readFile(path.join(moddable, 'tools/VERSION'), 'utf8')).trim()
if (moddableVersion !== '9.5.0') throw new Error(`BLOCKED: Moddable 9.5.0 required, found ${moddableVersion}`)
let emccVersion
try { emccVersion = output('emcc', ['--version']).split('\n')[0] }
catch { throw new Error('BLOCKED: Emscripten 5.0.1 (emcc) is unavailable') }
if (!emccVersion.includes(' 5.0.1 ')) throw new Error(`BLOCKED: Emscripten 5.0.1 required, found ${emccVersion}`)
let fontbm = process.env.FONTBM
if (!fontbm) {
  try { fontbm = output('which', ['fontbm']) }
  catch { throw new Error('BLOCKED: fontbm is unavailable') }
}
if (!fontbm) throw new Error('BLOCKED: fontbm is unavailable')

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
  env: { ...process.env, FONTBM: fontbm } })

await mkdir(path.join(publicSimulator, 'assets/case/v1'), { recursive: true })
const hashes = {}
for (const name of ['mc.js', 'mc.wasm']) {
  const bytes = await readFile(path.join(sourceRoot, 'web/simulator', name))
  hashes[name] = createHash('sha256').update(bytes).digest('hex')
  await writeFile(path.join(publicSimulator, name), bytes)
}
await cp(path.join(vendorRoot, 'web/simulator/assets/case/v1/shell.stl'),
  path.join(publicSimulator, 'assets/case/v1/shell.stl'))
const provenance = { sourceCommit: PINNED_COMMIT, moddableVersion, emccVersion, fontbm, sha256: hashes }
await writeFile(path.join(generatedRoot, 'runtime-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`)
console.log(JSON.stringify(provenance, null, 2))
