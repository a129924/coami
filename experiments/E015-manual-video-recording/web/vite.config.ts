import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'

const webRoot = fileURLToPath(new URL('.', import.meta.url))
const repositoryRoot = path.resolve(webRoot, '../../..')

export default defineConfig({
  publicDir: path.join(webRoot, 'generated/public'),
  resolve: { alias: [
    { find: /^three\/addons\/(.*)$/, replacement: path.join(webRoot, 'node_modules/three/examples/jsm/$1') },
    { find: /^three$/, replacement: path.join(webRoot, 'node_modules/three/build/three.module.js') },
  ] },
  server: { host: '127.0.0.1', strictPort: true, fs: { allow: [repositoryRoot] } },
})
