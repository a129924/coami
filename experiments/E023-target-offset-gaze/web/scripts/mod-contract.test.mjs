// Real E023 MOD code, explicit fake host/Piu/Timer. NOT a WASM execution.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {registerHooks} from 'node:module'
import {encodeFrame} from '../../mod/protocol.ts'
let root,clock=0;const traces=[],calls=[]
registerHooks({resolve(spec,context,next){
 if(spec==='piu/MC')return {url:'data:text/javascript,export {}',shortCircuit:true}
 if(spec==='timer')return {url:'data:text/javascript,export default {set(fn){fn()}}',shortCircuit:true}
 if(spec==='time')throw Error('Use native Piu touch callback ticks, not stripped Time getter')
 if(spec==='./protocol'&&context.parentURL?.endsWith('/mod/mod.ts'))return {url:new URL('../../mod/protocol.ts',import.meta.url).href,shortCircuit:true}
 return next(spec,context)
}})
globalThis.trace=text=>traces.push(JSON.parse(text.trim().slice(8)))
globalThis.Behavior=class{}
globalThis.Skin=class{}
globalThis.Container=class{constructor(_,options){this.behavior=new options.Behavior();root=this}}
const {onContextCreated}=await import('../../mod/mod.ts')
function setup(){
 clock=0;traces.length=0;calls.length=0
 const robot={ui:{setMain(){}},motion:{lookAt(point){calls.push(point)},lookAway(){},async setPose(){}},input:{button:{a:{},b:{}}}}
 onContextCreated(robot);return robot
}
function send(seq,target,probe){for(const {x,y}of encodeFrame(seq,target,probe)){root.behavior.onTouchBegan(root,0,x,y,clock);root.behavior.onTouchEnded(root,0,x,y,clock)}}
test('probe never calls SDK; initialize before arbitrary target; replay and pending rejected',async()=>{
 const robot=setup()
 send(1,[1,0,0],true)
 assert.equal(calls.length,0);assert.equal(traces.at(-1).phase,'probe')
 send(2,[.781,-.625,0],false)
 assert.equal(calls.length,0);assert.equal(traces.at(-1).phase,'failed')
 robot.input.button.b.onEvent({pressed:true});await Promise.resolve();await Promise.resolve()
 assert.equal(traces.at(-1).phase,'initialized')
 send(3,[.781,-.625,0],false)
 assert.equal(calls.length,1);assert.deepEqual(calls[0],[.781,-.625,0].map(v=>Math.floor((v+1)*1000+0.5)/1000-1))
 assert.equal(traces.at(-1).phase,'returned')
 send(3,[.781,-.625,0],false);assert.equal(calls.length,1)
 send(4,[1,0,0],false);assert.equal(calls.length,1);assert.equal(traces.at(-1).phase,'failed')
 clock=5000;send(5,[1,0,0],false);assert.equal(calls.length,2)
})
test('SDK synchronous failure remains failed rather than returned',async()=>{
 const robot=setup();robot.motion.lookAt=()=>{throw Error('deliberate failure')}
 robot.input.button.b.onEvent({pressed:true});await Promise.resolve();await Promise.resolve()
 send(1,[1,0,0],false)
 assert.equal(traces.at(-1).phase,'failed');assert.match(traces.at(-1).error,/deliberate/)
})
