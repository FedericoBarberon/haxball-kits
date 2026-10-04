import type { GameBridge, GameBridgeResult } from '../../application/ports'

export class ConsoleGameBridge implements GameBridge {
  async sendChatCommand(command: string): Promise<GameBridgeResult> {
    console.log('[Haxball Kits] command:', command)
    return { ok: true }
  }
}
