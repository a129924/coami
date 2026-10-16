import {installedTreeSha256} from './installed-tree.mjs'
import {cp,rm} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
export async function replaceCache(source,destination){
 await rm(destination,{recursive:true,force:true})
 await cp(source,destination,{recursive:true})
}
export async function clearModOutputs(generated){
 for(const name of ['public/coami-mod.xsa','public/mod-provenance.json','mod'])
  await rm(path.join(generated,name),{recursive:true,force:true})
}
export function assertVendorPin(checkout,gitlink,status,pin){
 if(checkout!==pin||gitlink!==pin||status)throw Error('Pinned vendor checkout/gitlink mismatch or dirty files')
}
export function verifyVendor(repo,vendor,pin){
 const output=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim()
 assertVendorPin(output(vendor,['rev-parse','HEAD']),output(repo,['rev-parse','HEAD:vendor/stack-chan']),
  output(vendor,['status','--porcelain=v1','--untracked-files=all']),pin)
}
// Build from the already verified checkout; never attest leftover build/bin outputs.
export async function rebuildModdableTools(root,run=execFileSync){
 await rm(path.join(root,'build/bin/mac/release'),{recursive:true,force:true})
 await rm(path.join(root,'build/tmp/mac/release'),{recursive:true,force:true})
 const cwd=path.join(root,'build/makefiles/mac')
 const env={...process.env,MODDABLE:root,XS_DIR:path.join(root,'xs'),BUILD_DIR:path.join(root,'build')}
 for(const file of ['xs/makefiles/mac/xsc.mk','xs/makefiles/mac/xsid.mk','xs/makefiles/mac/xsl.mk','build/makefiles/mac/tools.mk'])
  run('/usr/bin/make',['GOAL=release','-f',path.join(root,file)],{cwd,env,stdio:'inherit'})
}

// Ignored build outputs remain allowed; untracked source/build inputs do not.
export function verifyCleanSource(root,label){
 const status=execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:root,encoding:'utf8'}).trim()
 if(status)throw Error(`${label} source has tracked or untracked changes`)
}

export function verifyPinnedSource(root,label,pin){
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
 if(head!==pin)throw Error(`${label} source commit mismatch`)
 verifyCleanSource(root,label)
}
export async function rebuildVerifiedSource(root,label,pin,rebuild){
 verifyPinnedSource(root,label,pin)
 await rebuild(root)
 verifyPinnedSource(root,label,pin)
}

export async function verifyInstalledCompiler(root,pin,expectedTree){
 verifyPinnedSource(root,'emsdk',pin)
 if(await installedTreeSha256(path.join(root,'upstream'))!==expectedTree)
  throw Error('installed Emscripten tree changed during WASM build')
}
export async function buildWithVerifiedCompiler(root,pin,expectedTree,build){
 await verifyInstalledCompiler(root,pin,expectedTree)
 await build()
 await verifyInstalledCompiler(root,pin,expectedTree)
}
