import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { stagePatchedHostRuntime } from './stage-runtime-host.mjs'

const BASE_SHA = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
const webRoot = fileURLToPath(new URL('../', import.meta.url))
const experimentRoot = path.resolve(webRoot, '..')
const repositoryRoot = path.resolve(experimentRoot, '../..')
const vendorSource = path.join(repositoryRoot, 'vendor/stack-chan')
const patchPath = path.join(experimentRoot, 'runtime/wasm-top-touch.patch')
const output = path.join(webRoot, 'generated/public/simulator')
const provenancePath = path.join(experimentRoot, 'evidence/wasm-runtime-provenance.md')

const canonicalTmpdir = await realpath(tmpdir())
const scratchEnv = { ...process.env, TMPDIR: canonicalTmpdir }

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, env: scratchEnv, stdio: 'inherit' })
}

function captured(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim()
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

const sourceSha = captured('git', ['rev-parse', 'HEAD'], vendorSource)
if (sourceSha !== BASE_SHA) throw new Error(`Pinned Stack-chan source mismatch: expected ${BASE_SHA}, got ${sourceSha}`)

const scratch = await mkdtemp(path.join(tmpdir(), 'coami-e010-runtime-'))
try {
  run('git', ['clone', '--shared', '--no-checkout', vendorSource, scratch], repositoryRoot)
  run('git', ['checkout', '--detach', BASE_SHA], scratch)
  run('git', ['apply', '--check', patchPath], scratch)
  run('git', ['apply', patchPath], scratch)
  await stagePatchedHostRuntime(scratch)

  const firmware = path.join(scratch, 'firmware')
  run('npm', ['ci'], firmware)
  run('npm', ['run', 'test:unit'], firmware)
  run('npm', ['run', 'build:wasm'], firmware)

  await mkdir(output, { recursive: true })
  const generatedJs = path.join(scratch, 'web/simulator/mc.js')
  const generatedWasm = path.join(scratch, 'web/simulator/mc.wasm')
  await copyFile(generatedJs, path.join(output, 'mc.js'))
  await copyFile(generatedWasm, path.join(output, 'mc.wasm'))

  const patchSha = await sha256(patchPath)
  const mcJsSha = await sha256(generatedJs)
  const mcWasmSha = await sha256(generatedWasm)
  const moddableVersion = process.env.MODDABLE
    ? (await readFile(path.join(process.env.MODDABLE, 'tools/VERSION'), 'utf8')).trim()
    : 'MODDABLE unset'
  const emccVersion = captured('emcc', ['--version'], firmware).split('\n')[0]
  await mkdir(path.dirname(provenancePath), { recursive: true })
  await writeFile(provenancePath, [
    '# E010 WASM runtime provenance',
    '',
    `- Base SHA: \`${BASE_SHA}\``,
    `- Patch SHA-256: \`${patchSha}\``,
    `- Moddable: \`${moddableVersion}\``,
    `- Emscripten: \`${emccVersion}\``,
    '- Commands: `npm ci`, `npm run test:unit`, `npm run build:wasm` in a disposable scratch checkout.',
    `- mc.js SHA-256: \`${mcJsSha}\``,
    `- mc.wasm SHA-256: \`${mcWasmSha}\``,
    '',
    'The generated files are simulator-only E010 artifacts; no physical K151 claim is made.',
  ].join('\n'))
} finally {
  await rm(scratch, { recursive: true, force: true })
}
