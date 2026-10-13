export type StoredMod = { name: string; bytes: Uint8Array; size: number; storage: 'memory' }
export class SimulatorEngine {
  constructor(options: {
    viewport: HTMLCanvasElement; screen: HTMLCanvasElement; runtimeBaseUrl: string;
    modStorage: { loadInstalledMod(): Promise<StoredMod>; saveInstalledMod(mod: StoredMod): Promise<StoredMod>; clearInstalledMod(): Promise<void> };
    onStatus?(value: { status: string; code: string }): void;
    onTrace?(line: string): void;
    onReady?(value: { installationStatus: string }): void;
    onError?(error: unknown): void;
  })
  hostBridge: Record<string, unknown>
  start(): Promise<void>
  dispose(): void
}
