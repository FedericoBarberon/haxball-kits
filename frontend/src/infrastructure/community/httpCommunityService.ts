import { AppError } from '../../application/errors'
import type { CommunityService, Page } from '../../application/ports'
import type { Shirt } from '../../domain/shirt'

export class HttpCommunityService implements CommunityService {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(
    baseUrl: string,
    fetcher: typeof fetch = fetch,
  ) {
    this.baseUrl = baseUrl
    this.fetcher = fetcher.bind(globalThis)
  }

  async list(params: { page: number; pageSize: number }): Promise<Page<Shirt>> {
    const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
    return this.request<Page<Shirt>>(`/shirts?${query.toString()}`)
  }

  async publish(shirt: Shirt): Promise<{ ownerToken: string }> {
    return this.request<{ ownerToken: string }>('/shirts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shirt),
    })
  }

  async remove(id: string, ownerToken: string): Promise<void> {
    await this.request<void>(`/shirts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Owner-Token': ownerToken },
    })
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}${path}`, init)
    } catch (error) {
      throw new AppError('NETWORK', 'Community service is unavailable.', { cause: error })
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null
      const code = response.status === 404 ? 'NOT_FOUND' : 'NETWORK'
      throw new AppError(code, body?.error ?? `Community request failed (${response.status}).`)
    }
    if (response.status === 204) return undefined as T
    return await response.json() as T
  }
}
