import type { GameBridge, GameBridgeResult } from '../../application/ports'

interface ChromeTabs {
  query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number; url?: string }>>
}

interface ChromeScripting {
  executeScript(details: {
    target: { tabId: number; allFrames: boolean }
    func: (command: string) => InjectedResult
    args: [string]
  }): Promise<Array<{ result?: InjectedResult }>>
}

export interface ChromeApi {
  tabs: ChromeTabs
  scripting: ChromeScripting
}

interface InjectedResult {
  found: boolean
  sent: boolean
}

export const CHAT_INPUT_SELECTOR = 'input[data-hook="input"]'

function injectedSendChat(command: string): InjectedResult {
  // Keep this function self-contained: Chrome serializes it before injecting it into each frame.
  const input = document.querySelector('input[data-hook="input"]') ?? document.querySelector('input')
  if (!(input instanceof HTMLInputElement)) return { found: false, sent: false }

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, command)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.focus()
  for (const type of ['keydown', 'keypress', 'keyup']) {
    input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }))
  }
  return { found: true, sent: true }
}

export class ChromeGameBridge implements GameBridge {
  private readonly chromeApi: ChromeApi

  constructor(chromeApi?: ChromeApi) {
    const browserChrome = (globalThis as typeof globalThis & { chrome?: ChromeApi }).chrome
    this.chromeApi = chromeApi ?? browserChrome ?? {
      tabs: { query: async () => [] },
      scripting: { executeScript: async () => [] },
    }
  }

  async sendChatCommand(command: string): Promise<GameBridgeResult> {
    try {
      const [tab] = await this.chromeApi.tabs.query({ active: true, currentWindow: true })
      const hostname = tab.url ? new URL(tab.url).hostname : ''
      const isHaxballHost = hostname === 'haxball.com' || hostname.endsWith('.haxball.com')
      if (!tab?.id || !tab.url || !isHaxballHost) {
        return { ok: false, reason: 'NO_HAXBALL_TAB' }
      }

      const results = await this.chromeApi.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: injectedSendChat,
        args: [command],
      })
      if (results.some((frame) => frame.result?.sent)) return { ok: true }
      if (results.every((frame) => !frame.result?.found)) return { ok: false, reason: 'CHAT_NOT_FOUND' }
      return { ok: false, reason: 'UNEXPECTED' }
    } catch {
      return { ok: false, reason: 'UNEXPECTED' }
    }
  }

}

export function hasChromeScripting(): boolean {
  const browserChrome = (globalThis as typeof globalThis & { chrome?: ChromeApi }).chrome
  return Boolean(browserChrome?.scripting)
}
