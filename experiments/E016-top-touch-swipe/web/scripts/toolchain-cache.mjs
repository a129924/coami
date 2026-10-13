import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export function normalizeToolchainSource(source) {
  if (!source || !path.isAbsolute(source)) throw new Error('Set E016_TOOLCHAIN_SOURCE to an absolute path containing the pinned macOS moddable, emsdk and fontbm toolchain; see README prerequisites.')
  return path.resolve(source)
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
