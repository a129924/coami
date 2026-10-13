import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TtsSession, TEXT, parseModTrace, type RequestToken, type SessionEvent } from './tts-session.ts'
import { onContextCreated, type Robot } from '../../mod/mod.ts'

function setup() {
  const jobs = new Set<() => void>()
  const sent: string[] = [], events: SessionEvent[] = []
  const session = new TtsSession('session-1', {
    dispatch: button => { sent.push(button) },
    after: (_ms, callback) => { jobs.add(callback); return () => { jobs.delete(callback) } },
    changed: () => {}, evidence: event => { events.push(event) },
  })
  session.ready()
  return { session, sent, events, expire: () => { for (const job of [...jobs]) job() } }
}
function started(session: TtsSession, token: RequestToken) {
  session.started(token.runSeq, token.text)
  assert.deepEqual(session.playbackToken(), token)
}
function complete(session: TtsSession, token: RequestToken) {
  started(session, token)
  session.playback(token, 'started')
  session.playback(token, 'ended')
  session.sdk(token.runSeq, token.text, true, token.text)
}

test('pinned Emscripten print strips newline: ready/started still parse before playback binding', () => {
  assert.deepEqual(parseModTrace('COAMI18|{"kind":"ready"}'), [{ kind: 'ready' }])
  const { session } = setup(), token = session.request('A')!
  const messages = parseModTrace(`COAMI18|${JSON.stringify({ kind: 'started', runSeq: 1, text: TEXT.A })}\nCOAMI18|{"kind":"busy"}\n`)
  assert.equal(messages.length, 2)
  assert.deepEqual(parseModTrace('COAMI18|{"kind":"sdk","success":true,"value":"こんにちは。"}'), [{ kind: 'sdk', success: true, value: TEXT.A }])
  session.started(messages[0]!.runSeq as number, messages[0]!.text as string)
  assert.equal(session.playbackToken(), token)
  assert.deepEqual(parseModTrace('[bridge] Host.Button.a pushed'), [])
  assert.throws(() => parseModTrace('COAMI18|{bad'), /trace/)
})

test('pending exists before dispatch and buttons map A/B; busy never dispatches or consumes sequence', () => {
  const { session, sent } = setup()
  const a = session.request('A')!
  assert.equal(a.text, TEXT.A)
  assert.equal(a.runSeq, 1)
  assert.equal(session.request('B'), null)
  assert.deepEqual(sent, ['a'])
  complete(session, a)
  const b = session.request('B')!
  assert.equal(b.runSeq, 2)
  assert.equal(b.text, TEXT.B)
  assert.deepEqual(sent, ['a', 'c'])
})

test('natural ended and SDK success are both required; A-B-A retain distinct identity', () => {
  const { session } = setup()
  for (const choice of ['A', 'B', 'A'] as const) {
    const token = session.request(choice)!
    started(session, token)
    session.playback(token, 'started')
    session.sdk(token.runSeq, token.text, true, token.text)
    assert.equal(session.snapshot().status, 'speaking')
    session.playback(token, 'ended')
    assert.equal(session.snapshot().status, 'idle')
  }
  assert.deepEqual(session.snapshot().results.map(r => [r.runSeq, r.text, r.outcome]),
    [[1, TEXT.A, 'completed'], [2, TEXT.B, 'completed'], [3, TEXT.A, 'completed']])
})

test('bridge token is unavailable until matching MOD started; mismatches cannot complete', () => {
  const { session, expire } = setup()
  const token = session.request('A')!
  assert.equal(session.playbackToken(), null)
  session.started(2, TEXT.A)
  session.started(1, TEXT.B)
  assert.equal(session.playbackToken(), null)
  session.sdk(2, TEXT.A, true, TEXT.A)
  expire()
  assert.equal(session.snapshot().results[0]?.outcome, 'unconfirmed')
  assert.equal(session.request('B'), null)
  assert.equal(token.runSeq, 1)
})

test('SDK success without playback (zero samples) stays pending until 30s watchdog, then locks', () => {
  const { session, expire } = setup()
  const token = session.request('A')!
  started(session, token)
  session.sdk(1, TEXT.A, true, TEXT.A)
  assert.equal(session.snapshot().results.length, 0)
  assert.equal(session.snapshot().status, 'speaking')
  expire()
  assert.equal(session.snapshot().results[0]?.outcome, 'unconfirmed')
  assert.equal(session.snapshot().status, 'locked')
  session.playback(token, 'ended')
  session.sdk(1, TEXT.A, true, TEXT.A)
  assert.equal(session.snapshot().results.length, 1)
  assert.equal(session.snapshot().results[0]?.outcome, 'unconfirmed')
})

