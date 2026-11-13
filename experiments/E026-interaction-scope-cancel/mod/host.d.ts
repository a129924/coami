declare function trace(message: string): void
declare module 'timer' {
  const Timer: { set(callback: () => void, milliseconds: number): number; clear(id: number): void }
  export default Timer
}
declare module 'face-state' { export const Emotion: { NEUTRAL: 0; HAPPY: 3 } }
