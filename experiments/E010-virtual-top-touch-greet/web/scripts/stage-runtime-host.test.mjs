import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { stagePatchedHostRuntime } from './stage-runtime-host.mjs'

const hostSources = [
  'web/simulator/bridge.mjs',
  'web/simulator/geometry.mjs',
  'web/simulator/mod-storage.mjs',
  'web/src/services/simulator/simulator-engine.mjs',
]

test('stages host runtime when the generated parent does not yet exist', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'coami-e010-stage-test-'))
  const output = path.join(scratch, 'missing-generated-parent', 'pinned-stack-chan')
  try {
    for (const source of hostSources) {
      const fixture = path.join(scratch, source)
      await mkdir(path.dirname(fixture), { recursive: true })
      await writeFile(fixture, source)
    }

    await stagePatchedHostRuntime(scratch, output)

    assert.equal(await readFile(path.join(output, hostSources[0]), 'utf8'), hostSources[0])
    const provenance = JSON.parse(await readFile(path.join(output, 'runtime-host-provenance.json'), 'utf8'))
    assert.deepEqual(provenance.sources.slice(0, hostSources.length), hostSources)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})
