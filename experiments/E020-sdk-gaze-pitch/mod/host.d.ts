declare module 'timer' { const Timer: { set(callback: () => void, milliseconds: number): unknown }; export default Timer }
declare function trace(message: string): void
