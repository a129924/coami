import assert from 'node:assert/strict'
import test from 'node:test'
import { SimulatorEngine, createHostTopTouchBridge, createWasmHostBridge } from './preview-runtime.ts'

test('the preview engine exposes the virtual top-touch bridge and a tap yields press/release samples', () => {
  const bridge = createHostTopTouchBridge()
  const hostBridge = createWasmHostBridge({
    buttonBridge: { Button: {} },
    topTouchBridge: bridge,
    audioOutBridge: {},
    audioInBridge: {},
    cameraBridge: {},
    driverBridge: {},
  })

  assert.equal(hostBridge.TopTouchPanel, bridge)
  assert.equal(typeof SimulatorEngine.prototype.pushTopTouch, 'function')
  assert.equal(SimulatorEngine.prototype.pushTopTouch.call({ topTouchBridge: bridge }, -100), true)

  assert.equal(bridge.read(0), 1)
  assert.equal(bridge.read(1), 0)
  assert.equal(bridge.read(2), 0)
  assert.equal(bridge.ticks(), 1)
  assert.equal(bridge.read(0), 0)
  assert.equal(bridge.read(1), 0)
  assert.equal(bridge.read(2), 0)
  assert.equal(bridge.ticks(), 2)
})