test('SDK failure with no active playback is failed; next request is accepted', () => {
  const { session } = setup()
  const token = session.request('A')!
  started(session, token)
  session.sdk(1, TEXT.A, false, 'synthesis error')
  assert.equal(session.snapshot().results[0]?.outcome, 'failed')
  assert.match(session.snapshot().results[0]!.reason, /synthesis error/)
  assert.ok(session.request('B'))
})

test('play failure followed by SDK failure is failed; SDK text mismatch never completed', () => {
  const { session } = setup()
  const a = session.request('A')!
  started(session, a)
  session.playback(a, 'failed', 'decode error')
  session.sdk(1, TEXT.A, false, 'browser playback failed')
  assert.equal(session.snapshot().results[0]?.outcome, 'failed')
  const b = session.request('B')!
  started(session, b)
  session.playback(b, 'started')
  session.playback(b, 'ended')
  session.sdk(2, TEXT.B, true, TEXT.A)
  assert.equal(session.snapshot().results[1]?.outcome, 'failed')
})

test('SDK failure during active playback and context interruption remain unknown/locked', () => {
  for (const mode of ['sdk', 'interruption']) {
    const { session } = setup()
    const token = session.request('A')!
    started(session, token)
    session.playback(token, 'started')
    if (mode === 'sdk') session.sdk(1, TEXT.A, false, 'unexpected failure')
    else session.playback(token, 'interrupted', 'context suspended')
    assert.equal(session.snapshot().results[0]?.outcome, 'unconfirmed')
    assert.equal(session.request('B'), null)
  }
})

test('immutable prior request/session callbacks cannot attach to a later request', () => {
  const { session } = setup()
  const a = session.request('A')!
  complete(session, a)
  const b = session.request('B')!
  started(session, b)
  session.playback(a, 'ended')
  session.playback({ ...b, sessionId: 'old-session' }, 'ended')
  session.sdk(1, TEXT.A, true, TEXT.A)
  assert.equal(session.snapshot().results.length, 1)
  assert.equal(session.snapshot().status, 'speaking')
  session.playback(b, 'started'); session.playback(b, 'ended')
  session.sdk(2, TEXT.B, true, TEXT.B)
  assert.equal(session.snapshot().results.length, 2)
  assert.ok(Object.isFrozen(a))
})

test('dispatch observes pending before synchronous callbacks; dispatch throw locks', () => {
  let session: TtsSession
  session = new TtsSession('sync', { dispatch: () => {
    assert.equal(session.snapshot().current?.runSeq, 1)
    session.started(1, TEXT.A)
    throw Error('dispatch unknown')
  }, after: () => () => {}, changed: () => {}, evidence: () => {} })
  session.ready(); session.request('A')
  assert.equal(session.snapshot().results[0]?.outcome, 'unconfirmed')
})

test('MOD guard refuses busy, does not consume sequence, and catches SDK throws', async () => {
  const lines: string[] = []
  const env = globalThis as typeof globalThis & { trace?: (s: string) => void }
  const previous = env.trace
  env.trace = s => { lines.push(s) }
  try {
    let resolve!: (value: { success: true; value: string }) => void
    let calls = 0
    const robot: Robot = { input: { button: { a: {}, c: {} } }, audio: { say: text => {
      calls++
      if (calls === 1) return new Promise(r => { resolve = r })
      throw Error('SDK throw')
    } } }
    onContextCreated(robot)
    const push = (name: 'a' | 'c') => robot.input.button[name]!.onEvent!({ kind: 'button', name, pressed: true })
    push('a'); push('c')
    assert.equal(calls, 1)
    resolve({ success: true, value: TEXT.A })
    await Promise.resolve(); await Promise.resolve()
    push('c')
    await Promise.resolve()
    const records = lines.map(s => JSON.parse(s.slice('COAMI18|'.length)) as Record<string, unknown>)
    assert.deepEqual(records.filter(r => r.kind === 'started').map(r => r.runSeq), [1, 2])
    assert.equal(records.filter(r => r.kind === 'busy').length, 1)
    assert.match(String(records.find(r => r.kind === 'sdk' && r.runSeq === 2)?.reason), /SDK throw/)
  } finally { env.trace = previous }
})
