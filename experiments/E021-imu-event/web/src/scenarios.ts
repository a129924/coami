import type { IMUVector3, MotionType } from '../../../../vendor/stack-chan/firmware/host/modules/input/imu-motion.ts'
export type Vector = IMUVector3
export type Motion = MotionType
export type Scenario = {id:string; caseId:number; label:string; kind:'normal'|'cooldown'|'interrupt'|'native-failure'; samples:Vector[]; expected:{motion:Motion;index:number}[]}
export const G=9.80665
export const U:Vector={x:0,y:G,z:0}
export const postures:Record<Exclude<Motion,'shake'>,Vector>={fallenForward:{x:0,y:0,z:-G},fallenBackward:{x:0,y:0,z:G},fallenLeft:{x:G,y:0,z:0},fallenRight:{x:-G,y:0,z:0},upsideDown:{x:0,y:-G,z:0}}
const repeat=(v:Vector,n:number):Vector[]=>Array.from({length:n},()=>({...v}))
const alternations=(delta:number,n:number):Vector[]=>Array.from({length:n},(_,i)=>({x:0,y:G+(i%2===0?delta:0),z:0}))
const entries:Omit<Scenario,'caseId'>[]=[]
const add=(id:string,label:string,samples:Vector[],expected:Scenario['expected']=[],kind:Scenario['kind']='normal'):void=>{entries.push({id,label,samples,expected,kind})}
for(const [motion,target] of Object.entries(postures) as [Exclude<Motion,'shake'>,Vector][]) {
 add(motion,`${motion} · 維持／恢復再觸發`,[...repeat(U,3),...repeat(target,13),...repeat(U,3),...repeat(target,3)],[{motion,index:6},{motion,index:22}])
 add(`${motion}-two`,`${motion} · 僅兩筆`,[...repeat(U,3),...repeat(target,2)])
 for(const ratio of [.749,.751]) {
  const v:Vector={x:Math.sqrt((1-ratio**2)/2)*G,y:Math.sqrt((1-ratio**2)/2)*G,z:Math.sqrt((1-ratio**2)/2)*G}
  const axis=motion==='upsideDown'?'y':motion==='fallenLeft'||motion==='fallenRight'?'x':'z'
  v[axis]=ratio*G*(motion==='fallenRight'||motion==='fallenForward'||motion==='upsideDown'?-1:1)
  add(`${motion}-${ratio}`,`${motion} · 門檻 ${ratio}`,[...repeat(U,3),...repeat(v,3)],ratio>.75?[{motion,index:6}]:[])
 }
}
add('shake','shake · 10 次有效變化',[...repeat(U,3),...alternations(1.5,10)],[{motion:'shake',index:13}])
add('shake-nine','shake · 僅 9 次變化',[...repeat(U,3),...alternations(1.5,9)])
for(const delta of [1.199,1.201]) add(`shake-${delta}`,`shake · 幅度差 ${delta}`,[...repeat(U,3),...alternations(delta,10)],delta>1.2?[{motion:'shake',index:13}]:[])
add('spike','單尖峰',[...repeat(U,3),{x:0,y:G+3,z:0},...repeat(U,10)])
add('broken-nine','9 次變化被穩定樣本打斷',[...repeat(U,3),...alternations(1.5,9),{x:0,y:G+1.5,z:0},...repeat(U,3)])
add('upright','直立 · 無 Event',repeat(U,20))
add('zero','零向量 · 無 Event',repeat({x:0,y:0,z:0},20))
add('unknown','三軸等分 · 無 Event',repeat({x:G/Math.sqrt(3),y:G/Math.sqrt(3),z:G/Math.sqrt(3)},20))
add('cooldown','shake · 冷卻與冷卻後再觸發',[...repeat(U,3),...alternations(1.5,20),...repeat(U,16),...alternations(1.5,10)],[{motion:'shake',index:13},{motion:'shake',index:49}],'cooldown')
add('source-interrupt','供樣中斷 · 預期 error',repeat(U,10),[],'interrupt')
add('native-failure','native sample 失敗 · 預期 error',repeat(U,10),[],'native-failure')
export const scenarios:Scenario[]=entries.map((s,i)=>({...s,caseId:i+1}))
export function getScenario(id:string):Scenario {const s=scenarios.find(s=>s.id===id);if(!s)throw new Error('unknown scenario');return s}
