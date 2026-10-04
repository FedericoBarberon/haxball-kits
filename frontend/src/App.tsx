import { useState } from 'react'
import { AppError } from './application/errors'
import { applyShirt, createOwnShirt, deleteOwnShirt, publishOwnShirt, setFavorite, unpublishOwnShirt } from './application/shirtUseCases'
import type { NewShirt, OwnShirt, Shirt, Team } from './domain/shirt'
import { Pagination } from './ui/components/Pagination'
import { Logo } from './ui/components/Logo'
import { ShirtGrid } from './ui/components/ShirtGrid'
import { Toast } from './ui/components/Toast'
import { ViewState } from './ui/components/ViewState'
import { useShirtLists, type ListTab } from './ui/hooks/useShirtLists'
import { strings } from './ui/strings'
import { CreateView } from './ui/views/CreateView'
import { ConfirmDialog } from './ui/components/ConfirmDialog'

type TabId = 'myShirts' | 'create' | 'community' | 'favorites'
const listTabs: ListTab[] = ['myShirts', 'community', 'favorites']
const tabs: { id: TabId; label: string }[] = [
  { id: 'myShirts', label: strings.tabs.myShirts },
  { id: 'create', label: strings.tabs.create },
  { id: 'community', label: strings.tabs.community },
  { id: 'favorites', label: strings.tabs.favorites },
]

interface AppProps {
  dependencies: typeof import('./composition').dependencies
}

function App({ dependencies }: AppProps) {
  const [activeTab, setActiveTab] = useState<TabId>('myShirts')
  const [toast, setToast] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ message: string; action: () => Promise<void> } | null>(null)
  const list = useShirtLists(
    listTabs.includes(activeTab as ListTab) ? activeTab as ListTab : 'myShirts',
    dependencies,
  )

  const showError = (error: unknown) => {
    const code = error instanceof AppError ? error.code : 'UNKNOWN'
    setToast(strings.errors[code] ?? strings.feedback.actionError)
  }

  const handleApply = async (shirt: Shirt, team: Team) => {
    try {
      await applyShirt(dependencies.game, shirt, team)
      setToast(team === 'red' ? strings.feedback.appliedRed : strings.feedback.appliedBlue)
    } catch (error) {
      const reason = error instanceof AppError ? error.message : ''
      setToast(reason === 'NO_HAXBALL_TAB' ? strings.feedback.noTab : reason === 'CHAT_NOT_FOUND' ? strings.feedback.chatNotFound : strings.feedback.unexpectedGame)
    }
  }

  const handleFavorite = async (shirt: Shirt) => {
    try {
      const isFavorite = list.favorites.some((entry) => entry.shirt.id === shirt.id)
      const own = list.ownShirts.some((item) => item.id === shirt.id)
      await setFavorite(dependencies.favorites, shirt, own ? 'own' : 'community', !isFavorite)
      setToast(isFavorite ? strings.feedback.favoriteRemoved : strings.feedback.favoriteAdded)
      list.updateFavorite(shirt, own ? 'own' : 'community', !isFavorite)
    } catch (error) {
      showError(error)
    }
  }

  const handleDelete = async (shirt: Shirt | OwnShirt) => {
    setConfirmation({
      message: strings.feedback.deleteConfirm,
      action: async () => {
        await deleteOwnShirt(dependencies.shirts, dependencies.favorites, dependencies.community, shirt.id)
        setToast(strings.feedback.deleted)
        list.reload()
      },
    })
  }

  const handlePublish = async (shirt: OwnShirt) => {
    const confirmation = shirt.published ? strings.feedback.unpublishConfirm : strings.feedback.publishConfirm
    setConfirmation({
      message: confirmation,
      action: async () => {
        if (shirt.published) {
          await unpublishOwnShirt(dependencies.shirts, dependencies.community, shirt.id)
          setToast(strings.feedback.unpublished)
        } else {
          await publishOwnShirt(dependencies.shirts, dependencies.community, shirt.id)
          setToast(strings.feedback.published)
        }
        list.reload()
      },
    })
  }

  const handleCreate = async (input: NewShirt, shouldPublish: boolean) => {
    try {
      const shirt = await createOwnShirt(dependencies.shirts, input)
      if (shouldPublish) {
        try {
          await publishOwnShirt(dependencies.shirts, dependencies.community, shirt.id)
          setToast(strings.feedback.published)
        } catch {
          setToast(strings.feedback.publishSaveWarning)
        }
      } else {
        setToast(strings.feedback.saved)
      }
      setActiveTab('myShirts')
      list.reload()
    } catch (error) {
      showError(error)
      throw error
    }
  }

  const renderList = (tab: ListTab) => {
    if (list.loading) return <ViewState kind="loading" message={strings.lists.loading} />
    if (list.error) return <ViewState kind="error" message={strings.lists.error} actionLabel={strings.lists.retry} onAction={list.reload} />
    if (list.items.length === 0) {
      const empty = tab === 'myShirts' ? strings.lists.emptyOwn : tab === 'community' ? strings.lists.emptyCommunity : strings.lists.emptyFavorites
      return <ViewState kind="empty" message={empty} actionLabel={tab === 'myShirts' ? strings.lists.createFirst : undefined} onAction={tab === 'myShirts' ? () => setActiveTab('create') : undefined} />
    }
    const favoriteIds = new Set(list.favorites.map((entry) => entry.shirt.id))
    const ownIds = new Set(list.ownShirts.map((shirt) => shirt.id))
    return (
      <div className="list-view">
        <div className="list-scroll">
          <ShirtGrid
            shirts={list.items}
            favoriteIds={favoriteIds}
            ownIds={ownIds}
            publishedCards={tab === 'myShirts'}
            onFavorite={handleFavorite}
            onApply={handleApply}
            onDelete={handleDelete}
            onPublish={handlePublish}
          />
        </div>
        <Pagination page={list.page} totalPages={list.totalPages} onPageChange={list.setPage} />
        <p className="admin-note">{strings.lists.adminNote}</p>
      </div>
    )
  }

  return (
    <main className="popup">
      <header className="popup-header"><Logo /></header>
      <nav className="tabs" role="tablist" aria-label={strings.tabs.ariaLabel}>
        {tabs.map((tab) => (
          <button key={tab.id} id={`tab-${tab.id}`} type="button" className="tab" role="tab" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => {
            const currentIndex = tabs.findIndex(({ id }) => id === activeTab)
            const nextIndex = event.key === 'ArrowRight' ? (currentIndex + 1) % tabs.length : event.key === 'ArrowLeft' ? (currentIndex - 1 + tabs.length) % tabs.length : currentIndex
            if (nextIndex !== currentIndex) {
              event.preventDefault()
              const nextTab = tabs[nextIndex]
              setActiveTab(nextTab.id)
              document.getElementById(`tab-${nextTab.id}`)?.focus()
            }
          }}>{tab.label}</button>
        ))}
      </nav>
      <section id={`panel-${activeTab}`} className="tab-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
        {activeTab === 'create' ? <CreateView onSave={handleCreate} /> : renderList(activeTab)}
      </section>
      <Toast message={toast} onDismiss={() => setToast(null)} />
      {confirmation && (
        <ConfirmDialog
          message={confirmation.message}
          confirmLabel={strings.confirm.confirm}
          cancelLabel={strings.confirm.cancel}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            const action = confirmation.action
            setConfirmation(null)
            void action().catch(showError)
          }}
        />
      )}
    </main>
  )
}

export default App
