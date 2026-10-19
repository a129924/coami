import test from 'node:test'
import assert from 'node:assert/strict'
import { onContextCreated, type Robot, type ButtonEvent } from '../../mod/mod.ts'
const emit = (name: 'a' | 'b' | 'c'): ButtonEvent => ({ kind: 'button', name, pressed: true })
for (const direction of [['a', 'c'], ['c', 'a']] as const) {
  test(`MOD dispatches ${direction.join('→')} while both SDK promises remain pending`, () => {
    const calls: string[] = []
    const robot: Robot = { audio: { record: () => { calls.push('record'); return new Promise(() => {}) }, say: () => { calls.push('say'); return new Promise(() => {}) }, playAudio: async () => true }, input: { button: { a: {}, b: {}, c: {} } } }
    const env = globalThis as typeof globalThis & { trace?: (line: string) => void }; const before = env.trace; env.trace = () => {}
    try { onContextCreated(robot); for (const name of direction) robot.input.button[name]?.onEvent?.(emit(name)); assert.deepEqual(calls, direction.map(n => n === 'a' ? 'record' : 'say')) }
    finally { if (before) env.trace = before; else Reflect.deleteProperty(env, 'trace') }
  })
}
