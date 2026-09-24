import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ACTION_CATALOG, CATALOG_VERSION, parseModTrace, recordsToJsonl, type ActionId, type ModTrace } from './action-contract.ts'
import { ActionDispatcher, type ButtonName } from './dispatcher.ts'

function trace(value: object): ModTrace {
  return { ...value, catalog_version: CATALOG_VERSION } as ModTrace
}

test('one human action selects, executes, and records one command/result pair', async () => {
  const pushed: ButtonName[] = []
  let selectionIndex = -1
  let selectionSeq = 0
  let dispatcher: ActionDispatcher
  const push = (name: ButtonName) => {
    pushed.push(name)
    if (name === 'a') {
      selectionIndex = (selectionIndex + 1) % ACTION_CATALOG.length
      selectionSeq += 1
      const action_id = ACTION_CATALOG[selectionIndex].id
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: selectionSeq, selected_index: selectionIndex, action_id, phase: 'pressed' }))
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: selectionSeq, selected_index: selectionIndex, action_id, phase: 'released' }))
    }
    if (name === 'c') {
      const action_id = ACTION_CATALOG[selectionIndex].id
      dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id, phase: 'started' }))
      dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id, phase: 'completed' }))
    }
  }
  dispatcher = new ActionDispatcher(push, () => '2026-09-23T00:00:00.000Z', () => 'request-1', 100)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((action) => action.id), selected_index: -1 }))

  const result = await dispatcher.run('face.angry')

  assert.deepEqual(pushed, ['a', 'a', 'c'])
  assert.equal(result.status, 'completed')
  assert.equal(result.mod_run_seq, 1)
  assert.equal(dispatcher.records.length, 2)
  const [command, savedResult] = dispatcher.records
  assert.equal(command.record_type, 'command')
  assert.equal(savedResult.record_type, 'result')
  assert.equal(command.request_id, savedResult.request_id)
  assert.equal(JSON.parse(recordsToJsonl(dispatcher.records).split('\n')[1]).status, 'completed')
})

test('wrong selected action stops before C and yields failed result', async () => {
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') {
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.hot', phase: 'pressed' }))
    }
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  }, undefined, undefined, 30)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((action) => action.id), selected_index: -1 }))

  const result = await dispatcher.run('face.neutral')
  assert.equal(result.status, 'failed')
  assert.equal(result.error_code, 'selection_mismatch')
  assert.deepEqual(pushed, ['a', 'b'])
})

test('contradictory selected index on A release prevents C', async () => {
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') {
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'pressed' }))
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 19, action_id: 'face.neutral', phase: 'released' }))
    }
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  }, undefined, undefined, 30)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))

  const result = await dispatcher.run('face.neutral')
  assert.equal(result.status, 'failed')
  assert.equal(result.error_code, 'selection_mismatch')
  assert.deepEqual(pushed, ['a', 'b'])
})

test('catalog exposes fixed named candidates', () => {
  const ids: ActionId[] = ACTION_CATALOG.map((item) => item.id)
  assert.equal(ids.length, 20)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.at(-1), 'greet')
})

test('B during selection cancels the action and never sends C', async () => {
  const pushed: ButtonName[] = []
  let nextId = 0
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'pressed' }))
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  }, undefined, () => `request-${++nextId}`, 25)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((action) => action.id), selected_index: -1 }))

  const action = dispatcher.run('face.neutral')
  await Promise.resolve()
  const stop = dispatcher.stop()
  const [actionResult, stopResult] = await Promise.all([action, stop])
  assert.deepEqual(pushed, ['a', 'b'])
  assert.equal(actionResult.status, 'cancelled')
  assert.equal(actionResult.cancelled_by_request_id, stopResult.request_id)
  assert.equal(stopResult.status, 'completed')
  assert.equal(dispatcher.records[2].record_type, 'result')
  assert.equal(dispatcher.records[3].record_type, 'result')
})

