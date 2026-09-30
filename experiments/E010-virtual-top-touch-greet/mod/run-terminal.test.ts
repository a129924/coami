import assert from 'node:assert/strict'
import test from 'node:test'
import { renderTerminal } from './run-terminal.ts'

test('keeps the rendered terminal when rendering succeeds', () => {
  const rendered: string[] = []
  assert.equal(renderTerminal((terminal) => rendered.push(terminal), 'completed'), 'completed')
  assert.deepEqual(rendered, ['completed'])
})

test('reports failed when completed rendering throws, even if failed rendering also throws', () => {
  const rendered: string[] = []
  const terminal = renderTerminal((value) => {
    rendered.push(value)
    throw new Error('screen unavailable')
  }, 'completed')
  assert.equal(terminal, 'failed')
  assert.deepEqual(rendered, ['completed', 'failed'])
})
