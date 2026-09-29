import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createObservedCameraBridge, digestBytes } from './camera-observer.ts'

function fixture(options: { ready?: boolean; reject?: string; pixels?: Uint8ClampedArray } = {}) {
  const stopped: string[] = []
  const tracks = [{ readyState: 'live', stop() { this.readyState = 'ended'; stopped.push('stop') } }]
  const stream = { getTracks: () => tracks }
  const video = {
    readyState: options.ready === false ? 1 : 2,
    videoWidth: 2,
    videoHeight: 2,
    srcObject: null as object | null,
    async play() {},
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage() {},
      getImageData: () => ({ data: options.pixels ?? new Uint8ClampedArray([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
      ]) }),
    }),
  }
  const navigatorObj = { mediaDevices: { async getUserMedia() {
    if (options.reject) throw new DOMException('camera unavailable', options.reject)
    return stream
  } } }
  return { video, canvas, navigatorObj, stopped }
}

describe('E008 observed camera bridge', () => {
  it('computes the fixed Adler-32 probe with small integer accumulators', () => {
    assert.equal(digestBytes(new Uint8Array(0)), '00000001')
    assert.equal(digestBytes(new Uint8Array([0])), '00010001')
    assert.equal(digestBytes(new Uint8Array([0, 1, 127, 128, 255, 13, 42, 99])), '0a63029a')
  })

  it('labels a returned frame webcam only when the dedicated canvas read produced those bytes', async () => {
    const { video, canvas, navigatorObj } = fixture()
    const records: unknown[] = []
    const observer = createObservedCameraBridge({ videoElement: video, canvasElement: canvas,
      navigatorObj, onCapture: (record) => records.push(record) })
    await observer.bridge.start({ useBrowserCamera: true })
    const frame = observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.equal(observer.bridge.isBrowserCameraStarted(), true)
    assert.deepEqual(new Uint8Array(frame!.buffer), new Uint8Array([0x00, 0xf8, 0xe0, 0x07, 0x1f, 0x00, 0xff, 0xff]))
    assert.match(JSON.stringify(records[0]), /"source":"webcam"/)
  })

  it('marks a synthetic frame even when the stream started but video is unready', async () => {
    const { video, canvas, navigatorObj } = fixture({ ready: false })
    const records: { source: string }[] = []
    const observer = createObservedCameraBridge({ videoElement: video, canvasElement: canvas,
      navigatorObj, onCapture: (record) => records.push(record) })
    await observer.bridge.start({ useBrowserCamera: true })
    observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.equal(observer.bridge.isBrowserCameraStarted(), true)
    assert.equal(records[0]?.source, 'synthetic')
  })

  it('keeps the native denial category, labels fallback, and stops tracks', async () => {
    const denied = fixture({ reject: 'NotAllowedError' })
    const records: { source: string; errorName?: string | null; errorPhase?: string | null }[] = []
    const observer = createObservedCameraBridge({ videoElement: denied.video, canvasElement: denied.canvas,
      navigatorObj: denied.navigatorObj, onCapture: (record) => records.push(record) })
    await observer.bridge.start({ useBrowserCamera: true })
    observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.equal(observer.lastErrorName(), 'NotAllowedError')
    assert.equal(observer.lastErrorPhase(), 'start')
    assert.equal(records[0]?.source, 'synthetic')
    assert.equal(records[0]?.errorName, 'NotAllowedError')
    assert.equal(records[0]?.errorPhase, 'start')

    const granted = fixture()
    const live = createObservedCameraBridge({ videoElement: granted.video, canvasElement: granted.canvas,
      navigatorObj: granted.navigatorObj, onCapture: () => {} })
    await live.bridge.start({ useBrowserCamera: true })
    live.bridge.stop()
    assert.deepEqual(granted.stopped, ['stop'])
    assert.deepEqual(live.trackStates(), ['ended'])
  })

  it('separates an unsupported API from a synthetic MOD path', async () => {
    const { video, canvas } = fixture()
    const records: { source: string }[] = []
    const observer = createObservedCameraBridge({ videoElement: video, canvasElement: canvas,
      navigatorObj: {}, onCapture: (record) => records.push(record) })
    await observer.bridge.start({ useBrowserCamera: true })
    observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.equal(observer.apiSupported(), false)
    assert.equal(observer.lastErrorName(), null)
    assert.equal(records[0]?.source, 'synthetic')
  })

  it('does not label a failed canvas read webcam when the stream is connected', async () => {
    const { video, canvas, navigatorObj } = fixture()
    canvas.getContext = () => ({ drawImage() {}, getImageData() { throw new DOMException('blocked read', 'SecurityError') } })
    const records: { source: string; errorName?: string | null; errorPhase?: string | null }[] = []
    const observer = createObservedCameraBridge({ videoElement: video, canvasElement: canvas,
      navigatorObj, onCapture: (record) => records.push(record) })
    await observer.bridge.start({ useBrowserCamera: true })
    observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.equal(observer.bridge.isBrowserCameraStarted(), true)
    assert.equal(observer.lastErrorName(), 'SecurityError')
    assert.equal(observer.lastErrorPhase(), 'capture')
    assert.equal(records[0]?.source, 'synthetic')
    assert.equal(records[0]?.errorName, 'SecurityError')
    assert.equal(records[0]?.errorPhase, 'capture')
  })

  it('clears a capture warning when the next frame succeeds', async () => {
    const { video, canvas, navigatorObj } = fixture()
    let reads = 0
    canvas.getContext = () => ({ drawImage() {}, getImageData() {
      if (reads++ === 0) throw new DOMException('blocked read', 'SecurityError')
      return { data: new Uint8ClampedArray([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
      ]) }
    } })
    const records: { source: string; errorName?: string | null; errorPhase?: string | null }[] = []
    const observer = createObservedCameraBridge({ videoElement: video, canvasElement: canvas,
      navigatorObj, onCapture: (record) => records.push(record) })
    await observer.bridge.start({ useBrowserCamera: true })
    observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.equal(observer.lastErrorName(), 'SecurityError')
    assert.equal(observer.lastErrorPhase(), 'capture')
    observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.deepEqual(records.map((record) => record.source), ['synthetic', 'webcam'])
    assert.deepEqual(records.map((record) => [record.errorName, record.errorPhase]),
      [['SecurityError', 'capture'], [null, null]])
    assert.equal(observer.lastErrorName(), null)
    assert.equal(observer.lastErrorPhase(), null)
  })

  it('stops a camera track granted after the bridge was stopped', async () => {
    const { video, canvas, stopped } = fixture()
    const track = { readyState: 'live', stop() { this.readyState = 'ended'; stopped.push('stop') } }
    let grant!: (stream: { getTracks(): typeof track[] }) => void
    const navigatorObj = { mediaDevices: { getUserMedia: () => new Promise<{ getTracks(): typeof track[] }>((resolve) => {
      grant = resolve
    }) } }
    const observer = createObservedCameraBridge({ videoElement: video, canvasElement: canvas,
      navigatorObj, onCapture: () => {} })
    const starting = observer.bridge.start({ useBrowserCamera: true })
    observer.bridge.stop()
    grant({ getTracks: () => [track] })
    await starting
    assert.equal(track.readyState, 'ended')
    assert.deepEqual(stopped, ['stop'])
    assert.equal(observer.bridge.isBrowserCameraStarted(), false)
  })
})
