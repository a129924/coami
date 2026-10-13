export type Point = [number, number, number]
export const TARGETS: readonly { id: string; label: string; point: Point }[] = [
  { id: 'left', label: 'Robot 左', point: [0.5, 0.5, 0] },
  { id: 'right', label: 'Robot 右', point: [0.5, -0.5, 0] },
  { id: 'up', label: '上', point: [0.5, 0, 0.5] },
  { id: 'down', label: '下', point: [0.5, 0, -0.5] },
]
export type Kind = 'look' | 'away' | 'prepare'
export type GazeEvent = { seq: number; kind: Kind; phase: 'begin' | 'returned' | 'failed' | 'rejected' | 'window-ended';
  target?: string; point?: Point; error?: string }
export type Motion = { lookAt(point: Point): void; lookAway(): void;
  setPose(pose: { rotation: { y: number; p: number; r: number } }, duration: number): Promise<void> }
export function validTarget(value: unknown): value is Point {
  return Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number' && Number.isFinite(v))
    && value.some(v => v !== 0) && TARGETS.some(t => t.point.every((v, i) => v === value[i]))
}
// Observation windows serialize evidence; they do not assert SDK completion.
export class GazeControl {
  private motion: Motion
  private emit: (event: GazeEvent) => void
  private later: (done: () => void) => void
  private seq = 0
  busy = false
  constructor(motion: Motion, emit: (event: GazeEvent) => void, later: (done: () => void) => void) {
    this.motion = motion; this.emit = emit; this.later = later
  }
  async run(kind: Kind, target?: string): Promise<void> {
    const seq = ++this.seq
    const preset = TARGETS.find(t => t.id === target)
    const base = { seq, kind, ...(kind === 'look' && preset ? { target: preset.id, point: [...preset.point] as Point } : {}) }
    if (this.busy || (kind === 'look' && (!preset || !validTarget(preset.point)))) {
      this.emit({ ...base, phase: 'rejected', error: this.busy ? 'observation window busy' : 'invalid target' }); return
    }
    this.busy = true
    this.emit({ ...base, phase: 'begin' })
    try {
      if (kind === 'look') this.motion.lookAt([...preset!.point])
      else if (kind === 'away') this.motion.lookAway()
      else { this.motion.lookAway(); await this.motion.setPose({ rotation: { y: 0, p: 0, r: 0 } }, 0.5) }
      this.emit({ ...base, phase: 'returned' })
    } catch (error) { this.emit({ ...base, phase: 'failed', error: String(error) }) }
    this.later(() => { this.busy = false; this.emit({ ...base, phase: 'window-ended' }) })
  }
}
