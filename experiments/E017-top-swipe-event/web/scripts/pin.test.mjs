import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, appendFile, rm, copyFile, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { verifyVendor, base, repo } from './stage-host.mjs'

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim()
test('shared vendor guard rejects dirty checkout, moved HEAD and mismatched gitlink', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'e017-pin-test-'))
  const repository = path.join(scratch, 'repo'), vendor = path.join(repository, 'vendor/stack-chan')
  try {
    git(scratch, 'clone', '--shared', '--no-checkout', repo, repository)
    await mkdir(path.dirname(vendor), { recursive: true })
    git(scratch, 'clone', '--shared', path.join(repo, 'vendor/stack-chan'), vendor)
    git(vendor, 'checkout', '--detach', base)
    assert.doesNotThrow(() => verifyVendor(vendor, repository))
    const scripts = path.join(repository, 'experiments/E017-top-swipe-event/web/scripts')
    const output = path.join(scripts, '../generated/public')
    await mkdir(scripts, { recursive: true }); await mkdir(output, { recursive: true })
    for (const name of ['build-mod.mjs', 'stage-host.mjs'])
      await copyFile(new URL(name, import.meta.url), path.join(scripts, name))
    const provenance = path.join(output, 'runtime-provenance.json')
    await writeFile(provenance, JSON.stringify({ sourceCommit: base }))
    const rejectBuild = async expected => {
      const archive = path.join(output, 'coami-mod.xsa')
      await writeFile(archive, 'stale archive')
      assert.throws(() => execFileSync(process.execPath, [path.join(scripts, 'build-mod.mjs')],
        { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }), expected)
      await assert.rejects(readFile(archive), { code: 'ENOENT' })
    }
    await appendFile(path.join(vendor, 'firmware/package.json'), '\n')
    assert.throws(() => verifyVendor(vendor, repository), /vendor is not clean/)
    await rejectBuild(/vendor is not clean/)
    git(vendor, 'restore', 'firmware/package.json')
    const parent = git(vendor, '-c', 'user.name=E017 Test', '-c', 'user.email=e017@example.invalid', 'commit-tree', git(vendor, 'rev-parse', `${base}^{tree}`), '-p', base, '-m', 'fixture moved vendor')
    git(vendor, 'checkout', '--detach', parent)
    assert.throws(() => verifyVendor(vendor, repository), /pinned SDK mismatch/)
    await rejectBuild(/pinned SDK mismatch/)
    git(vendor, 'checkout', '--detach', base)
    await writeFile(provenance, JSON.stringify({ sourceCommit: parent }))
    await rejectBuild(/runtime provenance SDK pin mismatch/)
    await mkdir(path.join(scripts, '../../runtime'), { recursive: true })
    await writeFile(path.join(scripts, '../../runtime/wasm-top-touch.patch'), 'current browser/runtime patch')
    await writeFile(provenance, JSON.stringify({ sourceCommit: base, patchSha256: 'stale-patch-hash' }))
    await rejectBuild(/runtime patch mismatch; run npm run runtime/)
    git(repository, 'read-tree', 'HEAD')
    git(repository, 'update-index', '--add', '--cacheinfo', `160000,${parent},vendor/stack-chan`)
    const tree = git(repository, 'write-tree')
    const commit = git(repository, '-c', 'user.name=E017 Test', '-c', 'user.email=e017@example.invalid', 'commit-tree', tree, '-p', 'HEAD', '-m', 'fixture gitlink mismatch')
    git(repository, 'update-ref', 'HEAD', commit)
    assert.throws(() => verifyVendor(vendor, repository), /pinned SDK mismatch/)
    await rejectBuild(/pinned SDK mismatch/)
  } finally { await rm(scratch, { recursive: true, force: true }) }
})
