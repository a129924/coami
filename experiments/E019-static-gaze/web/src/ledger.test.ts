import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Ledger } from './ledger.ts'
test('call return and window end never imply direction or clear-state confirmation', () => {
 const l=new Ledger(); l.ingest('COAMI19|{"seq":1,"kind":"away","phase":"begin"}')
 l.ingest('COAMI19|{"seq":1,"kind":"away","phase":"returned"}'); assert.match(l.status,/解除呼叫已返回/)
 l.ingest('COAMI19|{"seq":1,"kind":"away","phase":"window-ended"}'); assert.equal(l.busy,false); assert.equal(l.needsObservation,true)
 assert.equal(l.confirm('符合'),false); assert.equal(l.confirm('未確認'),true)
})
test('driver error after return overrides call-only state and blocks visual PASS', () => {
 const l=new Ledger(); l.ingest('COAMI19|{"seq":2,"kind":"look","phase":"begin","target":"left","point":[0.5,0.5,0]}')
 l.ingest('COAMI19|{"seq":2,"kind":"look","phase":"returned"}'); l.ingest('[MotionController] apply rotation failed: test')
 assert.match(l.status,/執行錯誤/); assert.equal(l.confirm('符合'),false)
 l.ingest('COAMI19|{"seq":2,"kind":"look","phase":"window-ended"}'); assert.equal(l.confirm('符合'),false); assert.equal(l.confirm('未確認'),true)
})
test('stale and malformed records cannot end an active window', () => {
 const l=new Ledger(); l.ingest('COAMI19|{"seq":3,"kind":"look","phase":"begin","target":"up","point":[0.5,0,0.5]}')
 l.ingest('COAMI19|{"seq":2,"kind":"look","phase":"window-ended"}'); l.ingest('COAMI19|{')
 assert.equal(l.busy,true); assert.equal(l.confirm('符合'),false)
})
test('observation is explicit, scoped, and separate from call state', () => {
 const l=new Ledger(); l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"begin","target":"left","point":[0.5,0.5,0]}')
 l.ingest('[WasmDriver] applyRotation y=0.7853981633974483 p=0 r=0 time=0.5'); l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"returned"}')
 l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"window-ended"}'); assert.equal(l.confirm('符合'),true)
 assert.equal(l.observations[0]?.seq,1); assert.match(l.status,/呼叫已返回/)
})
test('runtime errors without an active operation block commands until reload',()=>{
 const l=new Ledger(); l.ingest('[MotionController] get rotation failed: test'); assert.equal(l.blocked,true)
})

test('a call with no driver evidence stays unconfirmed even after its window',()=>{
 const l=new Ledger();l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"begin","target":"down","point":[0.5,0,-0.5]}')
 l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"returned"}');l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"window-ended"}')
 assert.equal(l.confirm('符合'),false);assert.equal(l.confirm('未確認'),true)
})

test('wrong-angle or post-return driver traces cannot validate the current look',()=>{
 for(const [trace,late] of [['[WasmDriver] applyRotation y=0 p=-0.7853981633974483 r=0 time=0.5',false],['[WasmDriver] applyRotation y=0 p=0.7853981633974483 r=0 time=0.5',true],['[WasmDriver] applyRotation y=NaN p=0 r=0 time=0.5',false]] as const){
  const l=new Ledger();l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"begin","target":"down","point":[0.5,0,-0.5]}')
  if(late)l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"returned"}')
  l.ingest(trace);l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"returned"}');l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"window-ended"}')
  assert.equal(l.confirm('符合'),false)
 }
})
test('a matching rotation within the synchronous look call supports its own observation',()=>{
 const l=new Ledger();l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"begin","target":"down","point":[0.5,0,-0.5]}')
 l.ingest('[WasmDriver] applyRotation y=0 p=0.7853981633974483 r=0 time=0.5')
 l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"returned"}');l.ingest('COAMI19|{"seq":1,"kind":"look","phase":"window-ended"}');assert.equal(l.confirm('符合'),true)
})
