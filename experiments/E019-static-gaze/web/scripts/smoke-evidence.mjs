import {mkdir,mkdtemp,writeFile,rename} from 'node:fs/promises'
import path from 'node:path'
export async function beginSmokeEvidence(evidence){
 await mkdir(path.join(evidence,'smoke-runs'),{recursive:true})
 const directory=await mkdtemp(path.join(evidence,'smoke-runs',`${new Date().toISOString().replace(/[:.]/g,'-')}-`))
 const runId=path.basename(directory)
 const save=async report=>{
  const bytes=JSON.stringify({experiment:'E019',runId,capturedAt:new Date().toISOString(),...report},null,2)+'\n'
  await writeFile(path.join(directory,'report.json'),bytes)
  const latest=path.join(evidence,'runtime-smoke-latest.json')
  await writeFile(`${latest}.tmp`,bytes);await rename(`${latest}.tmp`,latest)
 }
 await save({status:'RUNNING',cases:[],kind:'automated, NOT human'})
 return {directory,runId,save}
}
