import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { createContext, runInContext } from 'node:vm'
import { TopSwipeInput } from './input.ts'

type Handler = (event: { persisted?: boolean }) => void
type Bridge = TopSwipeInput
type Options = { topTouchBridge: Bridge; onTrace(message: string): void }
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
async function flush() { for (let i = 0; i < 100; i++) await Promise.resolve() }
function page() {
  const listeners = new Map<string, Handler>()
  const elements = new Map<string, { textContent: string; disabled: boolean; dataset: Record<string,string>; children: unknown[]; addEventListener(): void; prepend(value: unknown): void; replaceChildren(): void }>()
  const element = (id: string) => {
    let value = elements.get(id)
    if (!value) {
      value = { textContent: '', disabled: false, dataset: {}, children: [], addEventListener() {}, prepend(item) { this.children.unshift(item) }, replaceChildren() { this.children = [] } }
      elements.set(id, value)
    }
    return value
  }
  const timers = new Map<number, () => void>()
  let sequence = 0
  let hangingFetch = false
  const fetchGate = deferred()
  let startGate: ReturnType<typeof deferred> | undefined
  const engines: { disposed: boolean; options: Options }[] = []
  class Engine {
    disposed = false
    readonly options: Options
    constructor(options: Options) { this.options = options; engines.push(this) }
    async start() {
      if (startGate) await startGate.promise
      this.options.onTrace('COAMI17|{"kind":"ready"}')
      const tuple = this.options.topTouchBridge.take()
      this.options.topTouchBridge.consumed(tuple.meta.session, tuple.meta.sampleId)
    }
    dispose() { this.disposed = true }
  }
  const context = createContext({ TopSwipeInput, SimulatorEngine: Engine, AbortController, URL, Uint8Array,
    performance: { now: () => 1 }, queueMicrotask,
    crypto: { subtle: { digest: async () => new Uint8Array([0]).buffer } },
    fetch: async (url: string) => {
      if (hangingFetch) await fetchGate.promise // Deliberately ignores abort to test stale completions.
      return { ok: true, json: async () => ({ sourceCommit: 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322', patchSha256: 'patch', sha256: { 'mc.js': '00', 'mc.wasm': '00' }, mod: { sha256: '00' } }), arrayBuffer: async () => new Uint8Array([0]).buffer }
    },
    setTimeout: (fn: () => void) => { timers.set(++sequence, fn); return sequence }, clearTimeout: (id: number) => timers.delete(id),
    document: { getElementById: element, createElement: () => ({ textContent: '' }), addEventListener() {} },
    window: { addEventListener: (name: string, handler: Handler) => listeners.set(name, handler) },
    location: { href: 'http://127.0.0.1:5187/' },
  })
  const source = readFileSync(new URL('./main.ts', import.meta.url), 'utf8').replace(/^import .*\n/gm, '')
  runInContext(stripTypeScriptTypes(source) + '\nglobalThis.restartSession = start;', context)
  return { element, engines, listeners, flush, timers, restart: () => (context.restartSession as () => Promise<void>)(),
    hangFetch: () => { hangingFetch = true }, allowFetch: () => { hangingFetch = false }, releaseFetch: () => { hangingFetch = false; fetchGate.resolve() },
    hangStart: () => { startGate = deferred(); return startGate }, allowStart: () => { startGate = undefined } }
}

test('persisted pageshow creates a fresh usable session after pagehide disposed the engine', async () => {
  const p = page(); await p.flush()
  assert.equal(p.element('state').textContent, 'ready')
  p.listeners.get('pagehide')!({ persisted: true })
  assert.equal(p.engines[0]!.disposed, true)
  p.listeners.get('pageshow')?.({ persisted: true }); await p.flush()
  assert.equal(p.engines.length, 2)
  assert.equal(p.element('state').textContent, 'ready')
  assert.notEqual(p.engines[0]!.options.topTouchBridge.session, p.engines[1]!.options.topTouchBridge.session)
  const bridge = p.engines[1]!.options.topTouchBridge
  assert.equal(bridge.begin(1, -100), true)
  bridge.move(1, 100); bridge.end(1)
  while (bridge.pending) { const tuple = bridge.take(); bridge.consumed(tuple.meta.session, tuple.meta.sampleId) }
  assert.equal(bridge.state, 'ready')
})
for (const stage of ['fetch', 'start'] as const) {
  test(`timeout releases restart and ignores a late ${stage} completion`, async () => {
    const p = page(); await p.flush()
    const oldStart = stage === 'start' ? p.hangStart() : undefined
    if (stage === 'fetch') p.hangFetch()
    const old = p.restart(); await p.flush()
    for (const fn of [...p.timers.values()]) fn()
    assert.equal(p.element('state').textContent, 'error')
    assert.equal(p.element('restart').disabled, false)
    if (stage === 'start') assert.equal(p.engines.at(-1)!.disposed, true)
    if (stage === 'fetch') p.allowFetch(); else p.allowStart()
    await p.restart(); await p.flush()
    const current = p.engines.at(-1)!
    if (stage === 'fetch') p.releaseFetch(); else oldStart!.resolve()
    await old; await p.flush()
    assert.equal(p.engines.at(-1), current)
    assert.equal(current.disposed, false)
    assert.equal(p.element('state').textContent, 'ready')
  })
}
test('restart removes previous displayed provenance before new verification settles', async () => {
  const p = page(); await p.flush()
  assert.match(p.element('provenance').textContent, /sourceCommit/)
  p.hangFetch()
  const pending = p.restart()
  assert.doesNotMatch(p.element('provenance').textContent, /sourceCommit/)
  p.releaseFetch(); await pending
})
