import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ensureToolchain } from './toolchain-cache.mjs'

const components = ['moddable', 'emsdk', 'fontbm']
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'e016-toolchain-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const source = path.join(root, 'source')
  const destination = path.join(root, 'cache')
  for (const name of components) {
    await mkdir(path.join(source, name), { recursive: true })
    await writeFile(path.join(source, name, 'revision'), `pinned-${name}`)
  }
  const validate = async folder => {
    for (const name of components) {
      assert.equal(await readFile(path.join(folder, name, 'revision'), 'utf8'), `pinned-${name}`)
    }
  }
  const copy = (from, to) => cp(from, to, { recursive: true })
  return { root, source, destination, validate, copy }
}

test('complete cached toolchain is reused without copying', async t => {
  const f = await fixture(t)
  await cp(f.source, f.destination, { recursive: true })
  await ensureToolchain({ ...f, copy: () => assert.fail('valid cache must be reused') })
})

test('partial cached toolchain is replaced only after all components validate', async t => {
  const f = await fixture(t)
  await mkdir(f.destination)
  await cp(path.join(f.source, 'moddable'), path.join(f.destination, 'moddable'), { recursive: true })
  await ensureToolchain(f)
  await f.validate(f.destination)
})

test('interrupted copy preserves old cache and next retry repairs it', async t => {
  const f = await fixture(t)
  await mkdir(f.destination)
  await writeFile(path.join(f.destination, 'old-cache'), 'preserved')
  await assert.rejects(ensureToolchain({ ...f, copy: async (from, to) => {
    if (path.basename(from) === 'emsdk') throw new Error('simulated interrupted copy')
    await f.copy(from, to)
  } }), /simulated interrupted copy/)
  assert.equal(await readFile(path.join(f.destination, 'old-cache'), 'utf8'), 'preserved')
  assert.deepEqual((await readdir(f.root)).sort(), ['cache', 'source'])
  await ensureToolchain(f)
  await f.validate(f.destination)
})

test('invalid copied component never replaces the previous cache', async t => {
  const f = await fixture(t)
  await mkdir(f.destination)
  await writeFile(path.join(f.destination, 'old-cache'), 'preserved')
  await writeFile(path.join(f.source, 'fontbm', 'revision'), 'wrong-revision')
  await assert.rejects(ensureToolchain(f), { code: 'ERR_ASSERTION' })
  assert.equal(await readFile(path.join(f.destination, 'old-cache'), 'utf8'), 'preserved')
  assert.deepEqual((await readdir(f.root)).sort(), ['cache', 'source'])
})
