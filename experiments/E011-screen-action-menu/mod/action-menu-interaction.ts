import type { ActionId } from './action-catalog'

export type Terminal = 'completed' | 'failed' | 'cancelled'
export type Selection = { runSeq: number; actionId: ActionId }
export type Result = { actionId: ActionId; status: Terminal }

type Candidate = { touchId: number; actionId: ActionId | null; startY: number; moved: boolean }
type ActiveRun = Selection

export const TAP_SLOP = 10
export type MenuPhase = 'ready' | 'running' | Terminal

export function menuFooterText(phase: MenuPhase): string {
  return phase === 'running' ? '請等待完成' : '滑動瀏覽，點選執行'
}

/** Keep the hit-test offset aligned with the rows last rendered on cancel. */
export class MenuScrollState {
  private currentOffset = 0
  private gesture: { touchId: number; startY: number; startOffset: number } | null = null
  private readonly maxOffset: number

  constructor(maxOffset: number) { this.maxOffset = maxOffset }

  get offset(): number { return this.currentOffset }

  begin(touchId: number, y: number): boolean {
    if (this.gesture) return false
    this.gesture = { touchId, startY: y, startOffset: this.currentOffset }
    return true
  }

  move(touchId: number, y: number): boolean {
    const gesture = this.gesture
    if (!gesture || gesture.touchId !== touchId || Math.abs(y - gesture.startY) <= TAP_SLOP) return false
    const next = Math.max(0, Math.min(this.maxOffset, gesture.startOffset - (y - gesture.startY)))
    if (next === this.currentOffset) return false
    this.currentOffset = next
    return true
  }

  end(touchId: number): boolean {
    if (this.gesture?.touchId !== touchId) return false
    const scrolled = this.currentOffset !== this.gesture.startOffset
    this.gesture = null
    return scrolled
  }

  cancel(touchId: number): void {
    if (this.gesture?.touchId !== touchId) return
    this.currentOffset = this.gesture.startOffset
    this.gesture = null
  }

  recover(touchId: number): boolean {
    if (this.gesture?.touchId !== touchId) return false
    this.cancel(touchId)
    return true
  }
}

/**
 * The menu accepts only a stationary release on the same visible item.  Gesture
 * classification stays independent of Piu so it can be tested without the MOD runtime.
 */
export class ActionMenuInteraction {
  private candidate: Candidate | null = null
  private activeRun: ActiveRun | null = null
  private sequence = 0
  private lastResult: Result | null = null

  get busy(): boolean { return this.activeRun !== null }
  get result(): Result | null { return this.lastResult }

  begin(touchId: number, actionId: ActionId | null, y: number): boolean {
    if (this.activeRun !== null || (this.candidate !== null && this.candidate.touchId !== touchId)) return false
    // The pinned simulator can end a captured pointer without forwarding a Piu
    // cancel callback. Its next pointer reuses touch ID 0, which starts fresh.
    this.candidate = { touchId, actionId, startY: y, moved: false }
    return true
  }

  move(touchId: number, y: number): void {
    const candidate = this.candidate
    if (!candidate || candidate.touchId !== touchId) return
    if (Math.abs(y - candidate.startY) > TAP_SLOP) candidate.moved = true
  }

  cancel(touchId: number): void {
    if (this.candidate?.touchId === touchId) this.candidate = null
  }

  end(touchId: number, actionId: ActionId | null): Selection | null {
    const candidate = this.candidate
    if (!candidate || candidate.touchId !== touchId) return null
    this.candidate = null
    if (candidate.moved || candidate.actionId === null || candidate.actionId !== actionId || this.activeRun !== null) return null
    this.lastResult = null
    this.activeRun = { runSeq: ++this.sequence, actionId }
    return this.activeRun
  }

  finish(runSeq: number, actionId: ActionId, status: Terminal): Terminal | null {
    if (!this.activeRun || this.activeRun.runSeq !== runSeq || this.activeRun.actionId !== actionId) return null
    this.activeRun = null
    this.lastResult = { actionId, status }
    return status
  }

  restart(): void {
    this.candidate = null
    this.activeRun = null
    this.lastResult = null
  }
}
