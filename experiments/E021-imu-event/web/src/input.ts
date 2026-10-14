import type { Scenario, Vector } from './scenarios.ts'
export type InputState='initializing'|'active'|'complete'|'stopped'|'error'
export type RawTuple={sample:Vector;run:number;caseId:number;sampleId:number;offeredTicks:number}
export class SampleInput {
 state:InputState='initializing'
 reason=''
 consumed=0
 lastProgress=0
 readonly run:number
 readonly scenario:Scenario
 private notify:()=>void
 private clock:()=>number
 constructor(run:number,scenario:Scenario,notify:()=>void=()=>{},clock:()=>number=()=>performance.now()) {this.run=run;this.scenario=scenario;this.notify=notify;this.clock=clock;this.lastProgress=clock()}
 ready():void {if(this.state!=='initializing')return;this.state='active';this.lastProgress=this.clock();this.notify()}
 take(ticks:number):RawTuple {
  if(this.state!=='active')throw new Error('source not active')
  if(!Number.isFinite(ticks)) {this.fail(`invalid SDK clock: ${typeof ticks} ${String(ticks)}`);throw new Error(this.reason)}
  if(this.scenario.kind==='interrupt'&&this.consumed===4||this.scenario.kind==='native-failure'&&this.consumed===4) {this.fail(`injected ${this.scenario.kind}`);throw new Error(this.reason)}
  if(this.consumed===this.scenario.samples.length) {this.state='complete';this.reason='last sample processing acknowledged by next SDK poll';this.notify();throw new Error('source complete')}
  const sample={...this.scenario.samples[this.consumed]!}
  this.consumed++;this.lastProgress=this.clock();this.notify()
  return {sample,run:this.run,caseId:this.scenario.caseId,sampleId:this.consumed,offeredTicks:ticks}
 }
 fail(reason:string):void {if(this.state==='stopped'||this.state==='complete'||this.state==='error')return;this.state='error';this.reason=reason;this.notify()}
 stop(reason='operator stop'):void {if(this.state==='complete'||this.state==='error')return;this.state='stopped';this.reason=reason;this.notify()}
 watchdog():void {if(this.state==='active'&&this.clock()-this.lastProgress>=1000)this.fail('raw consumption interrupted for 1000ms')}
}
export class RunGuard {
 private epoch=0
 private controller:AbortController|undefined
 begin():{run:number;signal:AbortSignal} {this.cancel();this.controller=new AbortController();return {run:this.epoch,signal:this.controller.signal}}
 valid(run:number):boolean {return run===this.epoch&&!this.controller?.signal.aborted}
 cancel():void {this.epoch++;this.controller?.abort();this.controller=undefined}
}
