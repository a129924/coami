let seq=0
export const tasks=new Map()
const Timer={ set(fn,ms){const id=++seq;tasks.set(id,{fn,ms,repeat:false});return id},
 repeat(fn,ms){const id=++seq;tasks.set(id,{fn,ms,repeat:true});return id},clear(id){tasks.delete(id)} }
export function flush(){for(const [id,t] of [...tasks]) if(!t.repeat){tasks.delete(id);t.fn()}}
export default Timer
