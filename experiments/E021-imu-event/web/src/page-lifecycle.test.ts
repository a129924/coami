import {test} from 'node:test'
import assert from 'node:assert/strict'
import {RunGuard,SampleInput} from './input.ts'
import {getScenario} from './scenarios.ts'
test('TC-LIFECYCLE old startup promises, timeout and trace cannot update a replacement run',async()=>{
 const guard=new RunGuard(),a=guard.begin();let value=''
 let resume:()=>void=()=>{};const promise=new Promise<void>(r=>{resume=r})
 const startup=promise.then(()=>{if(guard.valid(a.run))value='stale'})
 const b=guard.begin();assert.equal(a.signal.aborted,true);resume();await startup
 assert.equal(value,'');assert.equal(guard.valid(a.run),false);assert.equal(guard.valid(b.run),true)
 guard.cancel();assert.equal(b.signal.aborted,true);assert.equal(guard.valid(b.run),false)
})
test('TC-LIFECYCLE watchdog only fails active stalled input; normal completion is distinct',()=>{
 let ticks=0;const input=new SampleInput(1,getScenario('upright'),()=>{},()=>ticks)
 ticks=5000;input.watchdog();assert.equal(input.state,'initializing')
 input.ready();ticks=6000;input.watchdog();assert.equal(input.state,'error')
 input.stop();assert.equal(input.state,'error')
})
