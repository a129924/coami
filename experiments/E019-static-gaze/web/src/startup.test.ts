import {test} from 'node:test'
import assert from 'node:assert/strict'
import {watchStartup} from './startup.ts'
test('startup rejection cancels watchdog and preserves the original failure',async()=>{
 let cancelled=false;let timeout=()=>{};let failures=0;const original=Error('specific startup failure')
 await assert.rejects(watchStartup(async()=>{throw original},()=>false,()=>false,()=>{failures++},cb=>{timeout=cb;return()=>{cancelled=true}}),error=>error===original)
 assert.equal(cancelled,true);assert.equal(failures,0)
})
test('watchdog does not add a second error after another path blocks the ledger',async()=>{
 let timeout=()=>{};let blocked=false;let failures=0
 await watchStartup(async()=>{},()=>false,()=>blocked,()=>{failures++},cb=>{timeout=cb;return()=>{}})
 blocked=true;timeout();assert.equal(failures,0)
})
test('a pending non-ready startup still reports its timeout',async()=>{
 let timeout=()=>{};let failures=0
 await watchStartup(async()=>{},()=>false,()=>false,()=>{failures++},cb=>{timeout=cb;return()=>{}})
 timeout();assert.equal(failures,1)
})
