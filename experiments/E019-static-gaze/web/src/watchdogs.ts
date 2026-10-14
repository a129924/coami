type Schedule = (callback: () => void) => () => void
const scheduler = (ms:number):Schedule => callback => { const id=setTimeout(callback,ms);return()=>clearTimeout(id) }
export class ReplyWatchdog {
 private token=0
 private active=false
 private cancelTimer=()=>{}
 private timeout:()=>void
 private blocked:()=>boolean
 private schedule:Schedule
 constructor(timeout:()=>void,blocked:()=>boolean,schedule:Schedule=scheduler(2000)){this.timeout=timeout;this.blocked=blocked;this.schedule=schedule}
 arm():void{
  this.cancelTimer();const token=++this.token;this.active=true
  this.cancelTimer=this.schedule(()=>{if(this.active&&token===this.token&&!this.blocked()){this.active=false;this.timeout()}})
 }
 acknowledge():void{this.active=false;this.cancelTimer()}
}
export function watchOperation(pending:()=>boolean,blocked:()=>boolean,timeout:()=>void,schedule:Schedule=scheduler(12000)):()=>void{
 return schedule(()=>{if(!blocked()&&pending())timeout()})
}
