import { createHostAudioInBridge, createHostAudioOutBridge } from '../../../../vendor/stack-chan/web/simulator/bridge.mjs'
import type { Playback } from './overlap.ts'

export type AudioEvent = { kind: 'capture-start' | 'capture-stop' | 'capture-ended' | 'capture-bytes' | 'playback-running' | 'playback-ended' | 'audio-issue'; at: number; token: string | null; sourceId?: string; bytes?: number; playback?: Playback; reason?: string }
type Input = { record(duration?: number): Promise<ArrayBuffer> }
type Output = { tone(options?: unknown): Promise<void>; play(buffer: ArrayBuffer): Promise<boolean>; close(): void }

// The pinned factories retain their return values, fallback and error semantics.
// Dependencies only observe lifecycle; they never consult recording to allow playback or vice versa.
export class ObservedAudio {
  readonly context: AudioContext
  readonly input: Input
  readonly output: Output
  private outputToken: string | null = null
  private inputToken: string | null = null
  private serial = 0
  private readonly tracks = new Set<MediaStreamTrack>()
  private readonly sources = new Set<{ interrupted: boolean }>()
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(token: (op: 'record' | 'output') => string | null, emit: (event: AudioEvent) => void) {
    this.context = new AudioContext()
    const context = this.context, owner = this
    const publish = (event: Omit<AudioEvent, 'at'>) => emit({ ...event, at: performance.now() })
    class ObservedRecorder extends MediaRecorder {
      private readonly token: string | null
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        super(stream, options)
        this.token = owner.inputToken
        for (const track of stream.getTracks()) {
          owner.tracks.add(track)
          track.addEventListener('ended', () => {
            if (this.state !== 'inactive') publish({ kind: 'audio-issue', token: this.token, reason: 'Microphone track ended while recording' })
          })
        }
        this.addEventListener('start', () => publish({ kind: 'capture-start', token: this.token }))
        this.addEventListener('stop', () => publish({ kind: 'capture-ended', token: this.token }))
        this.addEventListener('error', () => publish({ kind: 'audio-issue', token: this.token, reason: 'MediaRecorder error' }))
      }
      override stop(): void {
        // Conservative end bound: stop call, earlier than the asynchronously delivered stop event.
        publish({ kind: 'capture-stop', token: this.token })
        super.stop()
      }
    }
    const create = context.createBufferSource.bind(context)
    context.createBufferSource = () => {
      const source = create(), sourceToken = owner.outputToken, sourceId = `source-${++owner.serial}`
      const state = { interrupted: false }; owner.sources.add(state)
      const originalStart = source.start.bind(source), originalStop = source.stop.bind(source)
      let stopped = false, ended = false, start = -1, lastActive = -1, firstClock = -1, lastClock = -1, scheduled = -1
      const poll = () => {
        if (ended) return
        const now = performance.now(), clock = context.currentTime
        const duration = source.buffer?.duration ?? 0
        if (context.state === 'running' && clock > scheduled && clock < scheduled + duration && clock > lastClock) {
          if (start < 0) { start = now; firstClock = clock; publish({ kind: 'playback-running', token: sourceToken, sourceId }) }
          lastActive = now; lastClock = clock
        }
        const timer = setTimeout(() => { owner.timers.delete(timer); poll() }, 10)
        owner.timers.add(timer)
      }
      source.start = (...args: Parameters<AudioBufferSourceNode['start']>) => {
        originalStart(...args)
        scheduled = Math.max(context.currentTime, args[0] ?? 0)
        if ((args[1] ?? 0) !== 0 || args[2] !== undefined || source.loop) {
          publish({ kind: 'audio-issue', token: sourceToken, reason: 'Unexpected offset/duration/loop outside stock play contract' })
        }
        // A start() call alone is not proof: wait for an advancing AudioContext inside the buffer interval.
        poll()
      }
      source.stop = (...args: Parameters<AudioBufferSourceNode['stop']>) => { stopped = true; originalStop(...args) }
      source.addEventListener('ended', () => {
        ended = true; owner.sources.delete(state)
        const playback: Playback = { token: sourceToken ?? 'unattributed', sourceId, start, end: lastActive,
          natural: !stopped, clockAdvanced: lastClock > firstClock && context.currentTime > firstClock,
          interrupted: state.interrupted || context.state !== 'running' }
        publish({ kind: 'playback-ended', token: sourceToken, sourceId, playback })
      })
      return source
    }
    context.addEventListener('statechange', () => {
      if (context.state !== 'running') for (const source of owner.sources) source.interrupted = true
    })
    const rawIn = createHostAudioInBridge({ MediaRecorder: ObservedRecorder }) as unknown as Input
    const rawOut = createHostAudioOutBridge({ createAudioContext: () => context }) as unknown as Output
    this.input = { record: async duration => {
      const captured = token('record'); this.inputToken = captured
      try { const buffer = await rawIn.record(duration); publish({ kind: 'capture-bytes', token: captured, bytes: buffer.byteLength }); return buffer }
      finally { if (this.inputToken === captured) this.inputToken = null }
    } }
    this.output = { tone: options => rawOut.tone(options), close: () => rawOut.close(), play: async buffer => {
      const captured = token('output'); this.outputToken = captured
      try { return await rawOut.play(buffer) }
      finally { if (this.outputToken === captured) this.outputToken = null }
    } }
  }
  unlock(): Promise<void> { return this.context.resume() }
  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer)
    for (const track of this.tracks) track.stop()
    if (this.context.state !== 'closed') void this.context.close().catch(() => {})
  }
}
