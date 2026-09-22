import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const webRoot = fileURLToPath(new URL('../', import.meta.url))
const experimentRoot = path.resolve(webRoot, '..')
const repositoryRoot = path.resolve(experimentRoot, '../..')
const upstreamEditor = path.join(repositoryRoot, 'vendor/stack-chan/web/editor')
const { buildModArchive, isXsArchive } = await import(
  pathToFileURL(path.join(upstreamEditor, 'mod-builder.mjs')).href
)
const { default: createTools } = await import(
  pathToFileURL(path.join(upstreamEditor, 'vendor/tools.js')).href
)

const emittedDirectory = path.join(webRoot, 'generated/mod')
execFileSync(path.join(webRoot, 'node_modules/.bin/tsc'), [
  '-p', path.join(experimentRoot, 'mod/tsconfig.json'),
  '--noEmit', 'false', '--outDir', emittedDirectory,
], { stdio: 'inherit' })
const emitted = await readFile(path.join(emittedDirectory, 'mod.js'), 'utf8')
const archive = await buildModArchive(createTools, {
  modJs: emitted,
  name: 'coami-e003',
  onLog: (line) => console.log(`[mod] ${line}`),
})
if (!isXsArchive(archive)) throw new Error('MOD compiler did not produce an XS archive')
const outputDirectory = path.join(webRoot, 'generated/public')
await mkdir(outputDirectory, { recursive: true })
await writeFile(path.join(outputDirectory, 'coami-mod.xsa'), archive)
console.log(`Built coami-mod.xsa (${archive.length} bytes)`)
