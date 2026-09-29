import assert from 'node:assert/strict'
import test from 'node:test'
import { archiveModulePaths } from './build-mod.mjs'

test('the MOD archive plan includes every local module imported by mod.ts', () => {
  assert.deepEqual(archiveModulePaths, ['top-touch-greet.js', 'run-terminal.js'])
})
