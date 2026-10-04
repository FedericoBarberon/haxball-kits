import type { OwnShirt, Shirt, Team } from '../../domain/shirt'
import { ShirtCard } from './ShirtCard'

interface ShirtGridProps {
  shirts: Array<Shirt | OwnShirt>
  favoriteIds?: ReadonlySet<string>
  ownIds?: ReadonlySet<string>
  publishedCards?: boolean
  onFavorite?: (shirt: Shirt) => void
  onApply?: (shirt: Shirt, team: Team) => void
  onDelete?: (shirt: Shirt | OwnShirt) => void
  onPublish?: (shirt: OwnShirt) => void
}

export function ShirtGrid({
  shirts,
  favoriteIds = new Set<string>(),
  ownIds = new Set<string>(),
  publishedCards = false,
  onFavorite,
  onApply,
  onDelete,
  onPublish,
}: ShirtGridProps) {
  return (
    <div className="shirt-grid" role="list">
      {shirts.map((shirt) => (
        <div role="listitem" key={shirt.id}>
          <ShirtCard
            shirt={shirt}
            isFavorite={favoriteIds.has(shirt.id)}
            canDelete={ownIds.has(shirt.id)}
            showPublish={publishedCards}
            onFavorite={onFavorite}
            onApply={onApply}
            onDelete={onDelete}
            onPublish={onPublish}
          />
        </div>
      ))}
    </div>
  )
}
