import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const BASE_SHA = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'

const webRoot = fileURLToPath(new URL('../', import.meta.url))
const experimentRoot = path.resolve(webRoot, '..')
const repositoryRoot = path.resolve(experimentRoot, '../..')
const vendorSource = path.join(repositoryRoot, 'vendor/stack-chan')
const patchPath = path.join(experimentRoot, 'runtime/wasm-top-touch.patch')
const output = path.join(webRoot, 'generated/pinned-stack-chan')
const hostSources = [
  'web/simulator/bridge.mjs',
  'web/simulator/geometry.mjs',
  'web/simulator/mod-storage.mjs',
  'web/src/services/simulator/simulator-engine.mjs',
]
const typeSources = [
  ['runtime-types/bridge.d.mts', 'web/simulator/bridge.d.mts'],
  ['runtime-types/simulator-engine.d.mts', 'web/src/services/simulator/simulator-engine.d.mts'],
]

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit' })
}

function captured(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim()
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

export async function stagePatchedHostRuntime(scratch, outputPath = output) {
  const generatedRoot = path.dirname(outputPath)
  await mkdir(generatedRoot, { recursive: true })
  const staging = await mkdtemp(path.join(generatedRoot, '.pinned-stack-chan-'))
  try {
    for (const source of hostSources) {
      const destination = path.join(staging, source)
      await mkdir(path.dirname(destination), { recursive: true })
      await copyFile(path.join(scratch, source), destination)
    }
    for (const [source, destination] of typeSources) {
      const stagedType = path.join(staging, destination)
      await mkdir(path.dirname(stagedType), { recursive: true })
      await copyFile(path.join(webRoot, source), stagedType)
    }
    await writeFile(path.join(staging, 'runtime-host-provenance.json'), `${JSON.stringify({
      baseSha: BASE_SHA,
      patchSha256: await sha256(patchPath),
      sources: [...hostSources, ...typeSources.map(([, destination]) => destination)],
    }, null, 2)}\n`)
    await rm(outputPath, { recursive: true, force: true })
    await rename(staging, outputPath)
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }
}

async function stageFromPinnedSource() {
  const sourceSha = captured('git', ['rev-parse', 'HEAD'], vendorSource)
  if (sourceSha !== BASE_SHA) throw new Error(`Pinned Stack-chan source mismatch: expected ${BASE_SHA}, got ${sourceSha}`)

  const scratch = await mkdtemp(path.join(tmpdir(), 'coami-e010-host-source-'))
  try {
    run('git', ['clone', '--shared', '--no-checkout', vendorSource, scratch], repositoryRoot)
    run('git', ['checkout', '--detach', BASE_SHA], scratch)
    run('git', ['apply', '--check', patchPath], scratch)
    run('git', ['apply', patchPath], scratch)
    await stagePatchedHostRuntime(scratch)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await stageFromPinnedSource()
}
