import type { ShirtUseCaseDependencies } from './application/shirtUseCases'
import { HttpCommunityService } from './infrastructure/community/httpCommunityService'
import { MockCommunityService } from './infrastructure/community/mockCommunityService'
import { ChromeGameBridge, hasChromeScripting } from './infrastructure/game/chromeGameBridge'
import { ConsoleGameBridge } from './infrastructure/game/consoleGameBridge'
import { LocalStorageFavoritesRepository, LocalStorageShirtRepository } from './infrastructure/storage/localStorageRepositories'

const community = import.meta.env.VITE_COMMUNITY_BACKEND === 'http'
  ? new HttpCommunityService(import.meta.env.VITE_API_BASE_URL ?? '')
  : new MockCommunityService()

export const dependencies: ShirtUseCaseDependencies = {
  shirts: new LocalStorageShirtRepository(),
  favorites: new LocalStorageFavoritesRepository(),
  community,
  game: hasChromeScripting() ? new ChromeGameBridge() : new ConsoleGameBridge(),
}
