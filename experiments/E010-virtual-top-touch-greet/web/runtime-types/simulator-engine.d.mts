import type { HostTopTouchBridge } from '../../../simulator/bridge.d.mts'

export interface WasmHostBridge {
  Button: unknown
  TopTouchPanel: HostTopTouchBridge
  AudioOut: unknown
  AudioIn: unknown
  Camera: unknown
  Driver: unknown
}

export interface WasmHostBridgeOptions {
  buttonBridge: { Button: unknown }
  topTouchBridge: HostTopTouchBridge
  audioOutBridge: unknown
  audioInBridge: unknown
  cameraBridge: unknown
  driverBridge: unknown
}

export function createWasmHostBridge(options: WasmHostBridgeOptions): WasmHostBridge

export function updateTopTouchBusy(bridge: HostTopTouchBridge, rawTrace: string): void

export class SimulatorEngine {
  constructor(options: unknown)
  start(): Promise<void>
  dispose(): void
  pushTopTouch(position: number): boolean
}
