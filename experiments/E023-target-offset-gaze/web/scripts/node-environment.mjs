import {mkdirSync,writeFileSync,lstatSync} from 'node:fs'
import path from 'node:path'
export function assertNoNodePreloads(){
 if(process.env.NODE_OPTIONS?.trim() || process.env.NODE_PATH?.trim() || process.execArgv.some(arg=>/^(?:-r|--(?:require|import|(?:experimental-)?loader)(?:=|$))/.test(arg)))
  throw Error('unrecorded Node startup inputs; restart without NODE_OPTIONS/NODE_PATH or preload flags')
}
export function assertNoProjectNpmConfig(web){
 try{lstatSync(path.join(web,'.npmrc'))}catch(error){if(error.code==='ENOENT')return;throw error}
 throw Error('project npm configuration is not allowed for attested builds')
}
export function controlledNodeEnvironment(web){
 assertNoNodePreloads()
 assertNoProjectNpmConfig(web)
 // All other inherited variables, including VITE_*, NODE_ENV and npm_config_*,
 // are deliberately absent. Disable user/global npm configuration as well.
 const config=path.join(path.resolve(web),'generated/npm-config')
 mkdirSync(config,{recursive:true})
 for(const name of ['user','global'])writeFileSync(path.join(config,name),'')
 const env={PATH:[path.dirname(process.execPath),'/opt/homebrew/bin','/usr/bin','/bin','/usr/sbin','/sbin'].join(path.delimiter),CI:'1',LANG:'C',npm_config_userconfig:path.join(config,'user'),npm_config_globalconfig:path.join(config,'global'),npm_config_cache:path.join(path.resolve(web),'generated/npm-cache')}
 for(const key of ['HOME','TMPDIR'])if(process.env[key])env[key]=process.env[key]
 return env
}
