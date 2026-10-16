import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {installDependencies,verifyDependencies} from './run-dependencies.mjs'
test('actual npm ci removes modified installed modules; later dependency or lock edits fail attestation',async()=>{
 const web=await mkdtemp(path.join(tmpdir(),'e023-dependencies-'))
 try{
  await writeFile(path.join(web,'package.json'),JSON.stringify({name:'e023-fixture',version:'1.0.0'}))
  const lock=JSON.stringify({name:'e023-fixture',version:'1.0.0',lockfileVersion:3,requires:true,packages:{'':{name:'e023-fixture',version:'1.0.0'}}})
  await writeFile(path.join(web,'package-lock.json'),lock)
  await mkdir(path.join(web,'node_modules'));await writeFile(path.join(web,'node_modules/dirty.js'),'modified installed code')
  const attestation=await installDependencies(web)
  await assert.rejects(readFile(path.join(web,'node_modules/dirty.js')),{code:'ENOENT'})
  await verifyDependencies(web,attestation)
  await writeFile(path.join(web,'node_modules/injected.js'),'unexpected dependency')
  await assert.rejects(verifyDependencies(web,attestation),/installed dependencies changed/)
  await rm(path.join(web,'node_modules/injected.js'))
  await writeFile(path.join(web,'node_modules/.vite-temp/injected.mjs'),'unexpected config input')
  await assert.rejects(verifyDependencies(web,attestation),/installed dependencies changed/)
  await rm(path.join(web,'node_modules/.vite-temp/injected.mjs'))
  await writeFile(path.join(web,'package-lock.json'),lock+' ')
  await assert.rejects(verifyDependencies(web,attestation),/installed dependencies changed/)
 }finally{await rm(web,{recursive:true,force:true})}
})
