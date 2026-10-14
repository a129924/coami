export const motions=['shake','fallenForward','fallenBackward','fallenLeft','fallenRight','upsideDown'] as const
export type Motion=typeof motions[number]
export type IMUEvent={kind:'imu';motion:Motion;ticks:number}
export type Snapshot={run:number;caseId:number;sampleId:number;sampleTicks:number}
export class IMUObserver {
 private run:number|undefined
 private counts:Record<Motion,number>={shake:0,fallenForward:0,fallenBackward:0,fallenLeft:0,fallenRight:0,upsideDown:0}
 receive(event:IMUEvent,meta:Snapshot|undefined):{kind:'event';event:IMUEvent;meta:Snapshot;counts:Record<Motion,number>} {
  if(!meta||![meta.run,meta.caseId,meta.sampleId].every(v=>Number.isInteger(v)&&v>0))throw new Error('IMU sample metadata missing')
  if(!Number.isFinite(meta.sampleTicks)||!Number.isFinite(event.ticks)||event.ticks>meta.sampleTicks)throw new Error('IMU clock upper bound mismatch')
  if(event.kind!=='imu'||!motions.includes(event.motion))throw new Error('invalid SDK IMU event')
  if(this.run!==undefined&&this.run!==meta.run)throw new Error('IMU run identity mismatch')
  this.run=meta.run;this.counts[event.motion]++
  return {kind:'event',event:{...event},meta:{...meta},counts:{...this.counts}}
 }
}
