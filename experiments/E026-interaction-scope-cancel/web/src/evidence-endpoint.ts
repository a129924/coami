import type { IncomingMessage, ServerResponse } from 'node:http'
import type { EvidenceStore } from './evidence-store.ts'
export function evidenceEndpoint(store: EvidenceStore): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    if (req.method !== 'POST' || req.headers.origin !== `http://${req.headers.host}`) { res.statusCode = 403; res.end('Same-origin POST only'); return }
    try {
      // Streaming UTF-8 decoding preserves characters split between network chunks.
      req.setEncoding('utf8')
      let body = '', tooLarge = false
      for await (const chunk of req) {
        if (tooLarge) continue
        const text = String(chunk)
        if (body.length + text.length > 2_000_000) { tooLarge = true; body = ''; continue }
        body += text
      }
      if (tooLarge) throw Error('Evidence too large')
      const receipt = await store.append(JSON.parse(body) as unknown)
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(receipt))
    } catch (error) { res.statusCode = 400; res.end(String(error)) }
  }
}
