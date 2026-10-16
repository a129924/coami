import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFile,realpath,rm} from 'node:fs/promises'
import path from 'node:path'
import {installedTreeSha256} from './installed-tree.mjs'
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const digest=async file=>sha(await readFile(file))
const describe=executable=>JSON.parse(execFileSync(executable,['-I','-B','-c','import json,sys;print(json.dumps({"version":sys.version.split()[0],"basePrefix":sys.base_prefix}))'],{encoding:'utf8'}))
export async function attestPython(root,inspect=describe){
 const server=path.join(root,'server'),venv=path.join(server,'.venv'),executable=await realpath(path.join(venv,'bin/python'))
 const info=inspect(executable),basePrefix=await realpath(info.basePrefix)
 if(info.version!=='3.12.12')throw Error('pinned Python 3.12.12 required')
 return {version:info.version,executable,executableSha256:await digest(executable),basePrefix,baseTreeSha256:await installedTreeSha256(basePrefix),venvTreeSha256:await installedTreeSha256(venv),lockSha256:await digest(path.join(server,'uv.lock')),projectSha256:await digest(path.join(server,'pyproject.toml')),setup:['uv venv --clear --python 3.12.12 .venv','uv sync --locked --reinstall'],launchFlags:['-I','-B']}
}
export async function preparePython(root,{run=execFileSync,inspect=describe}={}){
 const server=path.join(root,'server'),venv=path.join(server,'.venv')
 const env={...process.env,UV_PROJECT_ENVIRONMENT:venv}
 for(const key of Object.keys(env))if(key.startsWith('PYTHON')||key==='VIRTUAL_ENV'||key==='UV_PYTHON')delete env[key]
 env.PYTHONDONTWRITEBYTECODE='1'
 // Remove the old executable before uv can inspect a potentially modified venv.
 await rm(venv,{recursive:true,force:true})
 run('uv',['venv','--clear','--python','3.12.12',venv],{cwd:server,env,stdio:'inherit',timeout:60000})
 run('uv',['sync','--locked','--reinstall'],{cwd:server,env,stdio:'inherit',timeout:60000})
 return attestPython(root,inspect)
}
export async function verifyPython(root,attestation){
 const server=path.join(root,'server'),venv=path.join(server,'.venv')
 const executable=await realpath(path.join(venv,'bin/python'))
 if(executable!==attestation.executable || await digest(executable)!==attestation.executableSha256 || await digest(path.join(server,'uv.lock'))!==attestation.lockSha256 || await digest(path.join(server,'pyproject.toml'))!==attestation.projectSha256 || await installedTreeSha256(venv)!==attestation.venvTreeSha256 || await installedTreeSha256(attestation.basePrefix)!==attestation.baseTreeSha256)
  throw Error('Python runtime environment changed after locked recreation')
}
