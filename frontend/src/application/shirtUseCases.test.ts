import { describe, expect, it, vi } from 'vitest'
import { AppError } from './errors'
import { applyShirt, createOwnShirt, deleteOwnShirt, publishOwnShirt, unpublishOwnShirt } from './shirtUseCases'
import type { CommunityService, FavoritesRepository, GameBridge, ShirtRepository } from './ports'
import type { OwnShirt } from '../domain/shirt'

function shirtRepository(initial: OwnShirt[] = []): ShirtRepository & { items: OwnShirt[] } {
  const repository = {
    items: [...initial],
    list: vi.fn(async () => repository.items),
    add: vi.fn(async (shirt: OwnShirt) => {
      repository.items.push(shirt)
    }),
    update: vi.fn(async (shirt: OwnShirt) => {
      repository.items = repository.items.map((item) => (item.id === shirt.id ? shirt : item))
    }),
    remove: vi.fn(async (id: string) => {
      repository.items = repository.items.filter((item) => item.id !== id)
    }),
  }
  return repository
}

function favoritesRepository(): FavoritesRepository & { removed: string[] } {
  const repository: FavoritesRepository & { removed: string[] } = {
    removed: [] as string[],
    list: vi.fn(async () => []),
    add: vi.fn(async () => undefined),
    remove: vi.fn(async (id: string): Promise<void> => {
      repository.removed.push(id)
    }),
  }
  return repository
}

const community = (overrides: Partial<CommunityService> = {}): CommunityService => ({
  list: vi.fn(async () => ({ items: [], total: 0 })),
  publish: vi.fn(async () => ({ ownerToken: 'token-1' })),
  remove: vi.fn(async () => undefined),
  ...overrides,
})

const game: GameBridge = {
  sendChatCommand: vi.fn(async (): Promise<{ ok: true }> => ({ ok: true })),
}

describe('shirt use cases', () => {
  it('creates a valid local shirt', async () => {
    const repository = shirtRepository()
    const result = await createOwnShirt(repository, {
      name: 'Mi camiseta',
      angle: 0,
      textColor: '#FFFFFF',
      colors: ['#FF0000'],
    }, 100, 'shirt-1')

    expect(result).toMatchObject({ id: 'shirt-1', createdAt: 100, published: false })
    expect(repository.add).toHaveBeenCalledWith(result)
  })

  it('rejects invalid shirt data', async () => {
    await expect(createOwnShirt(shirtRepository(), {
      name: ' ',
      angle: 360,
      textColor: '#FFFFFF',
      colors: [],
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('publishes and persists the owner token', async () => {
    const own: OwnShirt = { id: 'shirt-1', name: 'Test', angle: 0, textColor: '#FFFFFF', colors: ['#FF0000'], createdAt: 1, published: false }
    const repository = shirtRepository([own])
    const result = await publishOwnShirt(repository, community(), own.id)

    expect(result).toMatchObject({ published: true, ownerToken: 'token-1' })
    expect(repository.update).toHaveBeenCalledWith(result)
  })

  it('deletes remotely before favorites and local data', async () => {
    const own: OwnShirt = { id: 'shirt-1', name: 'Test', angle: 0, textColor: '#FFFFFF', colors: ['#FF0000'], createdAt: 1, published: true, ownerToken: 'token-1' }
    const repository = shirtRepository([own])
    const favorites = favoritesRepository()
    const remote = vi.fn(async () => undefined)
    await deleteOwnShirt(repository, favorites, community({ remove: remote }), own.id)

    expect(remote).toHaveBeenCalledWith('shirt-1', 'token-1')
    expect(favorites.remove).toHaveBeenCalledWith('shirt-1')
    expect(repository.remove).toHaveBeenCalledWith('shirt-1')
    expect(remote.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(favorites.remove).mock.invocationCallOrder[0])
    expect(vi.mocked(favorites.remove).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(repository.remove).mock.invocationCallOrder[0])
  })

  it('unpublishes remotely and clears the local publication state', async () => {
    const own: OwnShirt = { id: 'shirt-1', name: 'Test', angle: 0, textColor: '#FFFFFF', colors: ['#FF0000'], createdAt: 1, published: true, ownerToken: 'token-1' }
    const repository = shirtRepository([own])
    const remote = vi.fn(async () => undefined)
    const result = await unpublishOwnShirt(repository, community({ remove: remote }), own.id)

    expect(remote).toHaveBeenCalledWith('shirt-1', 'token-1')
    expect(result).toMatchObject({ published: false })
    expect(result.ownerToken).toBeUndefined()
    expect(repository.update).toHaveBeenCalledWith(result)
  })

  it('does not change local publication state when unpublishing fails', async () => {
    const own: OwnShirt = { id: 'shirt-1', name: 'Test', angle: 0, textColor: '#FFFFFF', colors: ['#FF0000'], createdAt: 1, published: true, ownerToken: 'token-1' }
    const repository = shirtRepository([own])
    await expect(unpublishOwnShirt(repository, community({
      remove: vi.fn(async () => { throw new AppError('NETWORK', 'offline') }),
    }), own.id)).rejects.toMatchObject({ code: 'NETWORK' })

    expect(repository.update).not.toHaveBeenCalled()
    expect(repository.items[0]).toEqual(own)
  })

  it('aborts deletion when remote removal fails', async () => {
    const own: OwnShirt = { id: 'shirt-1', name: 'Test', angle: 0, textColor: '#FFFFFF', colors: ['#FF0000'], createdAt: 1, published: true, ownerToken: 'token-1' }
    const repository = shirtRepository([own])
    const favorites = favoritesRepository()
    await expect(deleteOwnShirt(repository, favorites, community({
      remove: vi.fn(async () => { throw new AppError('NETWORK', 'offline') }),
    }), own.id)).rejects.toMatchObject({ code: 'NETWORK' })

    expect(favorites.remove).not.toHaveBeenCalled()
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('applies a shirt through the game bridge', async () => {
    const own: OwnShirt = { id: 'shirt-1', name: 'Test', angle: 45, textColor: '#000000', colors: ['#FFFFFF'], createdAt: 1, published: false }
    await applyShirt(game, own, 'blue')
    expect(game.sendChatCommand).toHaveBeenCalledWith('/colors blue 45 000000 FFFFFF')
  })
})
