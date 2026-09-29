export type TopZone = 'left' | 'center' | 'right'

export type SurfacePointer = {
  pointerId: number
  isPrimary: boolean
  clientX: number
  clientY: number
  timeStamp: number
}

type ActiveTouch = SurfacePointer & { zone: TopZone; cancelled: boolean }

const positions: Record<TopZone, number> = {
  left: -100,
  center: 0,
  right: 100,
}

/** Browser-side validation; only a completed valid tap reaches the runtime bridge. */
export class TopTouchSurface {
  #active: ActiveTouch | null = null
  #emit: (position: number) => void

  constructor(emit: (position: number) => void) {
    this.#emit = emit
  }

  begin(zone: TopZone, event: SurfacePointer): boolean {
    if (this.#active !== null || !event.isPrimary) return false
    this.#active = { ...event, zone, cancelled: false }
    return true
  }

  move(event: SurfacePointer): void {
    const active = this.#active
    if (!active || active.pointerId !== event.pointerId) return
    if (distance(active, event) > 15) active.cancelled = true
  }

  cancel(event: SurfacePointer): void {
    if (this.#active?.pointerId === event.pointerId) this.#active = null
  }

  end(zone: TopZone | null, event: SurfacePointer): boolean {
    const active = this.#active
    if (!active || active.pointerId !== event.pointerId) return false
    this.#active = null
    const duration = event.timeStamp - active.timeStamp
    if (
      !zone ||
      active.cancelled ||
      zone !== active.zone ||
      !event.isPrimary ||
      duration < 0 ||
      duration > 300 ||
      distance(active, event) > 15
    ) return false
    this.#emit(positions[zone])
    return true
  }
}

function distance(start: Pick<SurfacePointer, 'clientX' | 'clientY'>, end: Pick<SurfacePointer, 'clientX' | 'clientY'>): number {
  return Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY)
}
