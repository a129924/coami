declare function trace(message: string): void
declare module 'wasm-touch-panel-bridge' {
  export function currentTouchMetadata(): { session: number; operation: number; sample: number }
}
