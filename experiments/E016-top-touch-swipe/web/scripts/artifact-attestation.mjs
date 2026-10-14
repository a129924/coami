import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readdir, readlink, realpath } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

export function assertCleanGitSource(root) {
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim()
  if (dirty) throw new Error(`Dirty tracked tool source: ${root}`)
}

// v1: sorted relative paths, type, executable bits and content SHA; no mtimes/root paths.
export async function hashTree(root) {
  const canonicalRoot = await realpath(root)
  const digest = createHash('sha256').update('E016-tree-v1\n')
  const visit = async (relative = '') => {
    for (const name of (await readdir(path.join(root, relative))).sort()) {
      if (name === '.git') continue
      const entry = path.join(relative, name)
      const file = path.join(root, entry)
      const stat = await lstat(file)
      let payload
      if (stat.isSymbolicLink()) {
        const target = await realpath(file)
        const within = path.relative(canonicalRoot, target)
        if (within === '..' || within.startsWith(`..${path.sep}`) || path.isAbsolute(within)) throw new Error(`Link outside attested tree: ${entry}`)
        payload = ['link', await readlink(file)]
      } else if (stat.isDirectory()) payload = ['directory']
      else if (stat.isFile()) {
        const content = createHash('sha256')
        for await (const chunk of createReadStream(file)) content.update(chunk)
        payload = ['file', stat.mode & 0o111, content.digest('hex')]
      } else throw new Error(`Unsupported entry in attested tree: ${entry}`)
      digest.update(JSON.stringify([entry, ...payload]) + '\n')
      if (stat.isDirectory()) await visit(entry)
    }
  }
  await visit()
  return digest.digest('hex')
}

export async function assertTreeHash(root, expected) {
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('A reviewed SHA-256 tree digest is required')
  const actual = await hashTree(root)
  if (actual !== expected) throw new Error(`Tree digest mismatch: ${root}`)
  return actual
}

export const TOOL_TREES = {
  moddableTools: 'moddable/build/bin/mac/release',
  emsdkUpstream: 'emsdk/upstream',
  emsdkNode: 'emsdk/node',
  emsdkPython: 'emsdk/python',
  fontbmBuild: 'fontbm/build',
}

export async function attestToolchain(root, expected) {
  const actual = {}
  for (const [name, relative] of Object.entries(TOOL_TREES)) actual[name] = await assertTreeHash(path.join(root, relative), expected?.[name])
  return actual
}
