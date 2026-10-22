import { createHostAudioInBridge, createHostAudioOutBridge } from '../../../../vendor/stack-chan/web/simulator/bridge.mjs'
import type { Identity } from './state.ts'
import type { AudioEvent } from './adapter.ts'
type Input = { record(duration?: number): Promise<ArrayBuffer> }
type Output = { play(buffer: ArrayBuffer): Promise<boolean> }
export type AudioDependencies = { context: AudioContext; recorder: typeof MediaRecorder; mediaDevices: MediaDevices }
export class ObservedAudio {
  readonly context: AudioContext
  readonly input: Input
  readonly output: Output & { tone(): Promise<void>; close(): void }
  private serial = 0
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private tracks = new Set<MediaStreamTrack>()
  private active = new Set<{ interrupted: boolean }>()
  private emit: (event: AudioEvent) => void
  constructor(token: (kind: 'record' | 'output') => Identity | null, emit: (event: AudioEvent) => void,
    captured: (identity: Identity | null, buffer: ArrayBuffer) => void, dependencies?: AudioDependencies) {
    const context = dependencies?.context ?? new AudioContext()
    const Recorder = dependencies?.recorder ?? MediaRecorder
    const mediaDevices = dependencies?.mediaDevices ?? navigator.mediaDevices
    this.context = context
    this.emit = emit
    const owner = this
    context.addEventListener('statechange', () => {
      if (context.state !== 'running') for (const state of owner.active) state.interrupted = true
    })
    this.input = { record: async duration => {
      // Frozen before getUserMedia; no mutable current-token read after awaits.
      const identity = token('record')
      class CorrelatedRecorder extends Recorder {
        constructor(stream: MediaStream, options?: MediaRecorderOptions) {
          super(stream, options)
          for (const track of stream.getTracks()) {
            owner.tracks.add(track)
            track.addEventListener('ended', () => {
              if (this.state !== 'inactive') emit({ kind: 'audio-issue', resource: 'microphone', token: identity, reason: 'Microphone track interrupted' })
            })
          }
          this.addEventListener('start', () => emit({ kind: 'capture-start', token: identity }))
          this.addEventListener('stop', () => emit({ kind: 'capture-ended', token: identity }))
          this.addEventListener('error', () => emit({ kind: 'audio-issue', resource: 'microphone', token: identity, reason: 'MediaRecorder error' }))
        }
        override stop(): void { emit({ kind: 'capture-stop', token: identity }); super.stop() }
      }
      const raw = createHostAudioInBridge({ mediaDevices, MediaRecorder: CorrelatedRecorder }) as unknown as Input
      try {
        const buffer = await raw.record(duration)
        captured(identity, buffer)
        emit({ kind: 'capture-bytes', token: identity, bytes: buffer.byteLength })
        return buffer
      } catch (error) { emit({ kind: 'audio-issue', resource: 'microphone', token: identity, reason: String(error) }); throw error }
    } }
    this.output = {
      play: buffer => this.play(buffer, token('output')),
      tone: async () => {
        emit({ kind: 'audio-issue', resource: 'output', token: null, reason: 'Tone outside E028 scope' })
        throw Error('Tone unsupported by E028 adapter')
      },
      close: () => this.dispose(),
    }
  }
  async play(buffer: ArrayBuffer, token: Identity | null): Promise<boolean> {
    const context = this.context, owner = this
    // Per-call proxy binds source construction to this token even after decoding.
    const proxy = new Proxy(context, { get(target, property) {
      if (property === 'createBufferSource') return () => owner.source(token)
      const value: unknown = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    } })
    const raw = createHostAudioOutBridge({ createAudioContext: () => proxy }) as unknown as Output
    try { return await raw.play(buffer) }
    catch (error) { this.emit({ kind: 'audio-issue', resource: 'output', token, reason: String(error) }); throw error }
  }
  private source(token: Identity | null): AudioBufferSourceNode {
    const context = this.context, source = context.createBufferSource()
    const sourceId = `source-${++this.serial}`, state = { interrupted: false }
    this.active.add(state)
    this.emit({ kind: 'source-scheduled', token, sourceId })
    const start = source.start.bind(source), stop = source.stop.bind(source)
    let stopped = false, ended = false, scheduled = -1, firstClock = -1, lastClock = -1
    const poll = (): void => {
      if (ended) return
      const clock = context.currentTime, duration = source.buffer?.duration ?? 0
      if (context.state === 'running' && clock > scheduled && clock < scheduled + duration && clock > lastClock) {
        if (firstClock < 0) { firstClock = clock; this.emit({ kind: 'playback-running', token, sourceId }) }
        lastClock = clock
      }
      const timer = setTimeout(() => { this.timers.delete(timer); poll() }, 10)
      this.timers.add(timer)
    }
    source.start = (...args: Parameters<AudioBufferSourceNode['start']>) => {
      start(...args)
      scheduled = Math.max(context.currentTime, args[0] ?? 0)
      if ((args[1] ?? 0) !== 0 || args[2] !== undefined || source.loop) {
        state.interrupted = true
        this.emit({ kind: 'audio-issue', resource: 'output', token, reason: 'Unexpected source offset/duration/loop' })
      }
      poll()
    }
    source.stop = (...args: Parameters<AudioBufferSourceNode['stop']>) => { stopped = true; stop(...args) }
    source.addEventListener('ended', () => {
      ended = true
      this.active.delete(state)
      this.emit({ kind: 'playback-ended', token, sourceId, natural: !stopped,
        clockAdvanced: firstClock >= 0 && lastClock > firstClock && context.currentTime > firstClock,
        interrupted: state.interrupted || context.state !== 'running' })
    })
    return source
  }
  unlock(): Promise<void> { return this.context.resume() }
  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer)
    for (const track of this.tracks) track.stop()
    if (this.context.state !== 'closed') void this.context.close().catch(() => {})
  }
}
