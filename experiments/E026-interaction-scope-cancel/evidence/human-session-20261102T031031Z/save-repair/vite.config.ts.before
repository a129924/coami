import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendFile, mkdir } from 'node:fs/promises'
import { defineConfig, type Plugin } from 'vite'
const web = fileURLToPath(new URL('.', import.meta.url)), repo = path.resolve(web, '../../..')
const evidence: Plugin = { name: 'e026-local-evidence', configureServer(server) {
  server.middlewares.use('/__e026/save', async (req, res) => {
    if (req.method !== 'POST' || req.headers.origin !== `http://${req.headers.host}`) { res.statusCode = 403; res.end('Same-origin POST only'); return }
    try {
      let body = ''
      for await (const chunk of req) { body += String(chunk); if (body.length > 2_000_000) throw Error('Evidence too large') }
      const value: unknown = JSON.parse(body)
      if (!value || typeof value !== 'object' || !('caseId' in value) || !('records' in value)) throw Error('Invalid evidence')
      const dir = path.resolve(web, '../evidence/round-1'); await mkdir(dir, { recursive: true })
      await appendFile(path.join(dir, 'browser-runs.jsonl'), JSON.stringify(value) + '\n')
      res.setHeader('Content-Type', 'application/json'); res.end('{"saved":true}')
    } catch (error) { res.statusCode = 400; res.end(String(error)) }
  })
} }
export default defineConfig({ plugins: [evidence], publicDir: path.join(web, 'generated/public'), optimizeDeps: { entries: ['index.html'] },
  resolve: { alias: [{ find: /^three\/addons\/(.*)$/, replacement: path.join(web, 'node_modules/three/examples/jsm/$1') }, { find: /^three$/, replacement: path.join(web, 'node_modules/three/build/three.module.js') }] },
  server: { host: '127.0.0.1', port: 5178, strictPort: true, fs: { allow: [repo] }, proxy: { '/ws': { target: 'ws://127.0.0.1:8766', ws: true }, '/fixture': 'http://127.0.0.1:8766' } },
})
