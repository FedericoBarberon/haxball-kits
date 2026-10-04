import { useCallback, useEffect, useRef, useState } from 'react'
import type { ShirtUseCaseDependencies } from '../../application/shirtUseCases'
import type { FavoriteEntry } from '../../application/ports'
import type { OwnShirt, Shirt } from '../../domain/shirt'

export type ListTab = 'myShirts' | 'community' | 'favorites'

interface ListState {
  items: Array<Shirt | OwnShirt>
  favorites: FavoriteEntry[]
  ownShirts: OwnShirt[]
  page: number
  totalPages: number
  loading: boolean
  error: Error | null
}

const PAGE_SIZE = 12
const PAGE_TRANSITION_MS = 150

export function useShirtLists(tab: ListTab, dependencies: ShirtUseCaseDependencies): ListState & {
  setPage: (page: number) => void
  reload: () => void
  updateFavorite: (shirt: Shirt, source: FavoriteEntry['source'], isFavorite: boolean) => void
} {
  const [state, setState] = useState<ListState>({
    items: [],
    favorites: [],
    ownShirts: [],
    page: 1,
    totalPages: 1,
    loading: true,
    error: null,
  })
  const [reloadToken, setReloadToken] = useState(0)
  const contextRef = useRef('')

  const setPage = useCallback((page: number) => {
    setState((current) => ({
      ...current,
      page,
      loading: true,
      error: null,
    }))
    if (tab !== 'community') {
      window.setTimeout(() => {
        setState((current) => ({ ...current, loading: false }))
      }, PAGE_TRANSITION_MS)
    }
  }, [tab])

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  const updateFavorite = useCallback((
    shirt: Shirt,
    source: FavoriteEntry['source'],
    isFavorite: boolean,
  ) => {
    setState((current) => {
      const favorites = isFavorite
        ? [
            { shirt, source, addedAt: Date.now() },
            ...current.favorites.filter((entry) => entry.shirt.id !== shirt.id),
          ]
        : current.favorites.filter((entry) => entry.shirt.id !== shirt.id)
      const items = tab === 'favorites'
        ? current.items.filter((item) => isFavorite || item.id !== shirt.id)
        : current.items
      const totalPages = tab === 'favorites'
        ? Math.max(1, Math.ceil(items.length / PAGE_SIZE))
        : current.totalPages

      return { ...current, favorites, items, totalPages }
    })
  }, [tab])

  useEffect(() => {
    let cancelled = false

    const loadLocalLists = async () => {
      try {
        const [ownShirts, favorites] = await Promise.all([
          dependencies.shirts.list(),
          dependencies.favorites.list(),
        ])
        const source = tab === 'myShirts' ? ownShirts : favorites
        if (!cancelled) {
          setState((current) => ({
            ...current,
            items: tab === 'myShirts' ? ownShirts : favorites.map((entry) => entry.shirt),
            ownShirts,
            favorites,
            page: 1,
            totalPages: Math.max(1, Math.ceil(source.length / PAGE_SIZE)),
            loading: false,
            error: null,
          }))
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error ? error : new Error('Unknown list error'),
          }))
        }
      }
    }

    if (tab !== 'community') {
      setState((current) => ({ ...current, loading: true, error: null }))
      void loadLocalLists()
    }

    return () => {
      cancelled = true
    }
  }, [dependencies, reloadToken, tab])

  useEffect(() => {
    if (tab !== 'community') return

    const context = `${tab}:${reloadToken}`
    if (contextRef.current !== context && state.page !== 1) {
      contextRef.current = context
      setState((current) => ({ ...current, page: 1 }))
      return
    }
    contextRef.current = context

    let cancelled = false
    setState((current) => ({ ...current, loading: true, error: null }))
    const loadPage = async () => {
      try {
        const [result, ownShirts, favorites] = await Promise.all([
          dependencies.community.list({ page: state.page, pageSize: PAGE_SIZE }),
          dependencies.shirts.list(),
          dependencies.favorites.list(),
        ])
        if (!cancelled) {
          setState((current) => ({
            ...current,
            items: result.items,
            ownShirts,
            favorites,
            totalPages: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
            loading: false,
            error: null,
          }))
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error ? error : new Error('Unknown list error'),
          }))
        }
      }
    }
    void loadPage()
    return () => {
      cancelled = true
    }
  }, [dependencies, reloadToken, state.page, tab])

  const pagedItems = tab === 'community'
    ? state.items
    : state.items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE)

  return { ...state, items: pagedItems, setPage, reload, updateFavorite }
}
