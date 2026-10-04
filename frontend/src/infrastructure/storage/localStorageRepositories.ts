import type { FavoriteEntry, FavoritesRepository, ShirtRepository } from '../../application/ports'
import type { OwnShirt } from '../../domain/shirt'
import { LocalStorageAdapter, readJson, writeJson, type AsyncStorage } from './storage'

const SHIRTS_KEY = 'hk:shirts:v1'
const FAVORITES_KEY = 'hk:favorites:v1'

abstract class JsonListRepository<T> {
  private readonly storage: AsyncStorage
  private readonly key: string

  protected constructor(
    storage: AsyncStorage,
    key: string,
  ) {
    this.storage = storage
    this.key = key
  }

  protected async read(): Promise<T[]> {
    const value = await readJson<unknown>(this.storage, this.key, [])
    return Array.isArray(value) ? value as T[] : []
  }

  protected async write(items: T[]): Promise<void> {
    await writeJson(this.storage, this.key, items)
  }
}

export class LocalStorageShirtRepository
  extends JsonListRepository<OwnShirt>
  implements ShirtRepository
{
  constructor(storage: AsyncStorage = new LocalStorageAdapter()) {
    super(storage, SHIRTS_KEY)
  }

  async list(): Promise<OwnShirt[]> {
    const shirts = await this.read()
    return shirts
      .filter((shirt) => typeof shirt?.createdAt === 'number')
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async add(shirt: OwnShirt): Promise<void> {
    const shirts = await this.read()
    await this.write([shirt, ...shirts.filter((item) => item.id !== shirt.id)])
  }

  async update(shirt: OwnShirt): Promise<void> {
    const shirts = await this.read()
    await this.write(shirts.map((item) => (item.id === shirt.id ? shirt : item)))
  }

  async remove(id: string): Promise<void> {
    const shirts = await this.read()
    await this.write(shirts.filter((shirt) => shirt.id !== id))
  }
}

export class LocalStorageFavoritesRepository
  extends JsonListRepository<FavoriteEntry>
  implements FavoritesRepository
{
  constructor(storage: AsyncStorage = new LocalStorageAdapter()) {
    super(storage, FAVORITES_KEY)
  }

  async list(): Promise<FavoriteEntry[]> {
    const entries = await this.read()
    return entries.sort((a, b) => b.addedAt - a.addedAt)
  }

  async add(entry: FavoriteEntry): Promise<void> {
    const entries = await this.read()
    await this.write([entry, ...entries.filter((item) => item.shirt.id !== entry.shirt.id)])
  }

  async remove(id: string): Promise<void> {
    const entries = await this.read()
    await this.write(entries.filter((entry) => entry.shirt.id !== id))
  }
}
