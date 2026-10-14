import {Ledger} from './ledger.ts'
// Replay the same causality policy as the UI; record.seq is deliberately ignored.
export function analyzeDispatches(records: readonly {message:string}[]): {seq:number;target?:string;reason:string}[]{
 const ledger=new Ledger(),failures: {seq:number;target?:string;reason:string}[]=[],seen=new Set<number>()
 function finish():void{
  const current=ledger.current
  if(!current||current.kind!=='look'||seen.has(current.seq))return
  seen.add(current.seq)
  if(!ledger.driver||!ledger.returned||ledger.failed||ledger.blocked)failures.push({seq:current.seq,target:current.target,reason:'no synchronous target-matching driver evidence'})
 }
 for(const record of records){
  ledger.ingest(record.message)
  if(ledger.needsObservation){finish();ledger.confirm('未確認')}
 }
 finish()
 return failures
}
