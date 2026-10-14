import {test} from 'node:test'
import assert from 'node:assert/strict'
import {stabilityState} from './stability.ts'
test('busy and observation locks clear premature checks before the next operation',()=>{
 for(const locked of [true,true])assert.deepEqual(stabilityState(locked,true),{disabled:true,checked:false})
 assert.deepEqual(stabilityState(false,false),{disabled:false,checked:false})
 assert.deepEqual(stabilityState(false,true),{disabled:false,checked:true})
})
