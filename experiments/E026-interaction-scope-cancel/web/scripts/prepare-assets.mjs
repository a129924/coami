import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const web = fileURLToPath(new URL('../', import.meta.url)), repo = path.resolve(web, '../../..')
const pin = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322', artifactId = 10585271971
const expected = '0570742fb76a8dd73289d4a06b8b72aaa6f3c516a6cc831a53cdb6320da6d0e7'
const archive = path.join(web, 'generated/official-runtime/web-dist.zip'), target = path.join(web, 'generated/public')
await rm(target, { recursive: true, force: true })
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
if (hash(await readFile(archive)) !== expected) throw Error('Official archive SHA-256 mismatch')
const meta = JSON.parse(await readFile(path.resolve(web, '../evidence/official-artifact.json'), 'utf8'))
if (meta.id !== artifactId || meta.workflow_run?.head_sha !== pin || meta.digest !== `sha256:${expected}` || meta.expired) throw Error('Official artifact provenance mismatch')
const vendor = path.join(repo, 'vendor/stack-chan')
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: vendor, encoding: 'utf8' }).trim() !== pin) throw Error('Vendor pin mismatch')
if (execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: vendor, encoding: 'utf8' }).trim()) throw Error('Vendor must remain clean')
await mkdir(target, { recursive: true })
const names = ['simulator/mc.js', 'simulator/mc.wasm', 'simulator/assets/case/v1/shell.stl']
// Read only three fixed archive entries; no arbitrary ZIP path extraction.
for (const name of names) {
  const bytes = execFileSync('/usr/bin/unzip', ['-p', archive, name], { maxBuffer: 20 * 1024 * 1024 })
  await mkdir(path.dirname(path.join(target, name)), { recursive: true }); await writeFile(path.join(target, name), bytes)
}
const provenance = { experiment: 'E026', sourceCommit: pin, buildPolicy: 'official pinned CI build, not a fresh local rebuild',
  official: { runId: 35444663129, artifactId, archiveSha256: expected, headSha: pin },
  sha256: Object.fromEntries(await Promise.all(names.slice(0, 2).map(async name => [path.basename(name), hash(await readFile(path.join(target, name)))]))),
  host: { bridgeSourceSha256: hash(await readFile(path.join(vendor, 'web/simulator/bridge.mjs'))) } }
await writeFile(path.join(target, 'runtime-provenance.json'), JSON.stringify(provenance, null, 2)+'\n')
console.log(JSON.stringify(provenance, null, 2))
