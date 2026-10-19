declare function trace(message: string): void
interface VoiceBridge {
  exchange(recorded: ArrayBuffer): Promise<ArrayBuffer>
  checkTts(phrase: 'A' | 'B'): Promise<ArrayBuffer>
}
declare var __coamiVoiceTurnBridge: VoiceBridge
