import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import { GestureRecognizer } from '../../../../vendor/stack-chan/firmware/host/modules/input/touch-panel-gesture.ts'
import { createTouchPanelInputEvent } from '../../../../vendor/stack-chan/firmware/host/modules/input/input-event.ts'
import { TopSwipeInput } from './input.ts'
import { SwipeObserver, type Snapshot, type TouchEvent } from '../../mod/observer.ts'

const staged = new URL('../generated/pinned-stack-chan/', import.meta.url)
const source = (file: string) => readFileSync(new URL(file,staged),'utf8')
test('actual patched SDK dispatches original MOD event before terminal acknowledgement', () => {
  let callback: (() => void) | undefined
  const input = new TopSwipeInput(4, () => 123)
  const observer = new SwipeObserver()
  const order: string[] = []
  const context = createContext({ trace: () => {}, native: (name: string) => {
    if (name === 'xs_stackchan_e017_take') return () => {
      const t = input.take(), m = t.meta
      return [...t.sample,m.session,m.operation,m.sampleId,m.ticks,Number(m.terminal),Number(m.queued)]
    }
    return (session: number,sample: number) => { order.push('ack'); input.consumed(session,sample) }
  } })
  const driver = source('firmware/host/modules/input/wasm/touch-panel-bridge.js')
  runInContext(driver.replace('export function','function')+'\ninstallWasmTouchPanel()',context)
  const sdk = stripTypeScriptTypes(source('firmware/host/modules/input/touch-panel.ts'))
    .replace(/^import[\s\S]*?from '[^']+'\n/gm, '')
    .replace('export default class TouchPanel', 'class TouchPanel')
    .replace(/export\s*\{[\s\S]*?\}/g, '')
  Object.assign(context,{createTouchPanelInputEvent,GestureRecognizer,Time:{ticks:-999},
    Timer:{repeat:(fn:()=>void) => {callback=fn;return 1},clear:()=>{}}})
  runInContext(sdk+'\nglobalThis.panel = new TouchPanel(globalThis.device.sensor.TouchPanel); panel.start()',context)
  const panel = context.panel as { subscribe(fn:(event:TouchEvent)=>void):void }
  panel.subscribe(event => {
    const record = observer.receive(event,context.__coami17 as Snapshot)
    order.push(event.gesture)
    assert.equal(record.meta.ticks,123)
    if (event.gesture === 'release') assert.equal(input.state,'cleaning')
  })
  input.modReady(); callback!()
  assert.equal(input.state,'ready')
  input.begin(1,-100); input.move(1,100); input.end(1)
  callback!();callback!();callback!()
  assert.deepEqual(order,['ack','press','ack','forwardSwipe','ack','release','ack'])
  assert.equal(input.state,'ready')
})
test('runtime patch leaves recognizer unchanged and has no gesture injection hook', () => {
  const patch = readFileSync(new URL('../../runtime/wasm-top-touch.patch',import.meta.url),'utf8')
  assert.equal(patch.includes('diff --git a/firmware/host/modules/input/touch-panel-gesture.ts'),false)
  assert.equal(patch.includes('pushTopTouchSwipe'),false)
  assert.match(patch,/EM_ASM_DOUBLE/)
  assert.match(patch,/this\.#driver\.consumed\?\.\(\)/)
})
