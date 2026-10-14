import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { assertCleanGitSource, assertTreeHash, attestToolchain, hashTree, TOOL_TREES } from './artifact-attestation.mjs'

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'e016-attestation-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const tree = path.join(root, 'tree')
  await mkdir(tree)
  await writeFile(path.join(tree, 'compiler'), 'original pinned executable')
  return { root, tree }
}

test('tree digest survives relocation and includes installed bytes', async t => {
  const f = await fixture(t)
  const before = await hashTree(f.tree)
  assert.match(before, /^[a-f0-9]{64}$/)
  const relocated = path.join(f.root, 'moved')
  await cp(f.tree, relocated, { recursive: true })
  assert.equal(await hashTree(relocated), before)
  await writeFile(path.join(relocated, 'compiler'), 'replaced executable')
  assert.notEqual(await hashTree(relocated), before)
})

test('expected digest rejects modified snapshot despite unchanged sibling lockfile', async t => {
  const f = await fixture(t)
  await writeFile(path.join(f.root, 'package-lock.json'), 'same lockfile')
  const expected = await hashTree(f.tree)
  await assertTreeHash(f.tree, expected)
  await writeFile(path.join(f.tree, 'compiler'), 'modified dependency or tool')
  await assert.rejects(assertTreeHash(f.tree, expected), /digest mismatch/)
})

test('hashing rejects links outside the attested tree', async t => {
  const f = await fixture(t)
  await writeFile(path.join(f.root, 'outside'), 'unattested bytes')
  await symlink('../outside', path.join(f.tree, 'compiler-link'))
  await assert.rejects(hashTree(f.tree), /outside attested tree/)
})

test('tracked modifications are rejected even when HEAD is unchanged', async t => {
  const f = await fixture(t)
  const git = args => execFileSync('git', args, { cwd: f.tree, stdio: 'pipe' })
  git(['init', '--quiet'])
  git(['add', 'compiler'])
  git(['-c', 'user.name=E016 test', '-c', 'user.email=e016@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'fixture'])
  assertCleanGitSource(f.tree)
  const head = git(['rev-parse', 'HEAD']).toString()
  await writeFile(path.join(f.tree, 'compiler'), 'dirty source')
  assert.equal(git(['rev-parse', 'HEAD']).toString(), head)
  assert.throws(() => assertCleanGitSource(f.tree), /Dirty tracked tool source/)
})

test('installed tool replacement is rejected against reviewed tree baselines', async t => {
  const f = await fixture(t)
  const expected = {}
  for (const [name, relative] of Object.entries(TOOL_TREES)) {
    const folder = path.join(f.tree, relative)
    await mkdir(folder, { recursive: true })
    await writeFile(path.join(folder, 'tool'), `reviewed ${name}`)
    expected[name] = await hashTree(folder)
  }
  assert.deepEqual(await attestToolchain(f.tree, expected), expected)
  await writeFile(path.join(f.tree, TOOL_TREES.emsdkUpstream, 'tool'), 'replaced installed compiler')
  await assert.rejects(attestToolchain(f.tree, expected), /digest mismatch/)
})
