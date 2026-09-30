import type { TopZone } from './top-touch-surface.ts'

export type PointerCoordinates = Pick<PointerEvent, 'clientX' | 'clientY'>

/** Resolves the release zone from pointer coordinates, not the captured event target. */
export function releaseZoneAt(
  event: PointerCoordinates,
  zoneAtPoint: (clientX: number, clientY: number) => string | undefined,
): TopZone | null {
  const zone = zoneAtPoint(event.clientX, event.clientY)
  return zone === 'left' || zone === 'center' || zone === 'right' ? zone : null
}
