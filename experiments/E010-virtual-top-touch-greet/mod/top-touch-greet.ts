export type TouchPanelEvent = {
  kind: string
  gesture: string
  position: number
  intensity: number
  ticks: number
  tap?: {
    position: number
    durationMs: number
    maxMovement: number
  }
}

export type Terminal = 'completed' | 'failed'
export type TopTouchZone = 'left' | 'center' | 'right'

const zones = new Map<number, TopTouchZone>([
  [-100, 'left'],
  [0, 'center'],
  [100, 'right'],
])

/** Owns one accepted top-touch greet until its matching terminal is observed. */
export class TopTouchGreet {
  #activeRun: number | null = null
  #lastTicks = -1
  #result: Terminal | null = null
  #sequence = 0

  get busy(): boolean {
    return this.#activeRun !== null
  }

  get result(): Terminal | null {
    return this.#result
  }

  accept(event: TouchPanelEvent): { run: number; zone: TopTouchZone } | null {
    if (!Number.isFinite(event.ticks) || event.ticks <= this.#lastTicks) return null
    this.#lastTicks = event.ticks
    if (this.#activeRun !== null || event.kind !== 'touch-panel' || event.gesture !== 'release') return null
    const tap = event.tap
    if (!tap || !Number.isFinite(tap.durationMs) || !Number.isFinite(tap.maxMovement)) return null
    const zone = zones.get(tap.position)
    if (!zone || tap.durationMs < 0 || tap.durationMs > 300 || tap.maxMovement < 0 || tap.maxMovement > 15) return null

    this.#result = null
    this.#activeRun = ++this.#sequence
    return { run: this.#activeRun, zone }
  }

  finish(run: number, terminal: Terminal): Terminal | null {
    if (this.#activeRun !== run) return null
    this.#activeRun = null
    this.#result = terminal
    return terminal
  }
}
