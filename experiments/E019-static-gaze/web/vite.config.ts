import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'
import {verifyStagedHost} from './scripts/host-inputs.mjs'

const webRoot = fileURLToPath(new URL('.', import.meta.url))
const repositoryRoot = path.resolve(webRoot, '../../..')

export default defineConfig({
  plugins: [{name:'verify-staged-simulator-host',
    async buildStart(){await verifyStagedHost(path.join(webRoot,'generated/pinned-stack-chan/web'))},
    async configureServer(){await verifyStagedHost(path.join(webRoot,'generated/pinned-stack-chan/web'))},
    async handleHotUpdate(){await verifyStagedHost(path.join(webRoot,'generated/pinned-stack-chan/web'))},
  }],
  optimizeDeps: { entries: ['index.html'] },
  publicDir: path.join(webRoot, 'generated/public'),
  resolve: { alias: [
    { find: /^three\/addons\/(.*)$/, replacement: path.join(webRoot, 'node_modules/three/examples/jsm/$1') },
    { find: /^three$/, replacement: path.join(webRoot, 'node_modules/three/build/three.module.js') },
  ] },
  server: { host: '127.0.0.1', strictPort: true, fs: { allow: [repositoryRoot] } },
})
