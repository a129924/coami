import {modInputHashes} from './mod-inputs.mjs'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function verifyPreparedMod(root,build){
 const web=path.join(root,'web'),publicRoot=path.join(web,'generated/public')
 const p=JSON.parse(await readFile(path.join(publicRoot,'runtime-provenance.json'),'utf8')),m=p.modBuild
 if(!m || JSON.stringify(m.dependencies)!==JSON.stringify(build.dependencies))throw Error('clean-installed MOD compiler attestation required')
 if(m.archiveSha256!==p.hashes['coami-mod.xsa'] || sha(await readFile(path.join(publicRoot,'coami-mod.xsa')))!==m.archiveSha256)throw Error('MOD archive changed after attested compilation')
 if(JSON.stringify(m.sources)!==JSON.stringify(await modInputHashes(root)))throw Error('MOD source changed after attested compilation')
 return m
}
