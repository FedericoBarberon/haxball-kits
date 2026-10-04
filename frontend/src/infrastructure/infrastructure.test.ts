import { describe, expect, it, vi } from 'vitest'
import type { AsyncStorage } from './storage/storage'
import { LocalStorageFavoritesRepository, LocalStorageShirtRepository } from './storage/localStorageRepositories'
import { MockCommunityService } from './community/mockCommunityService'
import { HttpCommunityService } from './community/httpCommunityService'
import { ChromeGameBridge, type ChromeApi } from './game/chromeGameBridge'
import type { OwnShirt } from '../domain/shirt'

function memoryStorage(): AsyncStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value)
    },
  }
}

const shirt: OwnShirt = {
  id: 'shirt-1',
  name: 'Local',
  angle: 12,
  textColor: '#FFFFFF',
  colors: ['#D64545'],
  createdAt: 20,
  published: false,
}

describe('infrastructure adapters', () => {
  it('returns an empty list for missing or corrupt local data', async () => {
    const storage = memoryStorage()
    storage.values.set('hk:shirts:v1', '{bad json')
    const repository = new LocalStorageShirtRepository(storage)

    expect(await repository.list()).toEqual([])
  })

  it('sorts and deduplicates local shirts and favorites', async () => {
    const storage = memoryStorage()
    const shirts = new LocalStorageShirtRepository(storage)
    await shirts.add({ ...shirt, createdAt: 1 })
    await shirts.add({ ...shirt, createdAt: 3, name: 'Newest' })
    expect((await shirts.list()).map((item) => item.name)).toEqual(['Newest'])

    const favorites = new LocalStorageFavoritesRepository(storage)
    await favorites.add({ shirt, source: 'own', addedAt: 1 })
    await favorites.add({ shirt: { ...shirt, name: 'Updated' }, source: 'own', addedAt: 2 })
    expect((await favorites.list())[0].shirt.name).toBe('Updated')
  })

  it('publishes and enforces the mock owner token', async () => {
    const storage = memoryStorage()
    const service = new MockCommunityService(storage, 0, [])
    const { ownerToken } = await service.publish(shirt)

    await expect(service.remove(shirt.id, 'wrong-token')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    await service.remove(shirt.id, ownerToken)
    expect((await service.list({ page: 1, pageSize: 12 })).total).toBe(0)
  })

  it('maps HTTP community requests and errors', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.example/shirts?page=1&pageSize=12')
      expect(init).toBeUndefined()
      return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })
    })
    const service = new HttpCommunityService('https://api.example', fetcher)
    expect(await service.list({ page: 1, pageSize: 12 })).toEqual({ items: [], total: 0 })

    const failing = new HttpCommunityService('https://api.example', async () => new Response(
      JSON.stringify({ error: 'missing' }),
      { status: 404 },
    ))
    await expect(failing.list({ page: 1, pageSize: 12 })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('executes the command in every frame on a Haxball host', async () => {
    let capturedDetails: Parameters<ChromeApi['scripting']['executeScript']>[0] | undefined
    const executeScript = vi.fn(async (details: Parameters<ChromeApi['scripting']['executeScript']>[0]) => {
      capturedDetails = details
      return [{ result: { found: true, sent: true } }]
    })
    const api: ChromeApi = {
      tabs: { query: vi.fn(async () => [{ id: 7, url: 'https://www.haxball.com/play' }]) },
      scripting: { executeScript },
    }
    const bridge = new ChromeGameBridge(api)
    expect(await bridge.sendChatCommand('/colors red 0 FF0000 FFFFFF')).toEqual({ ok: true })
    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({
      target: { tabId: 7, allFrames: true },
      args: ['/colors red 0 FF0000 FFFFFF'],
    }))
    expect(capturedDetails).toBeDefined()
    expect(capturedDetails?.func.toString()).not.toContain('CHAT_INPUT_SELECTOR')
  })

  it('returns NO_HAXBALL_TAB for a non-Haxball host', async () => {
    const executeScript = vi.fn(async () => [])
    const api: ChromeApi = {
      tabs: { query: vi.fn(async () => [{ id: 7, url: 'https://not-haxball.com/play' }]) },
      scripting: { executeScript },
    }
    expect(await new ChromeGameBridge(api).sendChatCommand('/colors red 0 FF0000 FFFFFF'))
      .toEqual({ ok: false, reason: 'NO_HAXBALL_TAB' })
    expect(executeScript).not.toHaveBeenCalled()
  })

  it('returns CHAT_NOT_FOUND when no frame finds the input', async () => {
    const api: ChromeApi = {
      tabs: { query: vi.fn(async () => [{ id: 7, url: 'https://haxball.com/play' }]) },
      scripting: { executeScript: vi.fn(async () => [{ result: { found: false, sent: false } }]) },
    }
    expect(await new ChromeGameBridge(api).sendChatCommand('/colors red 0 FF0000 FFFFFF'))
      .toEqual({ ok: false, reason: 'CHAT_NOT_FOUND' })
  })

  it('returns UNEXPECTED when Chrome execution throws', async () => {
    const api: ChromeApi = {
      tabs: { query: vi.fn(async () => [{ id: 7, url: 'https://haxball.com/play' }]) },
      scripting: { executeScript: vi.fn(async () => { throw new Error('permission denied') }) },
    }
    expect(await new ChromeGameBridge(api).sendChatCommand('/colors red 0 FF0000 FFFFFF'))
      .toEqual({ ok: false, reason: 'UNEXPECTED' })
  })
})
