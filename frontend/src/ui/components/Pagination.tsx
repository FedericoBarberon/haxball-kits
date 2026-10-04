interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const disabled = totalPages <= 1

  return (
    <nav className="pagination" aria-label={strings.pagination.label}>
      <button type="button" disabled={disabled || page === 1} onClick={() => onPageChange(page - 1)}>
        {strings.pagination.previous}
      </button>
      <span aria-live="polite">Página {page} de {totalPages}</span>
      <button type="button" disabled={disabled || page === totalPages} onClick={() => onPageChange(page + 1)}>
        {strings.pagination.next}
      </button>
    </nav>
  )
}
import { strings } from '../strings'
