import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// The Pages commit was built from the pinned submodule revision b31bc0d9.
const DEPLOY_COMMIT = 'b0bcb60e17336e6bfb4af7466eb21a6ebbde46cd'
const ASSETS = {
  'mc.js': '93008fd8c767b2c5ccb8950c0ef290453e900224197420abbc4cfc940907600f',
  'mc.wasm': 'b3bb666cc67c3e2f039b86be59c4a0d1a551b6bffe4e64a5e867380fa3bbbe83',
}
const webRoot = fileURLToPath(new URL('../', import.meta.url))
const publicSimulator = path.join(webRoot, 'generated/public/simulator')
const upstreamSimulator = path.resolve(webRoot, '../../../vendor/stack-chan/web/simulator')
await mkdir(path.join(publicSimulator, 'assets/case/v1'), { recursive: true })

for (const [name, expectedSha256] of Object.entries(ASSETS)) {
  const output = path.join(publicSimulator, name)
  let bytes
  try {
    bytes = await readFile(output)
  } catch {
    const url = `https://raw.githubusercontent.com/stack-chan/stack-chan/${DEPLOY_COMMIT}/web/simulator/${name}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Could not fetch ${url}: ${response.status}`)
    bytes = Buffer.from(await response.arrayBuffer())
  }
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== expectedSha256) throw new Error(`${name} SHA-256 mismatch: ${actual}`)
  await writeFile(output, bytes)
  console.log(`${name}: SHA-256 verified`)
}
await copyFile(
  path.join(upstreamSimulator, 'assets/case/v1/shell.stl'),
  path.join(publicSimulator, 'assets/case/v1/shell.stl'),
)
console.log('Simulator shell copied from pinned Stack-chan submodule')
