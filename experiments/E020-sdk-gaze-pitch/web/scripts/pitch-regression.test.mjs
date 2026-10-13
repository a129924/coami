// Load actual original or patched source; fake timer, driver and UI only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tasks, flush } from './fake-timer.mjs'
const source = process.env.SDK_SOURCE ?? '../../../../vendor/stack-chan/'
const vendor = new URL(source, import.meta.url)
const utilUrl = new URL('firmware/host/modules/util/stackchan-util.ts', vendor).href
console.log(JSON.stringify({ source: vendor.href, sourceSha256: createHash('sha256').update(readFileSync(new URL(utilUrl))).digest('hex'), realWasm: false }))
registerHooks({resolve(spec, ctx, next) {
 const aliases = { timer: new URL('./fake-timer.mjs', import.meta.url).href,
  'stackchan-util': utilUrl,
  'face-state': new URL('firmware/host/modules/ui/state/face-state.ts',vendor).href,
  'effects/speech-balloon': 'data:text/javascript,export class SpeechBalloon {}',
  'mac-address': 'data:text/javascript,export default function(){return "fake-mac"}' }
 return spec in aliases ? {url:aliases[spec],shortCircuit:true} : next(spec,ctx)
}})
globalThis.trace = () => {}
const { writeBodyRelativeVector3 } = await import(utilUrl)
const { MotionController } = await import(new URL('firmware/host/modules/motion/motion-controller.ts', vendor))
const up = [.5, 0, .5], down = [.5, 0, -.5]
function setup() {
  let rotation = { y: 0, p: 0, r: 0 }; const moves = []
  const driver = { getRotation(cb) { cb({ success: true, value: rotation }) },
    applyRotation(value, time, cb) { rotation = { ...value }; moves.push({ ...value }); cb?.() }, setTorque(value, cb) { cb?.() } }
  return { controller: new MotionController({ driver }, { isPaused: () => false }), moves }
}
test('a target already aligned with body yaw/pitch becomes body-forward', () => {
  for (const [y, p] of [[0, -Math.PI/4], [0, Math.PI/4], [.65, -.5], [-.4, .6]]) {
    const point = [Math.cos(p)*Math.cos(y), Math.cos(p)*Math.sin(y), -Math.sin(p)]
    const relative = [0, 0, 0]; writeBodyRelativeVector3(relative, point, { y, p, r: 0 })
    assert.ok(Math.abs(relative[0]-1)<1e-9); assert.ok(Math.abs(relative[1])<1e-9); assert.ok(Math.abs(relative[2])<1e-9)
  }
})
test('up-clear-down and down-clear-up issue the opposite pitch command', () => {
  for (const [first, second] of [[up, down], [down, up]]) {
    const s=setup(); try {
      s.controller.lookAt(first); flush(); s.controller.lookAway(); assert.equal(s.controller.gazePoint, null)
      s.controller.lookAt(second); assert.equal(s.moves.length, 2)
      assert.ok(Math.abs(s.moves[1].p + Math.atan2(second[2], second[0]))<1e-9)
    } finally { s.controller.close(); tasks.clear() }
  }
})
test('a settled matching pitch target does not keep issuing identical rotations', () => {
  for (const point of [up, down]) {
    const s=setup(); try { s.controller.lookAt(point); flush(); s.controller.updatePose(); assert.equal(s.moves.length, 1) }
    finally { s.controller.close(); tasks.clear() }
  }
})
test('horizontal reassignment and the existing small-angle threshold remain intact', () => {
  const s=setup(); try {
    s.controller.lookAt([.5,.1,0]); assert.equal(s.moves.length,0); s.controller.lookAway()
    s.controller.lookAt([.5,.5,0]); flush(); s.controller.lookAway(); s.controller.lookAt([.5,-.5,0])
    assert.equal(s.moves.length,2); assert.ok(s.moves[1].y<0)
  } finally { s.controller.close(); tasks.clear() }
})

const { StackchanRuntimeUI } = await import(new URL('firmware/host/app/runtime-ui.ts',vendor))
test('real runtime UI: aligned world target stays aligned for tilted body and offset eyes', () => {
 for (const [y,p] of [[0,-Math.PI/4],[0,Math.PI/4],[.65,-.5],[-.4,.6]]) {
  let state
  const body={position:{x:0,y:0,z:0},rotation:{y,p,r:0}}
  const eye=(side)=>({position:{x:0,y:side*.02,z:0},rotation:{y:0,p:0,r:0}})
  const target=[Math.cos(p)*Math.cos(y),Math.cos(p)*Math.sin(y),-Math.sin(p)]
  const ui=new StackchanRuntimeUI({update(_interval,s){state=s}}, {
   getPose:()=>({body,eyes:{left:eye(1),right:eye(-1)}}),getGazePoint:()=>target,isPaused:()=>false,getContext:()=>({})})
  ui.updateFace(16)
  for (const key of ['left','right']) {
   assert.ok(Math.abs(state.eyes[key].gazeY-1)<1e-9)
   assert.ok(Math.abs(state.eyes[key].gazeX-1/Math.sqrt(1+.02**2))<1e-9)
  }
 }
})
test('lookAway clears target without recentering or cancelling existing motion', () => {
 const s=setup();try {
  s.controller.lookAt(up); assert.equal(s.moves.length,1)
  s.controller.lookAway();assert.equal(s.controller.gazePoint,null);assert.equal(s.moves.length,1)
  assert.ok(tasks.size>0);flush();assert.equal(tasks.size,0);assert.equal(s.moves.length,1)
 }finally{s.controller.close();tasks.clear()}
})
