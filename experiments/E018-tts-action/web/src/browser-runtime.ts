import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { StrictAudioBridge, browserAudioPort } from './strict-audio-bridge.ts'
import { parseModTrace, type TtsSession } from './tts-session.ts'

const PIN = 'b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
type Evidence = (event: Record<string, unknown>) => void
type Elements = { viewport: HTMLCanvasElement; screen: HTMLCanvasElement }
type Engine = { start(): Promise<void>; pushButton(button: 'a' | 'c'): void; dispose(): void;
  audioOutBridge: { tone(options?: unknown): Promise<void>; close(): void };
  hostBridge: { AudioOut: unknown } }

export class BrowserRuntime {
  private engine: Engine | null = null
  private bridge: StrictAudioBridge | null = null
  private closed = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly abort = new AbortController()

  async open(elements: Elements, session: TtsSession, evidence: Evidence): Promise<void> {
    // Construct/resume synchronously from the operator's click, before network awaits.
    const context = new AudioContext()
    const bridge = new StrictAudioBridge(browserAudioPort(context), () => session.playbackToken(), event => {
      evidence({ kind: 'bridge', ...event })
      session.playback(event.token, event.phase, event.reason)
    })
    this.bridge = bridge
    let installed = false, modReady = false
    const ready = () => {
      if (this.closed || !installed || !modReady) return
      clearTimeout(this.timer); session.ready()
    }
    const fatal = (error: unknown) => {
      if (this.closed) return
      clearTimeout(this.timer)
      evidence({ kind: 'runtime-error', reason: String(error) })
      session.fatal(String(error))
    }
    this.timer = setTimeout(() => fatal('30 秒內 simulator／MOD 未就緒；請重新載入'), 30_000)
    try {
      await bridge.unlock()
      const bytes = await verifyRuntime(this.abort.signal, evidence)
      if (this.closed) return
      const mod = { name: 'coami-mod.xsa', bytes, size: bytes.length, storage: 'memory' as const }
      const engine = new SimulatorEngine({ ...elements,
        runtimeBaseUrl: new URL('/simulator/', location.href).href,
        modStorage: { async loadInstalledMod() { return mod }, async clearInstalledMod() {},
          async saveInstalledMod(next: { name: string; bytes: Uint8Array }) { return { ...next, size: next.bytes.length, storage: 'memory' as const } } },
        onReady: ({ installationStatus }: { installationStatus: string }) => {
          if (installationStatus !== 'prepared' && installationStatus !== 'installed') {
            fatal(`MOD installation: ${installationStatus}`); return
          }
          installed = true; evidence({ kind: 'installed', installationStatus }); ready()
        },
        onModStatus: (status: unknown) => evidence({ kind: 'mod-status', status }),
        onTrace: (message: string) => {
          if (this.closed) return
          let records: Record<string, unknown>[]
          try { records = parseModTrace(message) } catch (error) { fatal(error); return }
          for (const record of records) {
            // This closure belongs to one engine/session, not a shared mutable global.
            evidence({ kind: 'mod-trace', record })
            if (record.kind === 'ready') { modReady = true; ready() }
            else if (record.kind === 'started' && Number.isInteger(record.runSeq) && typeof record.text === 'string') {
              session.started(record.runSeq as number, record.text)
            } else if (record.kind === 'sdk' && Number.isInteger(record.runSeq) && typeof record.text === 'string'
              && typeof record.success === 'boolean') {
              const detail = record.success ? record.value : record.reason
              if (typeof detail !== 'string') { fatal('Invalid SDK result trace'); return }
              session.sdk(record.runSeq as number, record.text, record.success, detail)
            }
          }
        }, onError: fatal,
      }) as unknown as Engine
      const startupAudio = engine.audioOutBridge
      engine.audioOutBridge = {
        tone: options => startupAudio.tone(options),
        close: () => { bridge.close(); startupAudio.close() },
      }
      engine.hostBridge.AudioOut = { ...engine.audioOutBridge, play: (buffer: ArrayBuffer) => bridge.play(buffer) }
      this.engine = engine
      await engine.start()
    } catch (error) { fatal(error) }
  }
  dispatch(button: 'a' | 'c'): void {
    if (!this.engine || this.closed) throw Error('Simulator unavailable')
    this.engine.pushButton(button)
  }
  failNext(): void { this.bridge?.failNext() }
  close(): void {
    if (this.closed) return
    this.closed = true; clearTimeout(this.timer); this.abort.abort()
    this.engine?.dispose(); this.bridge?.close()
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
async function verifyRuntime(signal: AbortSignal, evidence: Evidence): Promise<Uint8Array> {
  const response = await fetch('/runtime-provenance.json', { signal, cache: 'no-store' })
  if (!response.ok) throw Error('缺少 pinned runtime；請執行 npm run prepare:poc')
  const provenance: unknown = await response.json()
  if (!isRecord(provenance) || provenance.sourceCommit !== PIN || !isRecord(provenance.sha256)
    || !isRecord(provenance.mod) || typeof provenance.mod.sha256 !== 'string') throw Error('Runtime provenance mismatch')
  evidence({ kind: 'provenance', provenance })
  let mod: Uint8Array | null = null
  for (const [url, expected] of [['/simulator/mc.js', provenance.sha256['mc.js']],
    ['/simulator/mc.wasm', provenance.sha256['mc.wasm']], ['/coami-mod.xsa', provenance.mod.sha256]] as const) {
    const asset = await fetch(url, { signal, cache: 'no-store' })
    if (!asset.ok) throw Error(`Missing ${url}`)
    const bytes = await asset.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    if (sha256 !== expected) throw Error(`${url} SHA-256 mismatch`)
    evidence({ kind: 'served-asset', url, bytes: bytes.byteLength, sha256 })
    if (url === '/coami-mod.xsa') mod = new Uint8Array(bytes)
  }
  if (!mod) throw Error('Missing MOD')
  return mod
}
