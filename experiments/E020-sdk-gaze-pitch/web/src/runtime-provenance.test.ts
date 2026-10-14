import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {stableRuntimeProvenance,canonicalJson} from './runtime-provenance.ts'
type Fixture = Record<string,unknown> & {moddable:{sourceCommit:string;tools:{xsc:{sha256:string}}};emscripten:{controlledConfig:{pythonTreeSha256:string;configSha256:string;wrapper?:string}};fontbm:{sha256:string};host:{sourceCommit:string};sha256:Record<string,string>}
const original:Fixture=JSON.parse(readFileSync(new URL('../../evidence/review7-runtime-provenance.json',import.meta.url),'utf8'))
const digest=(p:Record<string,unknown>)=>createHash('sha256').update(canonicalJson(stableRuntimeProvenance(p))).digest('hex')
test('runtime identity digest and exported record exclude relocated paths and their config digest',()=>{
 const relocated=JSON.parse(JSON.stringify(original).replaceAll('/private/tmp/coami-e020-sdk-gaze-pitch','/another checkout/robot experiment'))
 relocated.emscripten.controlledConfig.configSha256='location-dependent config hash'
 assert.equal(digest(relocated),digest(original))
 const exported=canonicalJson(stableRuntimeProvenance(relocated))
 assert.ok(!exported.includes('/another checkout'));assert.ok(!exported.includes('location-dependent config hash'))
})
test('tool identities, compiler configuration extras, host and output digests remain authenticated',()=>{
 for(const mutate of [
  (p:typeof original)=>{p.moddable.sourceCommit='forged'},
  (p:typeof original)=>{p.moddable.tools.xsc.sha256='forged'},
  (p:typeof original)=>{p.emscripten.controlledConfig.pythonTreeSha256='forged'},
  (p:typeof original)=>{p.emscripten.controlledConfig.wrapper='forged'},
  (p:typeof original)=>{p.fontbm.sha256='forged'},
  (p:typeof original)=>{p.host.sourceCommit='forged'},
  (p:typeof original)=>{p.sha256['mc.wasm']='forged'},
 ]){const copy=structuredClone(original);mutate(copy);assert.notEqual(digest(copy),digest(original))}
})
