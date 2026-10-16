import {spawn} from 'node:child_process'

export async function terminate(child,graceMs=1000){
 if(!child?.pid || child.exitCode!==null || child.signalCode!==null)return
 await new Promise(resolve=>{
  const escalation=setTimeout(()=>child.kill('SIGKILL'),graceMs)
  child.once('close',()=>{clearTimeout(escalation);resolve()})
  child.kill('SIGTERM')
 })
}

// A startup failure owns cleanup until the caller can receive the child handle.
export async function startProcess(command,args,cwd,readyText,{startupTimeoutMs=10000,killGraceMs=1000}={}){
 const child=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe']});let output=''
 await new Promise((resolve,reject)=>{
  let settled=false
  const cleanup=()=>{
   clearTimeout(deadline)
   child.stdout.off('data',onData);child.stderr.off('data',onData)
   child.off('error',onError);child.off('close',onClose)
  }
  const fail=async(error,closed=false)=>{
   if(settled)return
   settled=true;cleanup()
   try{if(!closed)await terminate(child,killGraceMs)}catch(cleanupError){reject(cleanupError);return}
   reject(error)
  }
  const onData=chunk=>{
   output+=chunk
   if(!settled&&output.includes(readyText)){settled=true;cleanup();resolve()}
  }
  const onError=error=>{void fail(error)}
  const onClose=()=>{void fail(Error('process exited: '+output),true)}
  const deadline=setTimeout(()=>{void fail(Error('process startup timeout '+output))},startupTimeoutMs)
  child.stdout.on('data',onData);child.stderr.on('data',onData)
  child.once('error',onError);child.once('close',onClose)
 })
 return child
}