test('B immediately after synchronous A acknowledgement prevents C and links cancellation', async () => {
  const pushed: ButtonName[] = []
  let nextId = 0
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') {
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'pressed' }))
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'released' }))
    }
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  }, undefined, () => `request-${++nextId}`, 10)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))

  const action = dispatcher.run('face.neutral')
  const stop = dispatcher.stop()
  const [actionResult, stopResult] = await Promise.all([action, stop])
  assert.deepEqual(pushed, ['a', 'b'])
  assert.equal(actionResult.status, 'cancelled')
  assert.equal(actionResult.cancelled_by_request_id, stopResult.request_id)
  assert.equal(stopResult.status, 'completed')
})

test('B during an active run preserves independent action and stop results', async () => {
  let dispatcher: ActionDispatcher
  let nextId = 0
  dispatcher = new ActionDispatcher((name) => {
    if (name === 'a') {
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'pressed' }))
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'released' }))
    }
    if (name === 'c') dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'started' }))
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'cancelled' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
    }
  }, undefined, () => `request-${++nextId}`, 100)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((action) => action.id), selected_index: -1 }))

  const action = dispatcher.run('face.neutral')
  await new Promise((resolve) => setImmediate(resolve))
  const stop = dispatcher.stop()
  const [actionResult, stopResult] = await Promise.all([action, stop])
  assert.equal(actionResult.status, 'cancelled')
  assert.equal(actionResult.cancelled_by_request_id, stopResult.request_id)
  assert.equal(stopResult.status, 'completed')
  assert.deepEqual(dispatcher.records.map((record) => record.record_type), ['command', 'command', 'result', 'result'])
})

test('missing A acknowledgement times out, resets, and never executes C', async () => {
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
    }
  }, undefined, undefined, 10)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((action) => action.id), selected_index: -1 }))
  const result = await dispatcher.run('face.neutral')
  assert.equal(result.status, 'timeout')
  assert.equal(result.mod_run_seq, null)
  assert.deepEqual(pushed, ['a', 'b'])
  assert.equal(dispatcher.canRun, true)
})

test('B reset restores selection sequence after a missing A release', async () => {
  let selected = -1
  let sequence = 0
  let aCount = 0
  let runSequence = 0
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    if (name === 'a') {
      selected = (selected + 1) % ACTION_CATALOG.length
      sequence += 1
      aCount += 1
      const action_id = ACTION_CATALOG[selected].id
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: sequence, selected_index: selected, action_id, phase: 'pressed' }))
      if (aCount !== 2) dispatcher.ingest(trace({ kind: 'selection', selection_seq: sequence, selected_index: selected, action_id, phase: 'released' }))
    }
    if (name === 'c') {
      const action_id = ACTION_CATALOG[selected].id
      runSequence += 1
      dispatcher.ingest(trace({ kind: 'run', run_seq: runSequence, action_id, phase: 'started' }))
      dispatcher.ingest(trace({ kind: 'run', run_seq: runSequence, action_id, phase: 'completed' }))
    }
    if (name === 'b') {
      selected = -1
      sequence = 0
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  }, undefined, undefined, 10)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))

  assert.equal((await dispatcher.run('face.neutral')).status, 'completed')
  assert.equal((await dispatcher.run('face.angry')).status, 'timeout')
  const recovered = await dispatcher.run('face.neutral')
  assert.equal(recovered.status, 'completed')
  assert.equal(recovered.mod_run_seq, 2)
})

test('failed MOD terminal triggers B reset and locks on reset failure', async () => {
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') {
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'pressed' }))
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'released' }))
    }
    if (name === 'c') {
      dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'started' }))
      dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'failed', error: 'motion rejected' }))
    }
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'reset', phase: 'failed', error: 'pose failure' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  }, undefined, undefined, 30)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))

  const result = await dispatcher.run('face.neutral')
  assert.equal(result.status, 'failed')
  assert.equal(result.error_code, 'mod_failed')
  assert.deepEqual(pushed, ['a', 'c', 'b'])
  assert.equal(dispatcher.isLocked, true)
  assert.equal(dispatcher.canRun, false)
})

