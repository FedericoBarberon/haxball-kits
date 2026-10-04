import { AppError } from '../../application/errors'

export interface AsyncStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export class LocalStorageAdapter implements AsyncStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(key) ?? null
    } catch (error) {
      throw new AppError('STORAGE', `Unable to read storage key "${key}".`, { cause: error })
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (!globalThis.localStorage) {
        throw new Error('localStorage is unavailable')
      }
      globalThis.localStorage.setItem(key, value)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('STORAGE', `Unable to write storage key "${key}".`, { cause: error })
    }
  }
}

export async function readJson<T>(
  storage: AsyncStorage,
  key: string,
  fallback: T,
): Promise<T> {
  const raw = await storage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function writeJson<T>(storage: AsyncStorage, key: string, value: T): Promise<void> {
  await storage.setItem(key, JSON.stringify(value))
}
