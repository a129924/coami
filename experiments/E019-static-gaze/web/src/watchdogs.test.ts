import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ReplyWatchdog,watchOperation} from './watchdogs.ts'
test('an older send timeout cannot fail a newer pending send',()=>{
 const callbacks:(()=>void)[]=[];let failures=0
 const w=new ReplyWatchdog(()=>{failures++},()=>false,cb=>{callbacks.push(cb);return()=>{}})
 w.arm();w.acknowledge();w.arm();callbacks[0]!();assert.equal(failures,0);callbacks[1]!();assert.equal(failures,1)
})
test('operation watchdog preserves an existing fatal error and ignores a finished operation',()=>{
 let callback=()=>{};let blocked=false;let busy=true;let failures=0
 watchOperation(()=>busy,()=>blocked,()=>{failures++},cb=>{callback=cb;return()=>{}})
 blocked=true;callback();assert.equal(failures,0);blocked=false;busy=false;callback();assert.equal(failures,0)
})
test('a genuinely pending operation still times out',()=>{
 let callback=()=>{};let failures=0
 watchOperation(()=>true,()=>false,()=>{failures++},cb=>{callback=cb;return()=>{}});callback();assert.equal(failures,1)
})
