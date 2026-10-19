import { expect, it } from 'vitest'
import { TurnSession } from './turn-session.ts'
import { TurnBridge } from './turn-bridge.ts'
it('rejects changed record bytes before any upload', async () => {
  const session = new TurnSession('test'); const token = session.begin('clear')
  let calls = 0
  const bridge = new TurnBridge(session, () => { calls++; throw Error('must not upload') }, () => {})
  await bridge.capture(token, new Uint8Array([1,2]).buffer, 'audio/webm', 'speak.webm')
  await expect(bridge.exchange(new Uint8Array([1,3]).buffer, 'clear')).rejects.toThrow(/record/)
  expect(calls).toBe(0)
})
it('rejects a response after its token expires', async () => {
  const session = new TurnSession('test'); const token = session.begin('A')
  const bridge = new TurnBridge(session, async () => {
    session.timeout(token)
    return { ...token, audio_mime: 'audio/wav', audio_base64: 'UklGRgAAAA' }
  }, () => {})
  await expect(bridge.checkTts('A')).rejects.toThrow(/stale/)
})
