import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const webRoot = fileURLToPath(new URL('../', import.meta.url))
const publicSimulator = path.join(webRoot, 'generated/public/simulator')
const upstreamSimulator = path.resolve(webRoot, '../../../vendor/stack-chan/web/simulator')
await mkdir(path.join(publicSimulator, 'assets/case/v1'), { recursive: true })
await copyFile(path.join(upstreamSimulator, 'assets/case/v1/shell.stl'), path.join(publicSimulator, 'assets/case/v1/shell.stl'))
