import {test} from 'node:test'
import assert from 'node:assert/strict'
import {analyzeDispatches,readyForReassignment} from './smoke-analysis.ts'
const event=(phase:string)=>({message:'COAMI19|'+JSON.stringify({seq:1,kind:'look',target:'down',point:[0.5,0,-0.5],phase})})
const trace={seq:1,message:'[WasmDriver] applyRotation y=0 p=0.7853981633974483 r=0 time=0.5'}
test('smoke uses synchronous target-matching Ledger evidence instead of ambient seq',()=>{
 assert.equal(analyzeDispatches([event('begin'),trace,event('returned'),event('window-ended')]).length,0)
 assert.equal(analyzeDispatches([event('begin'),event('returned'),trace,event('window-ended')]).length,1)
 assert.equal(analyzeDispatches([event('begin'),{...trace,message:trace.message.replace('p=0.785','p=-0.785')},event('returned'),event('window-ended')]).length,1)
})

const prepare=(phase:string)=>({message:'COAMI19|'+JSON.stringify({seq:1,kind:'prepare',phase})})
const zero={message:'[WasmDriver] applyRotation y=0 p=0 r=0 time=0.5'}
const off={message:'[WasmDriver] setTorque torque=0'},on={message:'[WasmDriver] setTorque torque=1'}
const away={message:'COAMI19|'+JSON.stringify({seq:2,kind:'away',phase:'begin'})}
const cleared=[away,{message:'COAMI19|'+JSON.stringify({seq:2,kind:'away',phase:'returned'})}]
test('neutral preparation requires its own synchronous zero dispatch',()=>{
 assert.equal(analyzeDispatches([prepare('begin'),prepare('returned'),prepare('window-ended')]).length,1)
 assert.equal(analyzeDispatches([prepare('begin'),zero,prepare('returned'),prepare('window-ended')]).length,0)
 assert.equal(analyzeDispatches([prepare('begin'),trace,prepare('returned'),prepare('window-ended')]).length,1)
 assert.equal(analyzeDispatches([prepare('begin'),prepare('returned'),zero,prepare('window-ended')]).length,1)
})
test('clear/reassign requires torque-off after the matching prior rotation, with no later motion',()=>{
 const prefix=[event('begin'),on,trace,event('returned'),event('window-ended')]
 assert.equal(readyForReassignment([...prefix,...cleared]),false)
 assert.equal(readyForReassignment([off,...prefix,...cleared]),false)
 assert.equal(readyForReassignment([...prefix,off,...cleared]),true)
 assert.equal(readyForReassignment([...prefix,...cleared,off]),true)
 assert.equal(readyForReassignment([...prefix,off,...cleared,on]),false)
 assert.equal(readyForReassignment([...prefix,off,...cleared,trace]),false)
 assert.equal(readyForReassignment([...prefix,off]),false)
 assert.equal(readyForReassignment([...prefix,off,away]),false)
})
