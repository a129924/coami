import {readFile,readdir,lstat} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
export const MOD_INPUT_FILES=['mod.ts','protocol.ts','tsconfig.json']
export async function modInputHashes(root){
 const dir=path.join(root,'mod'),names=(await readdir(dir)).sort()
 if(JSON.stringify(names)!==JSON.stringify([...MOD_INPUT_FILES].sort()))throw Error('unsupported MOD compiler input set')
 const sources={}
 for(const file of MOD_INPUT_FILES){
  const absolute=path.join(dir,file)
  if(!(await lstat(absolute)).isFile())throw Error('MOD compiler inputs must be regular files')
  sources[file]=createHash('sha256').update(await readFile(absolute)).digest('hex')
 }
 // Bound this experiment to its local files and dependency-attested TS libraries.
 // External configs, project references and path/plugin inputs need a separate contract.
 const config=JSON.parse(await readFile(path.join(dir,'tsconfig.json'),'utf8'))
 const options=['target','module','moduleResolution','strict','noEmit','skipLibCheck']
 if(Object.keys(config).some(k=>!['compilerOptions','include'].includes(k)) || JSON.stringify(config.include)!==JSON.stringify(['*.ts']) || !config.compilerOptions || Object.keys(config.compilerOptions).some(k=>!options.includes(k)))throw Error('unsupported external MOD compiler configuration')
 return sources
}
