import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'
const web = fileURLToPath(new URL('.', import.meta.url))
export default defineConfig({
  optimizeDeps: { entries:['index.html'] },
  resolve: { alias:[
    {find:/^three\/addons\/(.*)$/,replacement:path.join(web,'node_modules/three/examples/jsm/$1')},
    {find:/^three$/,replacement:path.join(web,'node_modules/three/build/three.module.js')},
  ] },
  server: {host:'127.0.0.1',port:5198,strictPort:true,fs:{allow:[path.resolve(web,'../../..')]}},
})
