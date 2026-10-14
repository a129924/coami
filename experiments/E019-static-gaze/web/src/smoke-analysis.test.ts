import {test} from 'node:test'
import assert from 'node:assert/strict'
import {analyzeDispatches} from './smoke-analysis.ts'
const event=(phase:string)=>({message:'COAMI19|'+JSON.stringify({seq:1,kind:'look',target:'down',point:[0.5,0,-0.5],phase})})
const trace={seq:1,message:'[WasmDriver] applyRotation y=0 p=0.7853981633974483 r=0 time=0.5'}
test('smoke uses synchronous target-matching Ledger evidence instead of ambient seq',()=>{
 assert.equal(analyzeDispatches([event('begin'),trace,event('returned'),event('window-ended')]).length,0)
 assert.equal(analyzeDispatches([event('begin'),event('returned'),trace,event('window-ended')]).length,1)
 assert.equal(analyzeDispatches([event('begin'),{...trace,message:trace.message.replace('p=0.785','p=-0.785')},event('returned'),event('window-ended')]).length,1)
})
