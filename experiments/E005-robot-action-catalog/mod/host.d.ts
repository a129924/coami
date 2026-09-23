declare module 'timer' {
  const Timer: { set(callback: () => void, milliseconds: number): unknown; clear(handle: unknown): void }
  export default Timer
}

declare module 'face-state' {
  export const Emotion: {
    readonly NEUTRAL: 0
    readonly ANGRY: 1
    readonly SAD: 2
    readonly HAPPY: 3
    readonly SLEEPY: 4
    readonly DOUBTFUL: 5
    readonly COLD: 6
    readonly HOT: 7
  }
}

declare function trace(message: string): void
