import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export function normalizeToolchainSource(source) {
  if (!source || !path.isAbsolute(source)) throw new Error('Set E016_TOOLCHAIN_SOURCE to an absolute path containing the pinned macOS moddable, emsdk and fontbm toolchain; see README prerequisites.')
  return path.resolve(source)
}

export function renderEmscriptenConfig() {
  return `import os
emsdk_path = os.path.dirname(os.path.abspath(os.environ['EM_CONFIG']))
NODE_JS = os.path.join(emsdk_path, 'node', '22.16.0_64bit', 'bin', 'node')
PYTHON = os.path.join(emsdk_path, 'python', '3.13.3_64bit', 'bin', 'python3')
LLVM_ROOT = os.path.join(emsdk_path, 'upstream', 'bin')
BINARYEN_ROOT = os.path.join(emsdk_path, 'upstream')
EMSCRIPTEN_ROOT = os.path.join(emsdk_path, 'upstream', 'emscripten')
`
}

export function pythonLauncher(python) {
  const quoted = `'${python.replaceAll("'", "'\\''")}'`
  return `#!/bin/sh\nexec ${quoted} -B "$@"\n`
}

export function pinnedCompilerEnvironment(parent, emsdk, launcher) {
  const env = { ...parent }
  for (const key of Object.keys(env)) if (/^(EM_|EMCC_|EMMAKEN_|EMSDK_)/.test(key) || key === '_EMCC_CCACHE') delete env[key]
  return { ...env, EMSDK_PYTHON: launcher, EMSDK_NODE: path.join(emsdk, 'node/22.16.0_64bit/bin/node') }
}

/** Only publish a complete validated copy; interrupted staging can be retried. */
export async function ensureToolchain({ source, destination, validate, copy }) {
  try {
    await validate(destination)
    return
  } catch {
    // Missing, partial or mismatched caches must be replaced from the source.
  }
  await mkdir(path.dirname(destination), { recursive: true })
  const staged = await mkdtemp(`${destination}.staging-`)
  try {
    for (const name of ['moddable', 'emsdk', 'fontbm']) {
      await copy(path.join(source, name), path.join(staged, name))
    }
    await validate(staged)
    await rm(destination, { recursive: true, force: true })
    await rename(staged, destination)
  } finally {
    await rm(staged, { recursive: true, force: true })
  }
}

export async function writeConfigAtomically(file, contents, write = writeFile) {
  const staged = await mkdtemp(path.join(path.dirname(file), '.config-staging-'))
  try {
    const replacement = path.join(staged, 'config')
    await write(replacement, contents)
    await rename(replacement, file)
  } finally {
    await rm(staged, { recursive: true, force: true })
  }
}
