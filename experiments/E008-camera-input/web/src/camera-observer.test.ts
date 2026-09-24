import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createObservedCameraBridge } from './camera-observer.ts'

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
    const records: { source: string }[] = []
    const observer = createObservedCameraBridge({ videoElement: denied.video, canvasElement: denied.canvas,
      navigatorObj: denied.navigatorObj, onCapture: (record) => records.push(record) })
    await observer.bridge.start({ useBrowserCamera: true })
    observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.equal(observer.lastErrorName(), 'NotAllowedError')
    assert.equal(observer.lastErrorPhase(), 'start')
    assert.equal(records[0]?.source, 'synthetic')

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
    const records: { source: string }[] = []
    const observer = createObservedCameraBridge({ videoElement: video, canvasElement: canvas,
      navigatorObj, onCapture: (record) => records.push(record) })
    await observer.bridge.start({ useBrowserCamera: true })
    observer.bridge.capture({ width: 2, height: 2, imageType: 'rgb565le' })
    assert.equal(observer.bridge.isBrowserCameraStarted(), true)
    assert.equal(observer.lastErrorName(), 'SecurityError')
    assert.equal(observer.lastErrorPhase(), 'capture')
    assert.equal(records[0]?.source, 'synthetic')
  })
})
