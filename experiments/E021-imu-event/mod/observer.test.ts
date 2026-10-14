import { test } from 'node:test'
import assert from 'node:assert/strict'
import { IMUObserver } from './observer.ts'
test('TC-MOD preserves SDK event and correlated raw identity; counts are received-only',()=>{
 const observer=new IMUObserver(), event={kind:'imu' as const,motion:'fallenLeft' as const,ticks:100}
 const meta={run:1,caseId:2,sampleId:6,sampleTicks:101}
 const result=observer.receive(event,meta)
 assert.deepEqual(result.event,event);assert.deepEqual(result.meta,meta);assert.equal(result.counts.fallenLeft,1)
 assert.equal(observer.receive({kind:'imu',motion:'shake',ticks:200},{...meta,sampleId:7,sampleTicks:201}).counts.shake,1)
 assert.throws(()=>observer.receive(event,undefined),/metadata/)
 assert.throws(()=>observer.receive({...event,ticks:102},meta),/clock/)
 assert.throws(()=>observer.receive(event,{...meta,run:2}),/run/)
})
