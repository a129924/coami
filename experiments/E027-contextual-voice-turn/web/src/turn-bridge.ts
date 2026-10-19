import type { RequestToken } from './turn-session.ts'
import { TurnSession } from './turn-session.ts'
export type Evidence = (event: Record<string, unknown>) => void
export type Send = (path: string, body: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>
export async function sha256(bytes: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2,'0')).join('')
}
export function base64(bytes: ArrayBuffer): string {
  let out = ''; for (const b of new Uint8Array(bytes)) out += String.fromCharCode(b)
  return btoa(out)
}
export function isObject(v: unknown): v is Record<string, unknown> { return v !== null && typeof v === 'object' }
export class TurnBridge {
  private recording: {token: RequestToken; hash: string; mime: string; filename: string} | null = null
  private replyHash: string | null = null
  private sent = false
  private readonly abort = new AbortController()
  constructor(private readonly session: TurnSession, private readonly send: Send, private readonly evidence: Evidence) {}
  async capture(token: RequestToken, bytes: ArrayBuffer, mime: string, filename: string): Promise<void> {
    if (!bytes.byteLength || bytes.byteLength > 2097152) throw Error('invalid recording size')
    const hash = await sha256(bytes)
    if (!this.session.accept(token)) throw Error('stale recording')
    this.recording = {token, hash, mime, filename}
    this.evidence({kind:'recorded', ...token, sha256:hash, mime, filename, bytes:bytes.byteLength})
  }
  async exchange(bytes: ArrayBuffer, context: 'clear' | 'ambiguous'): Promise<ArrayBuffer> {
    const r = this.recording
    if (!r || !this.session.accept(r.token) || await sha256(bytes) !== r.hash) throw Error('record bytes mismatch or stale')
    return this.post('/turn', { ...r.token, context_id:context, audio_mime:r.mime,
      audio_filename:r.filename, audio_base64:base64(bytes) }, r.token)
  }
  async checkTts(phrase_id: 'A' | 'B'): Promise<ArrayBuffer> {
    const token = this.session.token()
    if (!token) throw Error('no active turn')
    return this.post('/tts-check', {...token, phrase_id}, token)
  }
  private async post(path: string, body: Record<string, unknown>, token: RequestToken): Promise<ArrayBuffer> {
    if (this.sent || this.abort.signal.aborted || !this.session.accept(token)) throw Error('duplicate or stale upload')
    this.sent = true
    const result = await this.send(path, body, this.abort.signal)
    if (!this.session.accept(token) || this.abort.signal.aborted) throw Error('stale response')
    if (!isObject(result) || result.session_id !== token.session_id || result.run_seq !== token.run_seq
      || result.audio_mime !== 'audio/wav' || typeof result.audio_base64 !== 'string'
      || result.audio_base64.length > 5592408) throw Error('response contract mismatch')
    const encoded = result.audio_base64
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)).buffer
    const head = new TextDecoder().decode(bytes.slice(0,12))
    if (bytes.byteLength < 44 || !head.startsWith('RIFF') || !head.endsWith('WAVE')) throw Error('invalid WAV reply')
    const hash = await sha256(bytes)
    if (!this.session.accept(token)) throw Error('stale response')
    this.replyHash = hash
    const {audio_base64: _audio, ...metadata} = result
    this.evidence({kind:'response', ...metadata, audio_sha256:hash, bytes:bytes.byteLength})
    return bytes
  }
  async verifyPlayback(bytes: ArrayBuffer): Promise<void> {
    const token = this.session.token(), expected = this.replyHash
    this.replyHash = null // one-shot, even concurrent calls cannot consume the same reply
    if (!token || !expected || await sha256(bytes) !== expected || !this.session.accept(token))
      throw Error('stale, duplicate or changed playback bytes')
  }
  close(): void { this.abort.abort(); this.recording = null; this.replyHash = null }
}
