import { currentTouchMetadata } from 'wasm-touch-panel-bridge'
type TouchEvent = { gesture: string; ticks: number; position: number }
type Robot = { input: { touchPanel?: { subscribe(listener: (event: TouchEvent) => void): () => void } } }
export function onContextCreated(robot: Robot): void {
  const panel = robot.input.touchPanel
  if (!panel) { trace('COAMI16|{"kind":"unavailable"}\n'); return }
  panel.subscribe(event => {
    const metadata = currentTouchMetadata()
    trace(`COAMI16|${JSON.stringify({ kind: 'touch', ...metadata, gesture: event.gesture, ticks: event.ticks, position: event.position })}\n`)
  })
  trace('COAMI16|{"kind":"ready"}\n')
}
