import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { build } from 'esbuild'

const webRoot = fileURLToPath(new URL('../', import.meta.url))
const experimentRoot = path.resolve(webRoot, '..')
const repositoryRoot = path.resolve(experimentRoot, '../..')
const upstreamEditor = path.join(repositoryRoot, 'vendor/stack-chan/web/editor')
const { buildModArchive, isXsArchive } = await import(pathToFileURL(path.join(upstreamEditor, 'mod-builder.mjs')).href)
const { default: createTools } = await import(pathToFileURL(path.join(upstreamEditor, 'vendor/tools.js')).href)
const bundled = await build({
  entryPoints: [path.join(experimentRoot, 'mod/mod.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  write: false,
})
const modJs = bundled.outputFiles[0]?.text
if (!modJs) throw new Error('esbuild produced no MOD source')
const archive = await buildModArchive(createTools, { modJs, name: 'coami-e006',
  onLog: (line) => console.log(`[mod] ${line}`) })
if (!isXsArchive(archive)) throw new Error('MOD compiler did not produce an XS archive')
const outputDirectory = path.join(webRoot, 'generated/public')
await mkdir(outputDirectory, { recursive: true })
await writeFile(path.join(outputDirectory, 'coami-mod.xsa'), archive)
console.log(`Built coami-mod.xsa (${archive.length} bytes)`)
