export type TopTouchPosition = -100 | 0 | 100

export type TopTouchSwipeDirection = 'forward' | 'backward'

export interface HostTopTouchBridge {
  tap(position: number): boolean
  swipe(direction: TopTouchSwipeDirection): void
  read(index: number): number
  ticks(): number
}

export function createHostTopTouchBridge(): HostTopTouchBridge
