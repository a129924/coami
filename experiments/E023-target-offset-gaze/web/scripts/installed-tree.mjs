import {createHash} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {readdir,lstat,readlink} from 'node:fs/promises'
import path from 'node:path'
export async function installedTreeSha256(root) {
  const tree = createHash('sha256')
  async function visit(directory, prefix = '') {
    for (const name of (await readdir(directory)).sort()) {
      const absolute = path.join(directory, name)
      const relative = prefix ? `${prefix}/${name}` : name
      const info = await lstat(absolute)
      if (info.isDirectory()) {
        tree.update(`d\0${relative}\0`)
        await visit(absolute, relative)
      } else if (info.isSymbolicLink()) {
        tree.update(`l\0${relative}\0${await readlink(absolute)}\0`)
      } else if (info.isFile()) {
        const file = createHash('sha256')
        for await (const chunk of createReadStream(absolute)) file.update(chunk)
        tree.update(`f\0${relative}\0${info.mode & 0o111 ? 'x' : '-'}\0${file.digest('hex')}\0`)
      } else throw new Error(`unsupported installed file ${relative}`)
    }
  }
  await visit(root)
  return tree.digest('hex')
}
