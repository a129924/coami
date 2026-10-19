import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { defineConfig, type Plugin } from 'vite'
const webRoot = fileURLToPath(new URL('.', import.meta.url)), repositoryRoot = path.resolve(webRoot, '../../..')
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown, max = 500): string => typeof v === 'string' ? v.slice(0, max) : ''
const safeValue = (v: unknown): string | number | boolean | null => typeof v === 'string' ? v.slice(0, 1000) : typeof v === 'number' && Number.isFinite(v) || typeof v === 'boolean' ? v as number | boolean : null
const fields = ['id','recordBytes','sessionId','at','utc','kind','caseId','mode','op','token','sourceId','bytes','reason','seq','start','end','natural','clockAdvanced','interrupted','success','text','url','sha256','tts','recording','note','status','overlapMs']
function metadataOnly(v: unknown): Record<string, unknown> {
  if (!object(v)) return {}
  const out: Record<string, unknown> = {}
  for (const key of fields) if (key in v) out[key] = safeValue(v[key])
  // Only these bounded lifecycle records are allowed; never write arbitrary objects or audio buffers.
  for (const key of ['playback','record','result']) if (key in v) out[key] = metadataOnly(v[key])
  return out
}
const evidence: Plugin = { name: 'e025-local-metadata', configureServer(server) {
  server.middlewares.use('/__e025/save', async (req, res) => {
    if (req.method !== 'POST' || !req.headers.origin?.match(/^http:\/\/127\.0\.0\.1:\d+$/)) { res.statusCode = 405; res.end('Local same-origin POST required'); return }
    const origin = new URL(req.headers.origin)
    if (origin.host !== req.headers.host) { res.statusCode = 403; res.end('Origin mismatch'); return }
    try {
      let body = ''
      for await (const chunk of req) { body += String(chunk); if (body.length > 512_000) throw Error('Metadata too large') }
      const value: unknown = JSON.parse(body)
      if (!object(value) || value.version !== 1 || !text(value.tester, 80) || !Array.isArray(value.runs) || !Array.isArray(value.events) || value.runs.length > 20 || value.events.length > 5000) throw Error('Invalid metadata')
      const runs = value.runs.map(metadataOnly), events = value.events.map(metadataOnly)
      const date = new Date().toISOString(), directory = path.resolve(webRoot, '../evidence')
      await mkdir(directory, { recursive: true })
      await writeFile(path.join(directory, 'trace.jsonl'), events.map(e => JSON.stringify(e)).join('\n')+'\n')
      const report = '# E025 真人判定\n\n'+`- 實際保存時間：${date}\n- Tester：${text(value.tester,80)}\n- Browser：${text(value.browser,240)}\n- 設備／音量：${text(value.equipment,160)}\n- Session：${text(value.sessionId,80)}\n\n`+'真人欄位是操作者自行填寫，程式 interval 與真人聽辨分開；不包含原始音訊。\n\n```json\n'+JSON.stringify(runs,null,2)+'\n```\n'
      await writeFile(path.join(directory, 'human-run.md'), report)
      res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ saved: true, runs: runs.length }))
    } catch (error) { res.statusCode = 400; res.end(String(error)) }
  })
} }
export default defineConfig({ plugins: [evidence], optimizeDeps: { entries: ['index.html'] }, publicDir: path.join(webRoot,'generated/public'),
  resolve: { alias: [ { find: /^three\/addons\/(.*)$/, replacement: path.join(webRoot,'node_modules/three/examples/jsm/$1') }, { find: /^three$/, replacement: path.join(webRoot,'node_modules/three/build/three.module.js') } ] },
  server: { host: '127.0.0.1', strictPort: true, fs: { allow: [repositoryRoot] } },
})
