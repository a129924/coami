export type Terminal = 'completed' | 'failed' | 'cancelled'

type Press = { id: number; x: number; y: number }

/** A single accepted screen tap owns one run until its matching terminal arrives. */
export class GreetInteraction {
  private press: Press | null = null
  private activeRun: number | null = null
  private sequence = 0
  private terminal: Terminal | null = null

  get result(): Terminal | null { return this.terminal }
  get busy(): boolean { return this.activeRun !== null }

  begin(touchId: number, x: number, y: number): boolean {
    if (this.activeRun !== null || this.press !== null) return false
    this.press = { id: touchId, x, y }
    return true
  }

  move(touchId: number, x: number, y: number): void {
    const press = this.press
    if (!press || press.id !== touchId) return
    if (Math.abs(x - press.x) > 8 || Math.abs(y - press.y) > 8) this.press = null
  }

  cancel(touchId: number): void {
    if (this.press?.id === touchId) this.press = null
  }

  end(touchId: number): number | null {
    const press = this.press
    if (!press || press.id !== touchId) return null
    this.press = null
    if (this.activeRun !== null) return null
    this.terminal = null
    this.activeRun = ++this.sequence
    return this.activeRun
  }

  finish(runSeq: number, terminal: Terminal): Terminal | null {
    if (this.activeRun !== runSeq) return null
    this.activeRun = null
    this.terminal = terminal
    return terminal
  }

  restart(): void {
    this.press = null
    this.activeRun = null
    this.terminal = null
  }
}
