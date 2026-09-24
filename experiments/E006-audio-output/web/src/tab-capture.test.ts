import assert from 'node:assert/strict'
import test from 'node:test'

import { startTabCapture } from './tab-capture.ts'

test('asynchronous recorder failure stops capture tracks and notifies the page', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const originalRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder')
  const stopped: string[] = []
  const failures: string[] = []
  const audioTrack = { stop: () => { stopped.push('audio') } } as MediaStreamTrack
  const videoTrack = { stop: () => { stopped.push('video') } } as MediaStreamTrack
  const stream = {
    getAudioTracks: () => [audioTrack],
    getTracks: () => [audioTrack, videoTrack],
  } as MediaStream
  const state: { recorder?: FakeRecorder } = {}

  class FakeRecorder {
    static isTypeSupported(): boolean { return true }
    ondataavailable: ((event: BlobEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    onstop: ((event: Event) => void) | null = null
    state: RecordingState = 'inactive'

    constructor() { state.recorder = this }
    start(): void { this.state = 'recording' }
    stop(): void { this.state = 'inactive'; this.onstop?.(new Event('stop')) }
    fail(): void { this.state = 'inactive'; this.onerror?.(new Event('error')) }
  }

  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getDisplayMedia: async () => stream } },
    })
    Object.defineProperty(globalThis, 'MediaRecorder', {
      configurable: true,
      value: FakeRecorder,
    })

    const capture = await startTabCapture((error) => { failures.push(error.message) })
    assert.ok(state.recorder)
    state.recorder.fail()
    assert.deepEqual(stopped, ['audio', 'video'])
    assert.deepEqual(failures, ['WebM 錄製失敗'])
    await assert.rejects(capture.stopAndDownload(), /WebM 錄製失敗/)
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else Reflect.deleteProperty(globalThis, 'navigator')
    if (originalRecorder) Object.defineProperty(globalThis, 'MediaRecorder', originalRecorder)
    else Reflect.deleteProperty(globalThis, 'MediaRecorder')
  }
})
