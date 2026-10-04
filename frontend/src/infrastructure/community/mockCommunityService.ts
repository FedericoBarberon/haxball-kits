import { AppError } from '../../application/errors'
import type { CommunityService, Page } from '../../application/ports'
import type { Shirt } from '../../domain/shirt'
import { LocalStorageAdapter, readJson, writeJson, type AsyncStorage } from '../storage/storage'
import { communitySeed } from './seed'

const COMMUNITY_KEY = 'hk:mock-community:v1'

export class MockCommunityService implements CommunityService {
  private items: Shirt[]
  private tokens = new Map<string, string>()
  private readonly storage: AsyncStorage
  private readonly delayMs: number

  constructor(
    storage: AsyncStorage = new LocalStorageAdapter(),
    delayMs = 400,
    initialItems?: Shirt[],
  ) {
    this.storage = storage
    this.delayMs = delayMs
    this.items = initialItems ? [...initialItems] : [...communitySeed]
  }

  async list(params: { page: number; pageSize: number }): Promise<Page<Shirt>> {
    await this.delay()
    this.validatePageParams(params)
    await this.loadPersisted()
    const sorted = this.sortedItems()
    const start = (params.page - 1) * params.pageSize
    return { items: sorted.slice(start, start + params.pageSize), total: sorted.length }
  }

  async publish(shirt: Shirt): Promise<{ ownerToken: string }> {
    await this.delay()
    await this.loadPersisted()
    if (this.items.some((item) => item.id === shirt.id)) {
      throw new AppError('INVALID_STATE', 'This shirt is already published.')
    }
    this.items.push({ ...shirt })
    const ownerToken = crypto.randomUUID()
    this.tokens.set(shirt.id, ownerToken)
    await this.persist()
    return { ownerToken }
  }

  async remove(id: string, ownerToken: string): Promise<void> {
    await this.delay()
    await this.loadPersisted()
    const index = this.items.findIndex((item) => item.id === id)
    if (index < 0) throw new AppError('NOT_FOUND', 'Community shirt was not found.')
    if (!ownerToken || this.tokens.get(id) !== ownerToken) {
      throw new AppError('INVALID_INPUT', 'Owner token is invalid.')
    }
    this.items.splice(index, 1)
    this.tokens.delete(id)
    await this.persist()
  }

  private async loadPersisted(): Promise<void> {
    const persisted = await readJson<unknown>(this.storage, COMMUNITY_KEY, null)
    if (Array.isArray(persisted)) {
      this.items = persisted as Shirt[]
      return
    }
    if (persisted && typeof persisted === 'object' && 'items' in persisted) {
      const state = persisted as { items?: unknown; tokens?: unknown }
      if (Array.isArray(state.items)) this.items = state.items as Shirt[]
      if (state.tokens && typeof state.tokens === 'object') {
        this.tokens = new Map(Object.entries(state.tokens as Record<string, string>))
      }
    }
  }

  private async persist(): Promise<void> {
    await writeJson(this.storage, COMMUNITY_KEY, {
      items: this.items,
      tokens: Object.fromEntries(this.tokens),
    })
  }

  private sortedItems(): Shirt[] {
    return [...this.items].sort((a, b) => b.createdAt - a.createdAt)
  }

  private validatePageParams(params: { page: number; pageSize: number }): void {
    if (!Number.isInteger(params.page) || params.page < 1 || !Number.isInteger(params.pageSize) || params.pageSize < 1) {
      throw new AppError('INVALID_INPUT', 'Page and page size must be positive integers.')
    }
  }

  private async delay(): Promise<void> {
    const delay = this.delayMs === 400
      ? 300 + Math.floor(Math.random() * 301)
      : this.delayMs
    await new Promise<void>((resolve) => setTimeout(resolve, delay))
  }
}
