import { SwipeObserver, type Snapshot, type TouchEvent } from './observer'

type Robot = { input: { touchPanel?: { subscribe(listener: (event: TouchEvent) => void): () => void } } }
const emit = (record: object): void => trace(`COAMI17|${JSON.stringify(record)}\n`)

// The default WASM onLaunch waits 8 seconds for a setup splash. E017 has a 5s
// readiness contract and uses no setup interaction; use the existing MOD hook.
export function onLaunch(): boolean { return true }

// Overriding this hook prevents the SDK default petting Action subscription.
export function onContextCreated(robot: Robot): void {
  const panel = robot.input.touchPanel
  if (!panel) { emit({ kind: 'unavailable', reason: 'TouchPanel provider missing' }); return }
  const observer = new SwipeObserver()
  panel.subscribe((event) => {
    try {
      const snapshot = (globalThis as typeof globalThis & { __coami17?: Snapshot }).__coami17
      emit(observer.receive(event, snapshot))
    } catch (error) {
      emit({ kind: 'error', reason: String(error) })
    }
  })
  emit({ kind: 'ready' })
}
