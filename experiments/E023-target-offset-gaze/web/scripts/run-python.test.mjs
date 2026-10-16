import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {attestPython,verifyPython,preparePython} from './run-python.mjs'
async function fixture(){
 const root=await mkdtemp(path.join(tmpdir(),'e023-python-')),base=path.join(root,'base')
 for(const dir of ['base/bin','server/.venv/bin'])await mkdir(path.join(root,dir),{recursive:true})
 await writeFile(path.join(base,'bin/python'),'interpreter')
 await writeFile(path.join(base,'stdlib.py'),'standard library')
 await symlink(path.join(base,'bin/python'),path.join(root,'server/.venv/bin/python'))
 for(const name of ['pyproject.toml','uv.lock'])await writeFile(path.join(root,'server',name),'locked')
 return {root,base,inspect:()=>({version:'3.12.12',basePrefix:base})}
}
test('Python attestation rejects installed package, interpreter, stdlib and lock edits',async()=>{
 const {root,base,inspect}=await fixture()
 try{
  const a=await attestPython(root,inspect);await verifyPython(root,a)
  for(const [file,original] of [['server/.venv/package.py',null],['base/bin/python','interpreter'],['base/stdlib.py','standard library'],['server/uv.lock','locked']]){
   await writeFile(path.join(root,file),'modified runtime')
   await assert.rejects(verifyPython(root,a),/Python runtime environment changed/)
   if(original===null)await rm(path.join(root,file));else await writeFile(path.join(root,file),original)
  }
 }finally{await rm(root,{recursive:true,force:true})}
})
test('runner recreates the old venv before locked reinstall and attestation',async()=>{
 const {root,base,inspect}=await fixture(),commands=[]
 try{
  const {existsSync,mkdirSync,symlinkSync}=await import('node:fs')
  const a=await preparePython(root,{inspect,run:(command,args,{cwd,env})=>{
   commands.push([command,...args]);assert.equal(cwd,path.join(root,'server'));assert.equal(env.UV_PROJECT_ENVIRONMENT,path.join(root,'server/.venv'))
   if(args[0]==='venv'){assert.equal(existsSync(path.join(root,'server/.venv')),false);mkdirSync(path.join(root,'server/.venv/bin'),{recursive:true});symlinkSync(path.join(base,'bin/python'),path.join(root,'server/.venv/bin/python'))}
  }})
  assert.deepEqual(commands.map(c=>c.slice(0,2)),[['uv','venv'],['uv','sync']])
  await verifyPython(root,a)
 }finally{await rm(root,{recursive:true,force:true})}
})
