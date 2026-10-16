import {test} from 'node:test'
import assert from 'node:assert/strict'
import {CASE_IDS,selectCases,suiteState,requireSelectedCase} from './run-cases.mjs'
test('case selector rejects duplicates, omissions disguised by bad indices, and malformed values',()=>{
 assert.deepEqual(selectCases(undefined),Array.from({length:15},(_,i)=>i))
 assert.deepEqual(selectCases('0,14'),[0,14])
 for(const value of ['', '0,', 'NaN', '-1', '15', '1.5', '0,0', Array(15).fill('0').join(',')])assert.throws(()=>selectCases(value),/E023_CASES/)
})
test('only exact unique case identities can yield a complete suite',()=>{
 const cases=CASE_IDS.map(id=>({id,result:{state:'成功'}}))
 assert.equal(suiteState(cases),'成功')
 cases[4].result.state='失敗';assert.equal(suiteState(cases),'失敗')
 assert.equal(suiteState(cases.slice(1)),'partial')
 assert.equal(suiteState([...cases.slice(1),cases[1]]),'partial')
 assert.equal(suiteState(Array(15).fill(cases[0])),'partial')
 cases[4].result.state='無法判定';assert.equal(suiteState(cases),'無法判定')
 assert.throws(()=>requireSelectedCase(1,{case:{id:'TC-E2E-01'}}),/identity/)
 assert.doesNotThrow(()=>requireSelectedCase(1,{case:{id:'TC-E2E-02'}}))
})