test('successful B reset after a failed MOD terminal allows a clean next action', async () => {
  let selected = -1
  let sequence = 0
  let runSequence = 0
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') {
      selected = (selected + 1) % ACTION_CATALOG.length
      sequence += 1
      for (const phase of ['pressed', 'released'] as const) {
        dispatcher.ingest(trace({ kind: 'selection', selection_seq: sequence, selected_index: selected, action_id: ACTION_CATALOG[selected].id, phase }))
      }
    }
    if (name === 'c') {
      runSequence += 1
      const action_id = ACTION_CATALOG[selected].id
      dispatcher.ingest(trace({ kind: 'run', run_seq: runSequence, action_id, phase: 'started' }))
      dispatcher.ingest(trace({ kind: 'run', run_seq: runSequence, action_id, phase: runSequence === 1 ? 'failed' : 'completed' }))
    }
    if (name === 'b') {
      selected = -1
      sequence = 0
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  }, undefined, undefined, 30)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))

  assert.equal((await dispatcher.run('face.neutral')).status, 'failed')
  assert.equal(dispatcher.isLocked, false)
  assert.equal(dispatcher.canRun, true)
  assert.equal((await dispatcher.run('face.neutral')).status, 'completed')
  assert.deepEqual(pushed, ['a', 'c', 'b', 'a', 'c'])
})

test('stop is unavailable while an internal reset is pending', async () => {
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.hot', phase: 'pressed' }))
  }, undefined, undefined, 30)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))

  const action = dispatcher.run('face.neutral')
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(pushed, ['a', 'b'])
  assert.equal(dispatcher.canStop, false)
  const stop = await dispatcher.stop()
  assert.equal(stop.status, 'failed')
  assert.equal(stop.error_code, 'unavailable')
  assert.deepEqual(pushed, ['a', 'b'])
  dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
  dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
  assert.equal((await action).error_code, 'selection_mismatch')
})

test('restart rejects the old pending selection and waits for a new catalog', async () => {
  const pushed: ButtonName[] = []
  const dispatcher = new ActionDispatcher((name) => pushed.push(name), undefined, undefined, 50)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((action) => action.id), selected_index: -1 }))
  const pending = dispatcher.run('face.neutral')
  dispatcher.restart()
  const result = await pending
  assert.equal(result.status, 'failed')
  assert.equal(result.error_code, 'simulator_restarted')
  assert.equal(result.simulator_generation, 0)
  assert.equal(dispatcher.simulatorGeneration, 1)
  assert.deepEqual(pushed, ['a'])
  assert.equal(dispatcher.canRun, false)
})

test('an incompatible catalog cannot enable action buttons', () => {
  const dispatcher = new ActionDispatcher(() => {})
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ['greet'], selected_index: -1 }))
  assert.equal(dispatcher.canRun, false)
})

test('restart during a pending stop cannot lock the new simulator generation', async () => {
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    if (name === 'a') {
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'pressed' }))
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'released' }))
    }
    if (name === 'c') dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'started' }))
  }, undefined, undefined, 50)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((action) => action.id), selected_index: -1 }))
  const action = dispatcher.run('face.neutral')
  await new Promise((resolve) => setImmediate(resolve))
  const stop = dispatcher.stop()
  dispatcher.restart()
  await Promise.all([action, stop])
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))
  assert.equal(dispatcher.isLocked, false)
  assert.equal(dispatcher.canRun, true)
})

test('malformed MOD trace fields never become typed acknowledgements', () => {
  assert.equal(parseModTrace('COAMI5|{"catalog_version":1,"kind":"selection","selection_seq":1,"selected_index":"bad","action_id":"face.neutral","phase":"pressed"}'), null)
  assert.equal(parseModTrace('COAMI5|{"catalog_version":1,"kind":"run","run_seq":"bad","action_id":"face.neutral","phase":"completed"}'), null)
  assert.equal(parseModTrace('COAMI5|not-json'), null)
  assert.equal(parseModTrace('COAMI5|{"catalog_version":1,"kind":"run","run_seq":1,"action_id":"face.neutral","phase":["completed"]}'), null)
  assert.equal(parseModTrace('COAMI5|{"catalog_version":1,"kind":"reset","phase":["completed"]}'), null)
})

