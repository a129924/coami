import { execFileSync } from 'node:child_process'
import { mkdir, rm, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const base = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
export const web = fileURLToPath(new URL('../', import.meta.url))
export const experiment = path.resolve(web, '..')
export const repo = path.resolve(experiment, '../..')
export const source = path.join(web, 'generated/pinned-stack-chan')
export const patch = path.join(experiment, 'runtime/wasm-imu.patch')
export const run = (cmd, args, cwd = source, env = process.env) => execFileSync(cmd, args, { cwd, env, stdio: 'inherit' })
export const capture = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim()

export function verifyVendor(vendor = path.join(repo, 'vendor/stack-chan'), repository = repo) {
  if (capture('git', ['rev-parse','HEAD'], vendor) !== base || capture('git', ['rev-parse','HEAD:vendor/stack-chan'], repository) !== base)
    throw new Error('pinned SDK mismatch')
  if (capture('git', ['status','--porcelain','--untracked-files=all'], vendor)) throw new Error('vendor is not clean')
}

export async function stageHost() {
  const vendor = path.join(repo, 'vendor/stack-chan')
  verifyVendor(vendor)
  await mkdir(path.dirname(source), { recursive: true })
  await rm(source, { recursive: true, force: true })
  run('git', ['clone','--shared','--no-checkout',vendor,source], repo)
  run('git', ['checkout','--detach',base])
  run('git', ['apply','--check',patch])
  run('git', ['apply',patch])
  const asset = path.join(web, 'generated/public/simulator/assets/case/v1')
  await mkdir(asset, { recursive: true })
  await copyFile(path.join(source,'web/simulator/assets/case/v1/shell.stl'), path.join(asset,'shell.stl'))
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await stageHost()
