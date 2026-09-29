declare module 'timer' {
  const Timer: { set(callback: () => void, milliseconds: number): unknown }
  export default Timer
}

declare module 'face-state' {
  export const Emotion: { readonly NEUTRAL: 0; readonly HAPPY: 3 }
}

declare module 'piu/MC' {}

declare class Behavior {}
declare class Skin { constructor(options: Record<string, unknown>) }
declare class Style { constructor(options: Record<string, unknown>) }
type PiuContainer = { readonly name?: string }
declare class Container implements PiuContainer { constructor(data: unknown, options: Record<string, unknown>) }
declare class Label { constructor(data: unknown, options: Record<string, unknown>) }
declare function trace(message: string): void
