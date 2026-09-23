declare module 'timer' {
  const Timer: { set(callback: () => void, milliseconds: number): unknown }
  export default Timer
}

declare module 'face-state' {
  export const Emotion: { readonly NEUTRAL: 0; readonly HAPPY: 3 }
}

declare function trace(message: string): void
