import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
const pins=JSON.parse(await readFile(new URL('./host-pin.json',import.meta.url),'utf8'))
export async function verifyStagedHost(root){
 const sha256={}
 for(const [file,expected] of Object.entries(pins)){
  const actual=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')
  if(actual!==expected)throw Error(`Pinned simulator host source mismatch: ${file}`)
  sha256[file]=actual
 }
 return {sourceCommit:'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322',sha256}
}
