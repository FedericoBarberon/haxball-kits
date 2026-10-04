export interface ClientPage<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function paginate<T>(items: T[], page: number, pageSize: number): ClientPage<T> {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError('Page must be a positive integer.')
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('Page size must be a positive integer.')
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page: currentPage,
    pageSize,
    total: items.length,
    totalPages,
  }
}
