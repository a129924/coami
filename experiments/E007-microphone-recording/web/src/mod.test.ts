/// <reference path="../../mod/host.d.ts" />
import assert from 'node:assert/strict'
import test from 'node:test'

import { onContextCreated } from '../../mod/mod.ts'

type Robot = Parameters<typeof onContextCreated>[0]
type RunTrace = { kind: string; phase?: string; error_code?: string; detail?: string }

async function terminalTrace(audio: Robot['audio']): Promise<RunTrace> {
  const messages: string[] = []
  const globals = globalThis as typeof globalThis & { trace?: (message: string) => void }
  const previousTrace = globals.trace
  globals.trace = (message) => { messages.push(message.trim()) }
  try {
    const robot: Robot = { audio, input: { button: { a: {} } } }
    onContextCreated(robot)
    robot.input.button?.a?.onEvent?.({ kind: 'button', name: 'a', pressed: true })
    await new Promise<void>((resolve) => setImmediate(resolve))
    const runs = messages.filter((message) => message.startsWith('COAMI7|'))
      .map((message) => JSON.parse(message.slice(7)) as RunTrace)
      .filter((message) => message.kind === 'run')
    const terminal = runs.at(-1)
    assert.ok(terminal)
    return terminal
  } finally {
    if (previousTrace) globals.trace = previousTrace
    else Reflect.deleteProperty(globals, 'trace')
  }
}

test('playback rejection is playback_failed even when its text mentions permission', async () => {
  const buffer = new ArrayBuffer(12)
  const result = await terminalTrace({
    record: async () => buffer,
    playAudio: async (received) => {
      assert.strictEqual(received, buffer)
      throw new Error('permission denied by playback device')
    },
  })
  assert.equal(result.phase, 'failed')
  assert.equal(result.error_code, 'playback_failed')
  assert.equal(Object.hasOwn(result, 'detail'), false)
})

test('recording permission failure has only a bounded error code', async () => {
  const result = await terminalTrace({
    record: async () => { throw new Error('NotAllowedError: microphone permission denied') },
    playAudio: async () => true,
  })
  assert.equal(result.phase, 'failed')
  assert.equal(result.error_code, 'permission_denied')
  assert.equal(Object.hasOwn(result, 'detail'), false)
})
