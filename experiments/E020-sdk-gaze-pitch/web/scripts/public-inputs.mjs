import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
const pin=JSON.parse(await readFile(new URL('../src/mod-pin.json',import.meta.url),'utf8'))
const runtimePin=JSON.parse(await readFile(new URL('../src/runtime-pin.json',import.meta.url),'utf8'))
const provenancePin=JSON.parse(await readFile(new URL('../src/provenance-pin.json',import.meta.url),'utf8'))
const host=JSON.parse(await readFile(new URL('./host-pin.json',import.meta.url),'utf8'))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function verifyModSources(web){
 for(const [file,expected] of Object.entries(pin.sources))
  if(hash(await readFile(path.resolve(web,'../mod',file)))!==expected)throw Error(`Reviewed MOD source mismatch: ${file}`)
}
export async function verifyPublicInputs(web,readPublic=file=>readFile(path.join(web,'generated/public',file))){
 await verifyModSources(web)
 for(const [file,expected] of Object.entries(provenancePin))
  if(hash(await readPublic(file))!==expected)throw Error(`Reviewed ${file.startsWith('mod')?'MOD':'runtime'} provenance mismatch`)
 const mp=JSON.parse(await readPublic('mod-provenance.json'))
 if(mp.experiment!==pin.experiment||mp.sha256!==pin.sha256||Object.entries(pin.sources).some(([f,h])=>mp.sources?.[f]!==h))throw Error('Reviewed MOD provenance mismatch')
 if(hash(await readPublic('coami-mod.xsa'))!==pin.sha256)throw Error('Reviewed MOD archive mismatch')
 const mesh='assets/case/v1/shell.stl',expected=host['simulator/'+mesh]
 const runtime=JSON.parse(await readPublic('runtime-provenance.json'))
 for(const [file,expected] of Object.entries(runtimePin))
  if(runtime.sha256?.[file]!==expected||hash(await readPublic('simulator/'+file))!==expected)throw Error(`Reviewed served runtime mismatch: ${file}`)
 if(runtime.sha256?.[mesh]!==expected||hash(await readPublic('simulator/'+mesh))!==expected)throw Error('Pinned served mesh mismatch')
}
