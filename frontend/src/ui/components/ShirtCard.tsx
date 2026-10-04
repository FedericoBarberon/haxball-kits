import type { OwnShirt, Shirt, Team } from '../../domain/shirt'
import { ShirtPreview } from './ShirtPreview'
import { strings } from '../strings'

interface ShirtCardProps {
  shirt: Shirt | OwnShirt
  isFavorite: boolean
  canDelete?: boolean
  showPublish?: boolean
  onFavorite?: (shirt: Shirt) => void
  onApply?: (shirt: Shirt, team: Team) => void
  onDelete?: (shirt: Shirt | OwnShirt) => void
  onPublish?: (shirt: OwnShirt) => void
}

function isOwnShirt(shirt: Shirt | OwnShirt): shirt is OwnShirt {
  return 'published' in shirt
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

function PublishIcon({ published }: { published: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill={published ? 'currentColor' : 'none'} />
      <path d="M8 12h8M12 8v8" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M10 10v7M14 10v7M8 7l.7-2h6.6l.7 2m-10 0 .8 13h10.4l.8-13" fill="none" />
    </svg>
  )
}

export function ShirtCard({
  shirt,
  isFavorite,
  canDelete = false,
  showPublish = false,
  onFavorite,
  onApply,
  onDelete,
  onPublish,
}: ShirtCardProps) {
  const ownShirt = isOwnShirt(shirt)

  return (
    <article className="shirt-card">
      <div className="shirt-card-preview">
        <ShirtPreview shirt={shirt} size={64} />
        {onFavorite && (
          <button
            type="button"
            className={`icon-button favorite-button${isFavorite ? ' is-favorite' : ''}`}
            aria-label={isFavorite ? strings.card.removeFavorite : strings.card.addFavorite}
            aria-pressed={isFavorite}
            onClick={() => onFavorite(shirt)}
          >
            <StarIcon filled={isFavorite} />
          </button>
        )}
        {showPublish && ownShirt && (
          <button
            type="button"
            className={`icon-button publish-button${shirt.published ? ' is-published' : ''}`}
            aria-label={shirt.published ? strings.card.removeCommunity : strings.card.publishCommunity}
            aria-pressed={shirt.published}
            onClick={() => onPublish?.(shirt)}
          >
            <PublishIcon published={shirt.published} />
          </button>
        )}
        {canDelete && onDelete && (
          <button
            type="button"
            className="icon-button delete-button"
            aria-label={strings.card.delete}
            onClick={() => onDelete(shirt)}
          >
            <DeleteIcon />
          </button>
        )}
      </div>
      <h2 className="shirt-card-name" title={shirt.name}>{shirt.name}</h2>
      <div className="shirt-card-actions">
        <button type="button" className="team-button team-button-red" onClick={() => onApply?.(shirt, 'red')}>Red</button>
        <button type="button" className="team-button team-button-blue" onClick={() => onApply?.(shirt, 'blue')}>Blue</button>
      </div>
    </article>
  )
}
