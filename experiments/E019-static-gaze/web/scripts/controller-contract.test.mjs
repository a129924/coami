import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tasks, flush } from './fake-timer.mjs'
const vendor = new URL('../../../../vendor/stack-chan/',import.meta.url)
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(vendor),encoding:'utf8'}).trim(),'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322')
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:fileURLToPath(vendor),encoding:'utf8'}).trim(),'')
registerHooks({resolve(spec,ctx,next){
 const aliases={'timer':new URL('./fake-timer.mjs',import.meta.url).href,
  'stackchan-util':new URL('firmware/host/modules/util/stackchan-util.ts',vendor).href,
  'mac-address':'data:text/javascript,export default function(){return "fake-mac"}'}
 return spec in aliases?{url:aliases[spec],shortCircuit:true}:next(spec,ctx)
}})
globalThis.trace = ()=>{}
const { MotionController }=await import(new URL('firmware/host/modules/motion/motion-controller.ts',vendor))
function setup(){
 let rotation={y:0,p:0,r:0};const moves=[],torques=[]
 const driver={getRotation(cb){cb({success:true,value:rotation})},applyRotation(r,time,cb){rotation={...r};moves.push({...r});cb?.()},setTorque(t,cb){torques.push(t);cb?.()}}
 const controller=new MotionController({driver},{isPaused:()=>false});return {controller,moves,torques}
}
test('real pinned controller: 4 direction formulas exceed strict threshold',()=>{
 for(const [point,axis,sign] of [[[.5,.5,0],'y',1],[[.5,-.5,0],'y',-1],[[.5,0,.5],'p',-1],[[.5,0,-.5],'p',1]]){
  const s=setup();try{s.controller.lookAt(point);assert.equal(s.moves.length,1);assert.ok(Math.abs(s.moves[0][axis]-sign*Math.PI/4)<1e-9)}finally{s.controller.close();tasks.clear()}
 }
})
test('real pinned controller: clear gaze during motion, retain then stop polling without recentering',()=>{
 const s=setup();try{
  s.controller.lookAt([.5,.5,0]);assert.deepEqual(s.controller.gazePoint,[.5,.5,0]);assert.equal(s.moves.length,1)
  s.controller.lookAway();assert.equal(s.controller.gazePoint,null);assert.equal(s.moves.length,1)
  assert.ok([...tasks.values()].some(t=>t.repeat),'existing movement retains polling')
  flush();assert.equal(tasks.size,0);assert.deepEqual(s.torques,[true,false]);assert.equal(s.moves.length,1)
  s.controller.lookAt([.5,-.5,0]);assert.equal(s.moves.length,2);assert.ok(s.moves[1].y<0)
 }finally{s.controller.close();tasks.clear()}
})
test('real pinned controller: sub-threshold goal does not require head rotation',()=>{
 const s=setup();try{s.controller.lookAt([.5,.1,0]);assert.equal(s.moves.length,0);s.controller.lookAway();assert.equal(tasks.size,0)}finally{s.controller.close();tasks.clear()}
})

test('characterization: pinned up -> clear -> down accepts a new target but issues no new rotation',()=>{
 const s=setup();try{
  s.controller.lookAt([.5,0,.5]);flush();s.controller.lookAway();assert.equal(s.controller.gazePoint,null)
  s.controller.lookAt([.5,0,-.5]);assert.deepEqual(s.controller.gazePoint,[.5,0,-.5])
  assert.equal(s.moves.length,1,'known SDK pitch transition limitation; not a successful reassignment')
  assert.ok(s.moves[0].p<0,'only the original upward command exists')
 }finally{s.controller.close();tasks.clear()}
})
