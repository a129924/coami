import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {getScenario,scenarios} from '../src/scenarios.ts'
import {scenarioVerdict,stopVerdict,lifecycleVerdict,smokePassed,expectedSmokeIds} from './smoke-verdict.mjs'
const motions=['shake','fallenForward','fallenBackward','fallenLeft','fallenRight','upsideDown']
function fixture(id,{count,interval=100,status,reason}={}) {
 const s=getScenario(id),fault=['interrupt','native-failure'].includes(s.kind)
 count??=fault?4:s.samples.length
 const raw=s.samples.slice(0,count).map((v,i)=>({meta:{run:1,caseId:s.caseId,sampleId:i+1,sampleTicks:1000+i*interval},sample:{accelerometer:{...v}}}))
 const counts=Object.fromEntries(motions.map(m=>[m,0]))
 const events=s.expected.filter(e=>e.index<=count).map(e=>{counts[e.motion]++;return {kind:'event',event:{kind:'imu',motion:e.motion,ticks:raw[e.index-1].meta.sampleTicks-1},meta:{...raw[e.index-1].meta},counts:{...counts}}})
 return {run:1,scenario:id,caseId:s.caseId,synthetic:true,status:status??(fault?'error':'complete'),reason:reason??(fault?`injected ${s.kind}`:'last sample processing acknowledged by next SDK poll'),dropped:0,raw,events}
}
test('source-owned scenario matrix with complete raw/Event contracts passes',()=>{
 for(const s of scenarios)assert.equal(scenarioVerdict(fixture(s.id),s),'PASS',s.id)
})
test('matching Event lists cannot hide broken raw values, counts, identity or clock',()=>{
 const mutations={
  'wrong vector':r=>{r.raw[0].sample.accelerometer={x:0,y:0,z:0}},
  'missing sample':r=>{r.raw.pop()},
  'reordered samples':r=>{[r.raw[0],r.raw[1]]=[r.raw[1],r.raw[0]]},
  'wrong run':r=>{r.raw[0].meta.run=2},
  'wrong case':r=>{r.raw[0].meta.caseId++},
  'wrong sample id':r=>{r.raw[0].meta.sampleId=2},
  'nonfinite sample clock':r=>{r.raw[0].meta.sampleTicks=NaN},
  'infinite sample clock':r=>{r.raw[0].meta.sampleTicks=Infinity},
  'decreasing clock':r=>{r.raw[1].meta.sampleTicks=r.raw[0].meta.sampleTicks-1},
  'nonfinite vector':r=>{r.raw[0].sample.accelerometer.x=NaN},
  'wrong record identity':r=>{r.caseId++},
  'dropped evidence':r=>{r.dropped=1},
 }
 for(const [name,mutate] of Object.entries(mutations)){const r=fixture('upright');mutate(r);assert.equal(scenarioVerdict(r,getScenario('upright')),'FAIL',name)}
})
test('Event clock, kind, metadata and MOD count corruption fails',()=>{
 const mutations={
  'upper bound':r=>{r.events[0].event.ticks=r.events[0].meta.sampleTicks+1},
  'nonfinite Event ticks':r=>{r.events[0].event.ticks=Infinity},
  'wrong kind':r=>{r.events[0].event.kind='touch'},
  'wrong Event motion':r=>{r.events[0].event.motion='fallenRight'},
  'wrong correlated metadata':r=>{r.events[0].meta.run=2},
  'missing count':r=>{delete r.events[0].counts.fallenLeft},
  'wrong count':r=>{r.events[0].counts.fallenLeft=3},
 }
 for(const [name,mutate] of Object.entries(mutations)){const r=fixture('fallenLeft');mutate(r);assert.equal(scenarioVerdict(r,getScenario('fallenLeft')),'FAIL',name)}
})
test('cooldown crossing the negative bound is indeterminate; too-early repeat fails',()=>{
 assert.equal(scenarioVerdict(fixture('cooldown',{interval:151}),getScenario('cooldown')),'INDETERMINATE')
 assert.equal(scenarioVerdict(fixture('cooldown',{interval:20}),getScenario('cooldown')),'FAIL')
})
test('all four exact stop prefixes and expected Events pass with unchanged snapshots',()=>{
 for(const [id,count] of [['fallenLeft',0],['fallenLeft',5],['shake',12],['fallenLeft',6]]){
  const r=fixture(id,{count,status:'stopped',reason:'operator stop'})
  assert.equal(stopVerdict(r,structuredClone(r),getScenario(id),count),'PASS',`${id}@${count}`)
 }
})
test('sample-six stop requires the actual Event and count',()=>{
 const r=fixture('fallenLeft',{count:6,status:'stopped',reason:'operator stop'});r.events=[]
 assert.equal(stopVerdict(r,structuredClone(r),getScenario('fallenLeft'),6),'FAIL')
 const wrong=fixture('fallenLeft',{count:6,status:'stopped',reason:'operator stop'});wrong.events[0].counts.fallenLeft=0
 assert.equal(stopVerdict(wrong,structuredClone(wrong),getScenario('fallenLeft'),6),'FAIL')
})
test('changed old snapshot fails and a valid stop at the wrong count is indeterminate',()=>{
 const r=fixture('fallenLeft',{count:5,status:'stopped',reason:'operator stop'}),changed=structuredClone(r);changed.reason='changed'
 assert.equal(stopVerdict(r,changed,getScenario('fallenLeft'),5),'FAIL')
 const raced=fixture('fallenLeft',{count:7,status:'stopped',reason:'operator stop'})
 assert.equal(stopVerdict(raced,structuredClone(raced),getScenario('fallenLeft'),6),'INDETERMINATE')
})
test('lifecycle prefix validates real samples, expected Events and terminal reason',()=>{
 const s=getScenario('fallenLeft'),options={status:'stopped',reason:'pagehide',minSamples:1}
 const r=fixture(s.id,{count:6,status:'stopped',reason:'pagehide'})
 assert.equal(lifecycleVerdict(r,s,options),'PASS');r.events=[]
 assert.equal(lifecycleVerdict(r,s,options),'FAIL')
 const empty=fixture(s.id,{count:0,status:'stopped',reason:'pagehide'})
 assert.equal(lifecycleVerdict(empty,s,options),'FAIL')
 const startup=fixture('upright',{count:0,status:'error',reason:'initialization exceeded 5 seconds'})
 assert.equal(lifecycleVerdict(startup,getScenario('upright'),{status:'error',reason:startup.reason,minSamples:0,maxSamples:0}),'PASS')
})
test('CLI success requires full nonempty unique all-PASS coverage and no browser exceptions',()=>{
 const ids=expectedSmokeIds(scenarios),good=ids.map(id=>({id,verdict:'PASS'}))
 const locked=JSON.parse(readFileSync(new URL('../../evidence/operator-session.json',import.meta.url),'utf8')).matrix.map(x=>x.id)
 assert.deepEqual([...ids].sort(),locked.sort())
 assert.equal(smokePassed(good,[],ids),true)
 for(const verdict of ['FAIL','INDETERMINATE','NOT_EXECUTED',undefined]){const bad=structuredClone(good);bad[0].verdict=verdict;assert.equal(smokePassed(bad,[],ids),false)}
 assert.equal(smokePassed(good,['uncaught exception'],ids),false)
 assert.equal(smokePassed([],[],ids),false)
 assert.equal(smokePassed(good.slice(1),[],ids),false)
 const duplicate=structuredClone(good);duplicate[1].id=duplicate[0].id;assert.equal(smokePassed(duplicate,[],ids),false)
 const subset=expectedSmokeIds(scenarios,'fallenForward')
 assert.equal(smokePassed(subset.map(id=>({id,verdict:'PASS'})),[],subset),true) // explicitly declared diagnostic subset
})

test('same-size unknown-ID replacement cannot stand in for a required case',()=>{
 const ids=expectedSmokeIds(scenarios),results=ids.map(id=>({id,verdict:'PASS'}));results[0].id='unexpected-replacement'
 assert.equal(smokePassed(results,[],ids),false)
})
