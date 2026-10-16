import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {isDeepStrictEqual} from 'node:util'
export async function readSourceHashes(root=new URL('../../',import.meta.url)) {
 const hash=async name=>createHash('sha256').update(await readFile(new URL(name,root))).digest('hex')
 return {patchSha256:await hash('runtime/wasm-imu.patch'),sourceSha256:Object.fromEntries(await Promise.all(['mod.ts','observer.ts'].map(async name=>[name,await hash(`mod/${name}`)])))}
}
export function assertSourceProvenance(provenance,expected) {
 if(provenance?.patchSha256!==expected.patchSha256||!isDeepStrictEqual(provenance?.mod?.sourceSha256,expected.sourceSha256))throw new Error('runtime provenance source mismatch; run npm run prepare:poc')
}
export function assertRunProvenance(results,expected) {
 for(const {id,record} of results) {
  if(record?.provenance!=null){assertSourceProvenance(record.provenance,expected);continue}
  const empty=record?.raw?.length===0&&record?.events?.length===0
  const stopped=id==='stop-fallenLeft-0'&&record?.status==='stopped'&&record?.reason==='operator stop'
  const timeout=id==='page-initialization-timeout'&&record?.status==='error'&&record?.reason==='initialization exceeded 5 seconds'
  if(!empty||(!stopped&&!timeout))throw new Error(`run ${id} is missing source provenance`)
 }
}
