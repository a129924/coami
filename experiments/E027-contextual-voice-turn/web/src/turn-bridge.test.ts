import { expect, it, vi } from 'vitest'
import { TurnSession } from './turn-session.ts'
import { TurnBridge, sha256 } from './turn-bridge.ts'
import { BrowserRuntime } from './browser-runtime.ts'
vi.mock('../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs', () => ({
  SimulatorEngine: class {
    hostBridge = {}
    audioOutBridge = {async tone() {}, close() {}}
    constructor(private readonly options: {
      onTrace(message: string): void
      onReady(value: {installationStatus: string}): void
    }) {}
    async start() {
      // Pinned Emscripten print/onTrace supplies complete lines without a newline.
      this.options.onTrace('[main] app context created')
      this.options.onTrace('COAMI27|{"kind":"ready"}')
      this.options.onReady({installationStatus: 'prepared'})
    }
    dispose() {}
  },
}))
it('becomes ready from pinned SDK trace callbacks without trailing newlines', async () => {
  const bytes = new Uint8Array([1, 2]).buffer
  const hash = await sha256(bytes)
  vi.stubGlobal('AudioContext', class {
    state = 'running'
    async resume() {}
    async close() {}
  })
  vi.stubGlobal('location', {href: 'http://127.0.0.1:5173/'})
  vi.stubGlobal('fetch', async (path: string) => path === '/runtime-provenance.json'
    ? Response.json({experiment:'E027', sourceCommit:'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322',
      sha256:{'mc.js':hash, 'mc.wasm':hash}, mod:{sha256:hash}, patchHashes:{}})
    : new Response(bytes))
  const evidence: Record<string, unknown>[] = []
  const runtime = new BrowserRuntime(event => evidence.push(event), () => {})
  try {
    // Mock engine does not inspect either canvas; no browser or provider I/O.
    await runtime.open({} as HTMLCanvasElement, {} as HTMLCanvasElement)
    expect(evidence).toContainEqual({kind:'mod-trace', record:{kind:'ready'}})
    expect(runtime.ready).toBe(true)
  } finally {
    runtime.close()
    vi.unstubAllGlobals()
  }
})
it('rejects changed record bytes before any upload', async () => {
  const session = new TurnSession('test'); const token = session.begin('clear')
  let calls = 0
  const bridge = new TurnBridge(session, () => { calls++; throw Error('must not upload') }, () => {})
  await bridge.capture(token, new Uint8Array([1,2]).buffer, 'audio/webm', 'speak.webm')
  await expect(bridge.exchange(new Uint8Array([1,3]).buffer, 'clear')).rejects.toThrow(/record/)
  expect(calls).toBe(0)
})
it('rejects a response after its token expires', async () => {
  const session = new TurnSession('test'); const token = session.begin('A')
  const bridge = new TurnBridge(session, async () => {
    session.timeout(token)
    return { ...token, audio_mime: 'audio/wav', audio_base64: 'UklGRgAAAA' }
  }, () => {})
  await expect(bridge.checkTts('A')).rejects.toThrow(/stale/)
})
