import {execFileSync} from 'node:child_process'
import {mkdir,rm} from 'node:fs/promises'
import path from 'node:path'
import {verifyVendor} from './build-safety.mjs'
export async function stagePinnedVendor(repo,vendor,pin,destination,{afterStage=()=>{}}={}){
 verifyVendor(repo,vendor,pin)
 await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true})
 const archive=destination+'.tar'
 try{
  execFileSync('git',['archive','--format=tar','--output',path.resolve(archive),pin],{cwd:vendor,stdio:'pipe'})
  execFileSync('/usr/bin/tar',['-xf',path.resolve(archive),'-C',path.resolve(destination)],{stdio:'pipe'})
  await afterStage()
  verifyVendor(repo,vendor,pin)
 }finally{await rm(archive,{force:true})}
}
