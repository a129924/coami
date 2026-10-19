export type Order = 'record-say' | 'say-record'
export type Observation = 'capture-start' | 'playback-running' | 'sdk-called' | 'playback-scheduled'
export type Interval = { start: number; end: number }
export type Playback = Interval & { token: string; sourceId: string; natural: boolean; clockAdvanced: boolean; interrupted: boolean }
export type Evidence = { expectedSayToken: string; capture: Interval | null; recordBytes: number; recordDone: boolean; sayDone: boolean; saySuccess: boolean; playback: Playback[]; issues: string[] }
export type Verdict = { status: 'overlap-observed' | 'no-overlap-observed' | 'baseline-complete' | 'unconfirmed'; overlapMs: number; reason: string }
export function nextOperation(order: Order, event: Observation, already: boolean): 'record' | 'say' | null {
  if (already) return null
  if (order === 'record-say' && event === 'capture-start') return 'say'
  if (order === 'say-record' && event === 'playback-running') return 'record'
  return null
}
export function analyze(e: Evidence): Verdict {
  const unknown = (reason: string): Verdict => ({ status: 'unconfirmed', overlapMs: 0, reason })
  const interval = (v: Interval): boolean => Number.isFinite(v.start) && Number.isFinite(v.end) && v.start >= 0 && v.end > v.start
  if (e.issues.length) return unknown(e.issues.join('; '))
  if (!e.capture || !interval(e.capture) || !e.recordDone || !(e.recordBytes > 0) || !e.sayDone || !e.saySuccess) return unknown('Incomplete recording / SDK terminal evidence')
  if (!e.playback.length) return unknown('No completed TTS source')
  const ids = new Set<string>()
  for (const p of e.playback) {
    if (!interval(p) || p.token !== e.expectedSayToken || !p.natural || !p.clockAdvanced || p.interrupted || ids.has(p.sourceId)) return unknown('Invalid playback lifecycle, clock, token or source identity')
    ids.add(p.sourceId)
  }
  const capture = e.capture
  const clipped = e.playback.map(p => ({ start: Math.max(p.start, capture.start), end: Math.min(p.end, capture.end) })).filter(p => p.end > p.start).sort((a, b) => a.start - b.start)
  let overlapMs = 0, start = -1, end = -1
  for (const p of clipped) {
    if (start < 0) { start = p.start; end = p.end }
    else if (p.start <= end) end = Math.max(end, p.end)
    else { overlapMs += end - start; start = p.start; end = p.end }
  }
  if (start >= 0) overlapMs += end - start
  return overlapMs > 0
    ? { status: 'overlap-observed', overlapMs, reason: 'Capture and completed TTS playback intervals overlap; human listening is separate' }
    : { status: 'no-overlap-observed', overlapMs: 0, reason: 'No overlap in this case; this alone does not establish SDK exclusion' }
}
