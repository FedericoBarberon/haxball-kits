import { describe, expect, it } from 'vitest'
import { paginate } from './pagination'

describe('paginate', () => {
  it('returns the requested client page and metadata', () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual({
      items: [3, 4],
      page: 2,
      pageSize: 2,
      total: 5,
      totalPages: 3,
    })
  })

  it('clamps a page beyond the last page', () => {
    expect(paginate([1], 8, 12).page).toBe(1)
  })
})
