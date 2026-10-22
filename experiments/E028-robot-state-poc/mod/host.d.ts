declare function trace(message: string): void
declare module "timer" { const Timer: { set(callback: () => void, milliseconds: number): unknown }; export default Timer }