test('download remains unavailable until action and stop results are complete', async () => {
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    if (name === 'a') {
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'pressed' }))
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'released' }))
    }
    if (name === 'c') dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'started' }))
  }, undefined, undefined, 30)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))
  assert.equal(dispatcher.canDownload, false)

  const action = dispatcher.run('face.neutral')
  assert.equal(dispatcher.canDownload, false)
  await new Promise((resolve) => setImmediate(resolve))
  dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'completed' }))
  assert.equal((await action).status, 'completed')
  assert.equal(dispatcher.canDownload, true)

  const stop = dispatcher.stop()
  assert.equal(dispatcher.canDownload, false)
  dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
  dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
  assert.equal((await stop).status, 'completed')
  assert.equal(dispatcher.canDownload, true)
})

test('stop started_at records B dispatch time rather than reset completion', async () => {
  let tick = 0
  let tickAtB = 0
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    if (name !== 'b') return
    tickAtB = tick
    dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
    dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
  }, () => new Date(++tick * 1000).toISOString())
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))
  const result = await dispatcher.stop()
  assert.equal(result.started_at, new Date(tickAtB * 1000).toISOString())
  assert.notEqual(result.started_at, result.finished_at)
})

test('last catalog action is reachable directly from initial index -1', async () => {
  let selected = -1
  let seq = 0
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') {
      selected = (selected + 1) % ACTION_CATALOG.length
      seq += 1
      for (const phase of ['pressed', 'released'] as const) {
        dispatcher.ingest(trace({ kind: 'selection', selection_seq: seq, selected_index: selected, action_id: ACTION_CATALOG[selected].id, phase }))
      }
    }
    if (name === 'c') {
      dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'greet', phase: 'started' }))
      dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'greet', phase: 'completed' }))
    }
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'reset', phase: 'completed' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  })
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))
  const result = await dispatcher.run('greet')
  assert.equal(result.status, 'completed')
  assert.equal(pushed.filter((name) => name === 'a').length, ACTION_CATALOG.length)
  assert.equal(pushed.at(-1), 'c')
})

test('rapid action clicks serialize to one MOD run and two command/result pairs', async () => {
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'a') {
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'pressed' }))
      dispatcher.ingest(trace({ kind: 'selection', selection_seq: 1, selected_index: 0, action_id: 'face.neutral', phase: 'released' }))
    }
    if (name === 'c') dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'started' }))
  }, undefined, undefined, 100)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))

  const first = dispatcher.run('face.neutral')
  const second = await dispatcher.run('face.neutral')
  assert.equal(second.status, 'failed')
  assert.equal(second.error_code, 'unavailable')
  await new Promise((resolve) => setImmediate(resolve))
  dispatcher.ingest(trace({ kind: 'run', run_seq: 1, action_id: 'face.neutral', phase: 'completed' }))
  assert.equal((await first).status, 'completed')
  assert.deepEqual(pushed, ['a', 'c'])
  assert.equal(dispatcher.records.filter((record) => record.record_type === 'command').length, 2)
  assert.equal(dispatcher.records.filter((record) => record.record_type === 'result').length, 2)
})

test('failed B reset locks dispatch until simulator restart and fresh catalog', async () => {
  const pushed: ButtonName[] = []
  let dispatcher: ActionDispatcher
  dispatcher = new ActionDispatcher((name) => {
    pushed.push(name)
    if (name === 'b') {
      dispatcher.ingest(trace({ kind: 'reset', phase: 'failed', error: 'pose failure' }))
      dispatcher.ingest(trace({ kind: 'reset', phase: 'released' }))
    }
  }, undefined, undefined, 100)
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))

  const stop = await dispatcher.stop()
  assert.equal(stop.status, 'failed')
  assert.equal(stop.error_code, 'reset_failed')
  assert.equal(stop.detail, 'pose failure')
  assert.equal(dispatcher.isLocked, true)
  assert.equal((await dispatcher.run('face.neutral')).error_code, 'unavailable')
  assert.deepEqual(pushed, ['b'])

  dispatcher.restart()
  dispatcher.setReady(true)
  dispatcher.ingest(trace({ kind: 'catalog', action_ids: ACTION_CATALOG.map((item) => item.id), selected_index: -1 }))
  assert.equal(dispatcher.isLocked, false)
  assert.equal(dispatcher.canRun, true)
})
