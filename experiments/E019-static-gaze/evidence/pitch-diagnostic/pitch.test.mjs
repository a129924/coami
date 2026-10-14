// Offline diagnosis only: candidate source is transformed in memory, never written to vendor.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import {fileURLToPath} from 'node:url'
import {verifyVendor} from '../../web/scripts/build-safety.mjs'
import { createHash } from 'node:crypto'
import { tasks, flush } from '../../web/scripts/fake-timer.mjs'
const vendor = new URL('../../../../vendor/stack-chan/', import.meta.url)
verifyVendor(fileURLToPath(new URL('../../../../',import.meta.url)),fileURLToPath(vendor),'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322')
const utilUrl = new URL('firmware/host/modules/util/stackchan-util.ts', vendor).href
const original = readFileSync(new URL(utilUrl), 'utf8')
assert.equal(createHash('sha256').update(original).digest('hex'),'d28ad77de7fa759d82167062d67da17f07db422e94b45c8fedc7b6a4b724a141')
const before = 'const inversePitch = -bodyRotation.p'
const after = 'const inversePitch = bodyRotation.p'
assert.equal(original.split(before).length, 2)
const candidate = process.env.PITCH_DIAGNOSTIC === 'candidate'
console.log(JSON.stringify({ mode: candidate ? 'candidate' : 'original', sourceSha256: createHash('sha256').update(original).digest('hex'), patch: `${before} -> ${after}`, realWasm: false }))
registerHooks({
  resolve(spec, ctx, next) {
    const aliases = { timer: new URL('../../web/scripts/fake-timer.mjs', import.meta.url).href,
      'stackchan-util': utilUrl, 'mac-address': 'data:text/javascript,export default function(){return "fake-mac"}' }
    return spec in aliases ? { url: aliases[spec], shortCircuit: true } : next(spec, ctx)
  },
  load(url, ctx, next) {
    if (url === utilUrl && candidate) return { format: 'module', source: stripTypeScriptTypes(original.replace(before, after)), shortCircuit: true }
    return next(url, ctx)
  },
})
globalThis.trace = () => {}
const { writeBodyRelativeVector3, writeRotationFromVector3 } = await import(utilUrl)
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
