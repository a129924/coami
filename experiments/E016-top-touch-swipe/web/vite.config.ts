import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'
const root=fileURLToPath(new URL('.',import.meta.url))
export default defineConfig({publicDir:path.join(root,'generated/public'),optimizeDeps:{entries:['index.html']},resolve:{alias:[
  {find:/^three\/addons\/(.*)$/,replacement:path.join(root,'node_modules/three/examples/jsm/$1')},
  {find:/^three$/,replacement:path.join(root,'node_modules/three/build/three.module.js')}
]},server:{strictPort:true,port:5176,fs:{allow:[path.resolve(root,'../../..')]}}})
