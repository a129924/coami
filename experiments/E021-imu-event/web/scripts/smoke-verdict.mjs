import {isDeepStrictEqual} from 'node:util'
const motions=['shake','fallenForward','fallenBackward','fallenLeft','fallenRight','upsideDown']
const integer=v=>Number.isInteger(v)&&v>0
// The oracle is the checked-in scenario, never the transported browser payload.
function validEvidence(record,scenario,count) {
 if(!record||!integer(record.run)||record.caseId!==scenario.caseId||record.scenario!==scenario.id||record.synthetic!==true||record.dropped!==0)return false
 if(!Array.isArray(record.raw)||!Array.isArray(record.events)||!Number.isInteger(count)||count<0||count>scenario.samples.length||record.raw.length!==count)return false
 let previous=-Infinity
 for(const [i,raw] of record.raw.entries()) {
  const meta=raw?.meta,vector=raw?.sample?.accelerometer,expected=scenario.samples[i]
  if(meta?.run!==record.run||meta?.caseId!==scenario.caseId||meta?.sampleId!==i+1||!Number.isFinite(meta?.sampleTicks)||meta.sampleTicks<previous)return false
  if(!vector||!isDeepStrictEqual(vector,expected)||!['x','y','z'].every(k=>Number.isFinite(vector[k])))return false
  previous=meta.sampleTicks
 }
 const expectedEvents=scenario.expected.filter(e=>e.index<=count)
 if(record.events.length!==expectedEvents.length)return false
 const counts=Object.fromEntries(motions.map(m=>[m,0]))
 for(const [i,received] of record.events.entries()) {
  const event=received?.event,meta=received?.meta,expected=expectedEvents[i]
  if(received?.kind!=='event'||event?.kind!=='imu'||event.motion!==expected.motion||meta?.sampleId!==expected.index)return false
  const raw=record.raw[expected.index-1],lower=record.raw[expected.index-2]?.meta.sampleTicks??-Infinity
  if(!raw||!isDeepStrictEqual(meta,raw.meta)||!Number.isFinite(event.ticks)||event.ticks>meta.sampleTicks||event.ticks<lower)return false
  counts[event.motion]++
  if(!isDeepStrictEqual(received.counts,counts))return false
 }
 return true
}
export function scenarioVerdict(record,scenario) {
 const fault=['interrupt','native-failure'].includes(scenario.kind),count=fault?4:scenario.samples.length
 if(!validEvidence(record,scenario,count)||record.status!==(fault?'error':'complete'))return 'FAIL'
 if(fault&&record.reason!==`injected ${scenario.kind}`)return 'FAIL'
 if(scenario.kind==='cooldown') {
  const first=record.events[0].event.ticks,second=record.events[1].event.ticks,bound=record.raw[22].meta.sampleTicks
  if(second-first<1500)return 'FAIL'
  if(bound>=first+1500)return 'INDETERMINATE'
 }
 return 'PASS'
}
export function stopVerdict(record,preserved,scenario,index) {
 if(!validEvidence(record,scenario,record?.raw?.length)||record.status!=='stopped'||record.reason!=='operator stop'||!isDeepStrictEqual(record,preserved))return 'FAIL'
 return record.raw.length===index?'PASS':'INDETERMINATE'
}
export function lifecycleVerdict(record,scenario,{status,reason,minSamples=1,maxSamples=scenario.samples.length-1}) {
 const count=record?.raw?.length
 if(!validEvidence(record,scenario,count)||record.status!==status||record.reason!==reason||count<minSamples||count>maxSamples)return 'FAIL'
 return 'PASS'
}
export const stopCases=[['fallenLeft',0,'fallenLeft-two'],['fallenLeft',5,'fallenLeft-two'],['shake',12,'shake-nine'],['fallenLeft',6,'fallenLeft-two']]
export function expectedSmokeIds(scenarios,only) {
 const selected=scenarios.filter(s=>!only||s.id===only).map(s=>s.id)
 if(!selected.length)throw new Error('E021_ONLY does not name a known scenario')
 if(only)return [...selected,'missing-provider','visible-final']
 return [...selected,...motions.map(m=>`${m}-independent-2`),
  ...stopCases.flatMap(([id,index])=>[`restart-after-${id}-${index}`,`stop-${id}-${index}`]),
  'page-watchdog','page-initialization-timeout','page-hidden','pagehide-navigation','fresh-after-pagehide','missing-provider','visible-final']
}
export function smokePassed(results,browserErrors,expectedIds) {
 if(!Array.isArray(expectedIds)||!expectedIds.length||!expectedIds.every(id=>typeof id==='string'&&id.length>0))return false
 const required=new Set(expectedIds)
 return required.size===expectedIds.length&&Array.isArray(results)&&results.length===required.size&&
  results.every(r=>required.has(r?.id)&&r.verdict==='PASS')&&new Set(results.map(r=>r.id)).size===required.size&&
  Array.isArray(browserErrors)&&browserErrors.length===0
}
