import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EvidenceStore } from './src/evidence-store.ts'
import { evidenceEndpoint } from './src/evidence-endpoint.ts'
import { defineConfig, type Plugin } from 'vite'
const web = fileURLToPath(new URL('.', import.meta.url)), repo = path.resolve(web, '../../..')
const store = new EvidenceStore(path.resolve(web, '../evidence/round-1/browser-runs.jsonl'))
const evidence: Plugin = { name: 'e026-local-evidence', configureServer(server) {
  server.middlewares.use('/__e026/save', evidenceEndpoint(store))
} }
export default defineConfig({ plugins: [evidence], publicDir: path.join(web, 'generated/public'), optimizeDeps: { entries: ['index.html'] },
  resolve: { alias: [{ find: /^three\/addons\/(.*)$/, replacement: path.join(web, 'node_modules/three/examples/jsm/$1') }, { find: /^three$/, replacement: path.join(web, 'node_modules/three/build/three.module.js') }] },
  server: { host: '127.0.0.1', port: 5178, strictPort: true, fs: { allow: [repo] }, proxy: { '/ws': { target: 'ws://127.0.0.1:8766', ws: true }, '/fixture': 'http://127.0.0.1:8766' } },
})
