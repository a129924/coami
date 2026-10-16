import {IMUObserver,type IMUEvent,type Snapshot} from './observer'
type Robot={input:{imu?:{onEvent:(event:IMUEvent)=>void;start():void}}}
const emit=(record:object):void=>trace(`COAMI21|${JSON.stringify(record)}\n`)
export function onLaunch():boolean{return true}
export function onContextCreated(robot:Robot):void {
 const imu=robot.input.imu
 if(!imu){emit({kind:'unavailable',reason:'IMU raw provider missing'});return}
 const observer=new IMUObserver()
 imu.onEvent=event=>{
  try{emit(observer.receive(event,(globalThis as typeof globalThis&{__coami21?:Snapshot}).__coami21))}
  catch(error){emit({kind:'error',reason:String(error)})}
 }
 emit({kind:'ready'});imu.start()
}
