declare module '*simulator-engine.mjs' {
  export class SimulatorEngine {
    constructor(options: Record<string, unknown>)
    start(): Promise<void>
    dispose(): void
  }
}
