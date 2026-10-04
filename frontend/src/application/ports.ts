import type { OwnShirt, Shirt } from '../domain/shirt'

export interface ShirtRepository {
  list(): Promise<OwnShirt[]>
  add(shirt: OwnShirt): Promise<void>
  update(shirt: OwnShirt): Promise<void>
  remove(id: string): Promise<void>
}

export interface FavoriteEntry {
  shirt: Shirt
  source: 'own' | 'community'
  addedAt: number
}

export interface FavoritesRepository {
  list(): Promise<FavoriteEntry[]>
  add(entry: FavoriteEntry): Promise<void>
  remove(id: string): Promise<void>
}

export interface Page<T> {
  items: T[]
  total: number
}

export interface CommunityService {
  list(params: { page: number; pageSize: number }): Promise<Page<Shirt>>
  publish(shirt: Shirt): Promise<{ ownerToken: string }>
  remove(id: string, ownerToken: string): Promise<void>
}

export type GameBridgeResult =
  | { ok: true }
  | { ok: false; reason: 'NO_HAXBALL_TAB' | 'CHAT_NOT_FOUND' | 'UNEXPECTED' }

export interface GameBridge {
  sendChatCommand(command: string): Promise<GameBridgeResult>
}
