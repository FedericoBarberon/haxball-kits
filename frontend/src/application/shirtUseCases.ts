import { AppError } from './errors'
import type {
  CommunityService,
  FavoriteEntry,
  FavoritesRepository,
  GameBridge,
  ShirtRepository,
} from './ports'
import { buildColorsCommand } from '../domain/haxballCommand'
import type { NewShirt, OwnShirt, Shirt, Team } from '../domain/shirt'
import { validateNewShirt } from '../domain/shirt'

export interface ShirtUseCaseDependencies {
  shirts: ShirtRepository
  favorites: FavoritesRepository
  community: CommunityService
  game: GameBridge
}

export async function createOwnShirt(
  repository: ShirtRepository,
  input: NewShirt,
  now = Date.now(),
  id: string = crypto.randomUUID(),
): Promise<OwnShirt> {
  const validation = validateNewShirt(input)
  if (!validation.valid) {
    throw new AppError('INVALID_INPUT', 'The shirt data is invalid.')
  }

  const shirt: OwnShirt = {
    ...input,
    id,
    createdAt: now,
    published: false,
  }
  await repository.add(shirt)
  return shirt
}

export async function publishOwnShirt(
  repository: ShirtRepository,
  community: CommunityService,
  id: string,
): Promise<OwnShirt> {
  const shirt = await findOwnShirt(repository, id)
  if (shirt.published) {
    return shirt
  }

  const { ownerToken } = await community.publish(shirt)
  const publishedShirt = { ...shirt, published: true, ownerToken }
  await repository.update(publishedShirt)
  return publishedShirt
}

export async function unpublishOwnShirt(
  repository: ShirtRepository,
  community: CommunityService,
  id: string,
): Promise<OwnShirt> {
  const shirt = await findOwnShirt(repository, id)
  if (!shirt.published) {
    return shirt
  }
  if (!shirt.ownerToken) {
    throw new AppError('INVALID_STATE', 'A published shirt is missing its owner token.')
  }

  await community.remove(shirt.id, shirt.ownerToken)
  const unpublishedShirt: OwnShirt = {
    ...shirt,
    published: false,
  }
  delete unpublishedShirt.ownerToken
  await repository.update(unpublishedShirt)
  return unpublishedShirt
}

export async function deleteOwnShirt(
  repository: ShirtRepository,
  favorites: FavoritesRepository,
  community: CommunityService,
  id: string,
): Promise<void> {
  const shirt = await findOwnShirt(repository, id)

  if (shirt.published) {
    if (!shirt.ownerToken) {
      throw new AppError('INVALID_STATE', 'A published shirt is missing its owner token.')
    }
    await community.remove(shirt.id, shirt.ownerToken)
  }

  await favorites.remove(id)
  await repository.remove(id)
}

export async function setFavorite(
  favorites: FavoritesRepository,
  shirt: Shirt,
  source: FavoriteEntry['source'],
  isFavorite: boolean,
  addedAt = Date.now(),
): Promise<void> {
  if (isFavorite) {
    await favorites.add({ shirt, source, addedAt })
  } else {
    await favorites.remove(shirt.id)
  }
}

export async function applyShirt(
  game: GameBridge,
  shirt: Shirt,
  team: Team,
): Promise<void> {
  const result = await game.sendChatCommand(buildColorsCommand(shirt, team))
  if (!result.ok) {
    throw new AppError('GAME', result.reason)
  }
}

export async function findOwnShirt(repository: ShirtRepository, id: string): Promise<OwnShirt> {
  const shirt = (await repository.list()).find((candidate) => candidate.id === id)
  if (!shirt) {
    throw new AppError('NOT_FOUND', `Shirt "${id}" was not found.`)
  }
  return shirt
}
