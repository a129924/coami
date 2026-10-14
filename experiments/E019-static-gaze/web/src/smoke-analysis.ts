import {Ledger} from './ledger.ts'
// Replay the same causality policy as the UI; record.seq is deliberately ignored.
export function analyzeDispatches(records: readonly {message:string}[]): {seq:number;target?:string;reason:string}[]{
 const ledger=new Ledger(),failures: {seq:number;target?:string;reason:string}[]=[],seen=new Set<number>()
 function finish():void{
  const current=ledger.current
  if(!current||current.kind==='away'||seen.has(current.seq))return
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

// Stability is evidence about the preceding motion, never lookAway completion semantics.
export function readyForReassignment(records: readonly {message:string}[]): boolean {
 let motion: number | undefined,clear: number | undefined,clearReturned=false,settled=false,priorDispatch=false
 const ledger=new Ledger()
 for(const {message} of records){
  ledger.ingest(message)
  if(ledger.failed||ledger.blocked)return false
  if(message.startsWith('COAMI19|')){
   let event: unknown;try{event=JSON.parse(message.slice(8))}catch{return false}
   if(typeof event!=='object'||!event)continue
   const e=event as Record<string,unknown>
   if(e.phase==='begin'&&(e.kind==='look'||e.kind==='prepare')){motion=Number(e.seq);clear=undefined;clearReturned=false;settled=false;priorDispatch=false}
   if(e.phase==='begin'&&e.kind==='away'&&ledger.current?.seq===e.seq&&ledger.current?.kind==='away')clear=Number(e.seq)
   if(e.phase==='returned'&&e.kind==='away'&&e.seq===clear)clearReturned=true
  }
  if(message.startsWith('[WasmDriver] applyRotation')||message==='[WasmDriver] setTorque torque=1')settled=false
  if(message==='[WasmDriver] setTorque torque=0'&&motion!==undefined&&(ledger.driver||priorDispatch))settled=true
  if(ledger.needsObservation)ledger.confirm('未確認')
  // Retain dispatch evidence across away, whose begin resets Ledger.driver.
  if(ledger.current?.seq===motion&&ledger.driver)priorDispatch=true
 }
 return clear!==undefined&&clearReturned&&settled&&priorDispatch&&!ledger.failed&&!ledger.blocked
}
