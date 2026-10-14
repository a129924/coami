import {replaceCache} from './build-safety.mjs'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, rm, rename, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root=new URL('../generated/',import.meta.url)
const archive=new URL('wasm-binaries-arm64.tar.xz',root)
// Download URL is pinned by emsdk 5.0.1's release mapping and mac arm64 manifest.
// https://storage.googleapis.com/webassembly/emscripten-releases-builds/mac/bf32ae8b61ac8efeb7eca01b54c8307f992724f7/wasm-binaries-arm64.tar.xz
const hash=createHash('sha256');for await(const chunk of createReadStream(archive)) hash.update(chunk)
if(hash.digest('hex')!=='76bcc261810a6facb482c6314711c7bb429ad52f7ed0af6285a278478aa27f21')throw Error('official compiler archive SHA-256 mismatch')
const staging=new URL('compiler-install/',root);await rm(staging,{recursive:true,force:true});await mkdir(staging,{recursive:true})
execFileSync('tar',['-xJf',fileURLToPath(archive),'-C',fileURLToPath(staging)],{stdio:'inherit'})
// Reproduce pinned emsdk.py:2178-2186 release installation metadata exactly.
await writeFile(new URL('install/emscripten/emscripten-version.txt',staging),'"5.0.1"\n')
await writeFile(new URL('install/.emsdk_version',staging),'releases-bf32ae8b61ac8efeb7eca01b54c8307f992724f7-64bit\n')
const destination=new URL('toolchain/emsdk/upstream/',root)
await rm(destination,{recursive:true,force:true});await rename(new URL('install/',staging),destination)
await replaceCache(new URL('emscripten/cache/',destination),new URL('em-cache/',root))
// emcc uses python -E, so PYTHONDONTWRITEBYTECODE alone cannot keep the verified tree pristine.
await writeFile(new URL('python-no-bytecode',root),'#!/bin/sh\nexec "$(dirname "$0")/toolchain/emsdk/python/3.13.3_64bit/bin/python3" -B "$@"\n',{mode:0o755})
console.log('Official compiler archive verified and installed; prepare-assets still enforces the fixed installed-tree digest.')
