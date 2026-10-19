import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {npmConfigFreeEnvironment} from './node-environment.mjs'
test('host npm ignores inherited node-options and user/global configs in actual lifecycle',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'e023-host-npm-'))
 try{
  const hook=path.join(root,'hook.cjs'),marker=path.join(root,'preloaded'),user=path.join(root,'user.npmrc')
  await writeFile(hook,`require('node:fs').writeFileSync(${JSON.stringify(marker)},'injected')`)
  await writeFile(user,`node-options=--require=${hook}\n`)
  await writeFile(path.join(root,'package.json'),JSON.stringify({name:'fixture',version:'1.0.0',scripts:{'build:wasm':'node build.cjs'}}))
  await writeFile(path.join(root,'build.cjs'),"if(process.env.NODE_OPTIONS)throw Error('unrecorded hook');require('node:fs').writeFileSync('output','clean')")
  const inherited={...process.env,npm_config_node_options:`--require=${hook}`,NPM_CONFIG_USERCONFIG:user,npm_config_globalconfig:user,npm_lifecycle_script:'unrecorded lifecycle'}
  delete inherited.NODE_OPTIONS;delete inherited.NODE_PATH
  const env=npmConfigFreeEnvironment(root,inherited)
  assert.equal(env.npm_config_node_options,undefined);assert.equal(env.NPM_CONFIG_USERCONFIG,undefined);assert.equal(env.npm_lifecycle_script,undefined)
  execFileSync('npm',['run','build:wasm'],{cwd:root,env,stdio:'pipe'})
  assert.equal(await readFile(path.join(root,'output'),'utf8'),'clean')
  await assert.rejects(readFile(marker),{code:'ENOENT'})
  await writeFile(path.join(root,'.npmrc'),`node-options=--require=${hook}\n`)
  assert.throws(()=>npmConfigFreeEnvironment(root,inherited),/project npm configuration/)
 }finally{await rm(root,{recursive:true,force:true})}
})
