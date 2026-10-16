import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, rm, mkdtemp, rename } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { verifyVendor, base, patch } from './stage-host.mjs'

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const webRoot = fileURLToPath(new URL('../', import.meta.url))
const experimentRoot = path.resolve(webRoot, '..')
const repositoryRoot = path.resolve(experimentRoot, '../..')
const upstreamEditor = path.join(repositoryRoot, 'vendor/stack-chan/web/editor')
const emittedDirectory = path.join(webRoot, 'generated/mod')
export const archiveModulePaths = ['observer.js']
const outputDirectory = path.join(webRoot, 'generated/public')
const archivePath = path.join(outputDirectory, 'coami-mod.xsa')
// Remove before compilation: a failed repeat cannot serve a stale MOD.
await rm(archivePath, { force: true })
verifyVendor()
const provenancePath = path.join(outputDirectory, 'runtime-provenance.json')
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'))
if (provenance.sourceCommit !== base) throw new Error('runtime provenance SDK pin mismatch')
if (provenance.patchSha256 !== sha256(await readFile(patch))) throw new Error('runtime patch mismatch; run npm run runtime before npm run mod')
const { buildModArchive, isXsArchive } = await import(pathToFileURL(path.join(upstreamEditor, 'mod-builder.mjs')).href)
const { default: createTools } = await import(pathToFileURL(path.join(upstreamEditor, 'vendor/tools.js')).href)
execFileSync(path.join(webRoot, 'node_modules/.bin/tsc'), ['-p', path.join(experimentRoot, 'mod/tsconfig.json'), '--noEmit', 'false', '--outDir', emittedDirectory], { stdio: 'inherit' })
const modJs = await readFile(path.join(emittedDirectory, 'mod.js'), 'utf8')
const files = await Promise.all(archiveModulePaths.map(async (modulePath) => ({
  path: modulePath,
  bytes: await readFile(path.join(emittedDirectory, modulePath)),
})))
const archive = await buildModArchive(createTools, {
  modJs,
  name: 'coami-e021',
  files,
  manifest: { modules: { '*': ['./mod', ...archiveModulePaths.map((modulePath) => `./${modulePath.slice(0, -3)}`)] } },
  onLog: (line) => console.log(`[mod] ${line}`),
})
if (!isXsArchive(archive)) throw new Error('MOD compiler did not produce an XS archive')
await mkdir(outputDirectory, { recursive: true })
provenance.mod = { sha256: sha256(archive), sourceSha256: {} }
for (const file of ['mod.ts', 'observer.ts']) provenance.mod.sourceSha256[file] = sha256(await readFile(path.join(experimentRoot, 'mod', file)))
const provenanceBytes = `${JSON.stringify(provenance, null, 2)}\n`
// Publish accepted evidence only after the complete runtime/MOD build succeeds.
let temporary
try {
  await writeFile(archivePath, archive)
  await writeFile(provenancePath, provenanceBytes)
  temporary = await mkdtemp(path.join(experimentRoot, 'evidence/.runtime-provenance-'))
  const staged = path.join(temporary, 'provenance.json')
  await writeFile(staged, provenanceBytes)
  await rename(staged, path.join(experimentRoot, 'evidence/runtime-provenance.json'))
} catch (error) {
  await rm(outputDirectory, { recursive: true, force: true })
  throw error
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true })
}
console.log(`Built coami-mod.xsa (${archive.length} bytes)`)
