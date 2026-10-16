import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {stripTypeScriptTypes} from 'node:module'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {IMUObserver,type IMUEvent,type Snapshot} from '../../mod/observer.ts'
const root=new URL('../../../../',import.meta.url),moduleRoot=new URL('vendor/stack-chan/firmware/host/modules/input/',root)
const data=(code:string)=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
type Fake={ticks:number;callback:(()=>void)|undefined;interval:number;cleared:number}
const fixture:Fake={ticks:0,callback:undefined,interval:0,cleared:0}
;(globalThis as typeof globalThis&{__e021Fixture:Fake;trace:(s:string)=>void}).__e021Fixture=fixture
;(globalThis as typeof globalThis&{trace:(s:string)=>void}).trace=()=>{}
const time=data('export default {get ticks(){return globalThis.__e021Fixture.ticks}}')
const timer=data('export default {repeat(callback,interval){Object.assign(globalThis.__e021Fixture,{callback,interval});return 1},clear(){globalThis.__e021Fixture.callback=undefined;globalThis.__e021Fixture.cleared++}}')
const eventModule=data(stripTypeScriptTypes(await readFile(new URL('input-event.ts',moduleRoot),'utf8')))
const imuCode=stripTypeScriptTypes(await readFile(new URL('imu.ts',moduleRoot),'utf8')).replace("'imu-motion'",JSON.stringify(new URL('imu-motion.ts',moduleRoot).href)).replace("'input-event'",JSON.stringify(eventModule)).replace("'time'",JSON.stringify(time)).replace("'timer'",JSON.stringify(timer))
type Instance={onEvent:(e:IMUEvent)=>void;start():void;stop():void;close():void}
const {default:IMU}=await import(data(imuCode)) as {default:new(Driver:new()=>{sample():{accelerometer:{x:number;y:number;z:number}};configure(o:unknown):void})=>Instance}
test('TC-RUNTIME real SDK IMU → recognizer → Event → observer, original 100ms poll and sample ticks upper bound',()=>{
 const samples:{x:number;y:number;z:number}[]=[],events:ReturnType<IMUObserver['receive']>[]=[],observer=new IMUObserver()
 let configuration:unknown,meta:Snapshot|undefined,index=0
 class Driver {configure(o:unknown){configuration=o} sample(){const v=samples.shift();if(!v)throw new Error('no sample');fixture.ticks++;meta={run:1,caseId:1,sampleId:++index,sampleTicks:fixture.ticks};return {accelerometer:v}}}
 const imu=new IMU(Driver);imu.onEvent=e=>events.push(observer.receive(e,meta));imu.start()
 assert.deepEqual(configuration,{order:'zxy'});assert.equal(fixture.interval,100)
 const poll=(v:{x:number;y:number;z:number})=>{samples.push(v);fixture.ticks+=100;fixture.callback!()}
 const left={x:9.80665,y:0,z:0},upright={x:0,y:9.80665,z:0}
 poll(left);poll(left);assert.equal(events.length,0);poll(left);assert.equal(events[0]!.event.motion,'fallenLeft')
 assert.ok(events[0]!.event.ticks<events[0]!.meta.sampleTicks)
 poll(left);assert.equal(events.length,1)
 for(let i=0;i<3;i++)poll(upright)
 for(let i=0;i<3;i++)poll(left)
 assert.equal(events.length,2)
 fixture.callback!();assert.equal(events.length,2) // source error skips, never replays last sample
 imu.close();assert.equal(fixture.callback,undefined)
})
test('TC-RUNTIME scratch patch leaves original IMU, recognizer and Event bytes unchanged',async()=>{
 const staged=new URL('../generated/pinned-stack-chan/',import.meta.url)
 for(const file of ['imu.ts','imu-motion.ts','input-event.ts'])assert.equal(await readFile(new URL(`firmware/host/modules/input/${file}`,staged),'utf8'),await readFile(new URL(file,moduleRoot),'utf8'))
 const list=(args:string[])=>execFileSync('git',args,{cwd:fileURLToPath(staged),encoding:'utf8'}).trim().split('\n').filter(Boolean)
 const actual=[...new Set([...list(['diff','--name-only','HEAD']),...list(['ls-files','--others','--exclude-standard'])])].sort()
 assert.deepEqual(actual,['firmware/host/app/main.ts','firmware/host/modules/input/manifest_wasm.json','firmware/host/modules/input/wasm/imu-bridge.c','firmware/host/modules/input/wasm/imu-bridge.js','firmware/host/modules/input/wasm/time-compat.js','firmware/host/modules/input/wasm/pinned-time.js','web/src/services/simulator/simulator-engine.d.mts','web/src/services/simulator/simulator-engine.mjs'].sort())
})
