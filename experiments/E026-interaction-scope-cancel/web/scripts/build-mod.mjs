import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const webRoot = fileURLToPath(new URL('../', import.meta.url))
const experimentRoot = path.resolve(webRoot, '..')
const repositoryRoot = path.resolve(experimentRoot, '../..')
const upstreamEditor = path.join(repositoryRoot, 'vendor/stack-chan/web/editor')
// Standalone MOD rebuild failure must not leave an old archive runnable.
await rm(path.join(webRoot, 'generated/public/coami-mod.xsa'), { force: true })
const { buildModArchive, isXsArchive } = await import(pathToFileURL(path.join(upstreamEditor, 'mod-builder.mjs')).href)
const { default: createTools } = await import(pathToFileURL(path.join(upstreamEditor, 'vendor/tools.js')).href)
const emittedDirectory = path.join(webRoot, 'generated/mod')
execFileSync(path.join(webRoot, 'node_modules/.bin/tsc'), [
  '-p', path.join(experimentRoot, 'mod/tsconfig.json'), '--noEmit', 'false', '--outDir', emittedDirectory,
], { stdio: 'inherit' })
const emitted = await readFile(path.join(emittedDirectory, 'mod.js'), 'utf8')
const archive = await buildModArchive(createTools, { modJs: emitted, name: 'coami-e026',
  onLog: (line) => console.log(`[mod] ${line}`) })
if (!isXsArchive(archive)) throw new Error('MOD compiler did not produce an XS archive')
const outputDirectory = path.join(webRoot, 'generated/public')
await mkdir(outputDirectory, { recursive: true })
await writeFile(path.join(outputDirectory, 'coami-mod.xsa'), archive)
console.log(`Built coami-mod.xsa (${archive.length} bytes)`)

const provenancePath = path.join(outputDirectory, 'runtime-provenance.json')
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
provenance.mod = { sha256: hash(archive), sourceSha256: hash(await readFile(path.join(experimentRoot, 'mod/mod.ts'))) }
provenance.host = { bridgeSourceSha256: hash(await readFile(path.join(repositoryRoot, 'vendor/stack-chan/web/simulator/bridge.mjs'))) }
provenance.host.observerSourceSha256 = hash(await readFile(path.join(webRoot, 'src/audio-adapter.ts')))
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`)
await mkdir(path.join(experimentRoot, 'evidence'), { recursive: true })
await writeFile(path.join(experimentRoot, 'evidence/runtime-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`)
