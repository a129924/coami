import {controlledNodeEnvironment,assertNoProjectNpmConfig} from './node-environment.mjs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFile,mkdir} from 'node:fs/promises'
import path from 'node:path'
import {installedTreeSha256} from './installed-tree.mjs'
export const INSTALL_ARGS=['ci','--ignore-scripts','--no-audit','--no-fund']
export async function installDependencies(web,run=execFileSync){
 const lockSha256=createHash('sha256').update(await readFile(path.join(web,'package-lock.json'))).digest('hex')
 run('npm',INSTALL_ARGS,{cwd:web,env:controlledNodeEnvironment(web),stdio:'inherit',timeout:60000})
 assertNoProjectNpmConfig(web)
 // Vite creates this empty scratch directory and removes its temporary config file.
 await mkdir(path.join(web,'node_modules/.vite-temp'),{recursive:true})
 return {command:['npm',...INSTALL_ARGS],preparedEmptyDirectories:['.vite-temp'],lockSha256,installedTreeSha256:await installedTreeSha256(path.join(web,'node_modules'))}
}
export async function verifyDependencies(web,attestation){
 assertNoProjectNpmConfig(web)
 const lockSha256=createHash('sha256').update(await readFile(path.join(web,'package-lock.json'))).digest('hex')
 if(lockSha256!==attestation.lockSha256 || await installedTreeSha256(path.join(web,'node_modules'))!==attestation.installedTreeSha256)
  throw Error('installed dependencies changed after clean install')
}
