import { TARGETS, validTarget, type GazeEvent, type Kind } from '../../mod/gaze-control.ts'
export type Observation = '符合' | '不符合' | '未確認'
export class Ledger {
  busy = false
  blocked = false
  needsObservation = false
  status = '等待操作'
  current: GazeEvent | null = null
  returned = false
  driver = false
  failed = false
  observations: { seq: number; kind: Kind; target?: string; result: Observation }[] = []
  ingest(line: string): void {
    if (/\[MotionController\].*failed:/.test(line)) {
      this.failed = true; this.status = '執行錯誤；方向未確認'
      // An unscoped error may belong to an earlier target. Do not attribute it to a later operation.
      this.blocked = true; return
    }
    // Accept only a target-matching dispatch inside this synchronous SDK call.
    // Later polling/replayed traces cannot supply evidence for a new operation.
    if (line.startsWith('[WasmDriver] applyRotation') && this.busy && !this.returned && !this.blocked && this.current) {
      const m=line.match(/^\[WasmDriver\] applyRotation y=([^ ]+) p=([^ ]+) r=([^ ]+) time=/)
      const actual=m?[Number(m[1]),Number(m[2]),Number(m[3])]:[]
      const point=this.current.point
      const expected=this.current.kind==='prepare'?[0,0,0]:this.current.kind==='look'&&point
        ?[Math.atan2(point[1],point[0]),-Math.atan2(point[2],Math.hypot(point[0],point[1])),0]:null
      if(expected&&actual.length===3&&actual.every((v,i)=>Number.isFinite(v)&&Math.abs(v-expected[i]!)<1e-6))this.driver=true
    }
    if (!line.startsWith('COAMI19|')) return
    let value: unknown
    try { value = JSON.parse(line.slice(8)) } catch { this.blocked = true; return }
    if (!validEvent(value)) return
    if (value.phase === 'begin') {
      if (this.current && value.seq <= this.current.seq) return
      if (this.busy || this.needsObservation) { this.blocked = true; this.status = '非預期重疊操作；請重新載入'; return }
      this.current = value; this.busy = true; this.needsObservation = false
      this.driver = false; this.failed = false; this.returned = false; this.status = '呼叫中；觀察待確認'
    } else if (value.seq === this.current?.seq && value.kind === this.current.kind) {
      if (value.phase === 'returned') {
        this.returned = true
        if (!this.failed) this.status = value.kind === 'away' ? '解除呼叫已返回；清除語意見契約測試' : '設定呼叫已返回；方向待確認'
      } else if (value.phase === 'failed') { this.failed = true; this.status = `呼叫失敗：${value.error ?? 'unknown'}` }
      else if (value.phase === 'window-ended') { this.busy = false; this.needsObservation = true }
    }
  }
  confirm(result: Observation): boolean {
    if (!this.current || this.busy || !this.needsObservation) return false
    if (this.current.kind === 'away' && result !== '未確認') return false
    if (result === '符合' && (this.current.kind === 'away' || !this.returned || this.failed || !this.driver || this.blocked)) return false
    this.observations.push({ seq: this.current.seq, kind: this.current.kind, target: this.current.target, result })
    this.needsObservation = false; return true
  }
}
function validEvent(value: unknown): value is GazeEvent {
  if (typeof value !== 'object' || !value) return false
  const v = value as Record<string, unknown>
  if (!Number.isSafeInteger(v.seq) || (v.seq as number) < 1 || !['look','away','prepare'].includes(String(v.kind))
    || !['begin','returned','failed','rejected','window-ended'].includes(String(v.phase))) return false
  if (v.phase === 'begin' && v.kind === 'look') return validTarget(v.point) && TARGETS.some(t=>t.id===v.target && t.point.every((n,i)=>n===(v.point as number[])[i]))
  return true
}
