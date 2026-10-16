import {CASES} from '../src/observer.ts'
export const CASE_IDS=CASES.map(c=>c.id)
export function selectCases(value){
 if(value===undefined)return CASES.map((_,i)=>i)
 const tokens=value.split(',')
 if(tokens.some(t=>!/^\d+$/.test(t.trim())))throw Error('E023_CASES requires integer indices')
 const indices=tokens.map(Number)
 if(indices.some(i=>!Number.isSafeInteger(i)||i<0||i>=CASES.length)||new Set(indices).size!==indices.length)
  throw Error('E023_CASES requires unique indices in range 0..14')
 return indices
}
export function suiteState(cases){
 const ids=cases.map(c=>c.id)
 if(ids.length!==CASE_IDS.length||new Set(ids).size!==CASE_IDS.length||CASE_IDS.some(id=>!ids.includes(id)))return 'partial'
 if(cases.some(c=>!['成功','失敗'].includes(c.result.state)))return '無法判定'
 return cases.every(c=>c.result.state==='成功')?'成功':'失敗'
}
export function requireSelectedCase(index,evidence){
 if(evidence?.case?.id!==CASE_IDS[index])throw Error('returned case identity differs from selected case')
}
