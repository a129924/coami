import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { ensureToolchain, normalizeToolchainSource, pinnedCompilerEnvironment, pythonLauncher, renderEmscriptenConfig, writeConfigAtomically } from './toolchain-cache.mjs'

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

test('configuration replacement publishes complete relocated contents', async t => {
  const f = await fixture(t)
  const config = path.join(f.root, '.emscripten')
  await writeFile(config, 'original complete config')
  await writeConfigAtomically(config, 'relocated complete config')
  assert.equal(await readFile(config, 'utf8'), 'relocated complete config')
})

test('interrupted configuration write preserves published config and retry succeeds', async t => {
  const f = await fixture(t)
  const config = path.join(f.root, '.emscripten')
  await writeFile(config, 'original complete config')
  await assert.rejects(writeConfigAtomically(config, 'relocated complete config', async file => {
    await writeFile(file, 'truncated')
    throw new Error('simulated interrupted config write')
  }), /simulated interrupted config write/)
  assert.equal(await readFile(config, 'utf8'), 'original complete config')
  assert.deepEqual((await readdir(f.root)).sort(), ['.emscripten', 'source'])
  await writeConfigAtomically(config, 'relocated complete config')
  assert.equal(await readFile(config, 'utf8'), 'relocated complete config')
})

test('toolchain source normalization rejects relative paths and strips trailing separators', () => {
  assert.throws(() => normalizeToolchainSource(undefined), /absolute path/)
  assert.throws(() => normalizeToolchainSource('relative/toolchain'), /absolute path/)
  assert.equal(normalizeToolchainSource('/tools/e016/'), '/tools/e016')
  assert.equal(normalizeToolchainSource('/tools/e016/./'), '/tools/e016')
})

test('trailing separator source relocates config without joining directory names', async t => {
  const f = await fixture(t)
  const config = path.join(f.root, '.emscripten')
  const contents = "LLVM_ROOT = '/tools/e016/emsdk/upstream/bin'\n"
  await writeConfigAtomically(config, contents.replaceAll(normalizeToolchainSource('/tools/e016/'), f.destination))
  assert.equal(await readFile(config, 'utf8'), `LLVM_ROOT = '${f.destination}/emsdk/upstream/bin'\n`)
})

test('regenerated Emscripten config resolves tools from its current location after a move', async t => {
  const f = await fixture(t)
  const emsdk = path.join(f.root, 'moved-checkout', 'emsdk')
  await mkdir(emsdk, { recursive: true })
  const config = path.join(emsdk, '.emscripten')
  await writeFile(config, "LLVM_ROOT = '/old-worktree/emsdk/upstream/bin'\n")
  await writeConfigAtomically(config, renderEmscriptenConfig())
  const actual = execFileSync('python3', ['-B', '-c', 'import os,runpy; print(runpy.run_path(os.environ["EM_CONFIG"])["LLVM_ROOT"])'], { env: { ...process.env, EM_CONFIG: config }, encoding: 'utf8' }).trim()
  assert.equal(actual, path.join(emsdk, 'upstream', 'bin'))
})

test('Python launcher pins its interpreter and -B survives an emcc-style -E', async t => {
  const f = await fixture(t)
  const actualPython = execFileSync('python3', ['-B', '-c', 'import os,sys; print(os.path.realpath(sys.executable))'], { encoding: 'utf8' }).trim()
  const pinned = path.join(f.root, "pinned python'3")
  await symlink(actualPython, pinned)
  const launcher = path.join(f.root, 'python-launcher')
  await writeConfigAtomically(launcher, pythonLauncher(pinned))
  await chmod(launcher, 0o755)
  const result = JSON.parse(execFileSync(launcher, ['-E', '-c', 'import os,sys,json; print(json.dumps([os.path.realpath(sys.executable),sys.dont_write_bytecode]))'], { env: { ...process.env, PATH: '/no-bootstrap-fallback', PYTHONDONTWRITEBYTECODE: '0' }, encoding: 'utf8' }))
  assert.deepEqual(result, [actualPython, true])
})

test('compiler environment rejects inherited tool and wrapper overrides', () => {
  const env = pinnedCompilerEnvironment({ KEEP: 'yes', EM_NODE_JS: '/bad', EM_LLVM_ROOT: '/bad', EM_BINARYEN_ROOT: '/bad', EM_COMPILER_WRAPPER: '/bad', EMSDK_PYTHON: '/bad', _EMCC_CCACHE: '1' }, '/pinned-sdk', '/pinned-launcher')
  assert.equal(env.EMSDK_PYTHON, '/pinned-launcher')
  assert.equal(env.EMSDK_NODE, '/pinned-sdk/node/22.16.0_64bit/bin/node')
  assert.equal(env.KEEP, 'yes')
  for (const key of ['EM_NODE_JS', 'EM_LLVM_ROOT', 'EM_BINARYEN_ROOT', 'EM_COMPILER_WRAPPER', '_EMCC_CCACHE']) assert.equal(env[key], undefined)
})

test('compiler environment removes EMCC and legacy EMMAKEN build controls', () => {
  const env = pinnedCompilerEnvironment({ EMCC_CFLAGS: '-sASSERTIONS=0', EMCC_FORCE_STDLIBS: '1', EMCC_DEBUG: '1', EMMAKEN_CFLAGS: '-O3', KEEP: 'yes' }, '/sdk', '/launcher')
  for (const key of ['EMCC_CFLAGS', 'EMCC_FORCE_STDLIBS', 'EMCC_DEBUG', 'EMMAKEN_CFLAGS']) assert.equal(env[key], undefined)
  assert.equal(env.KEEP, 'yes')
})
