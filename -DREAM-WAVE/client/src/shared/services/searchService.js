import { searchApi } from './api'
import cacheService from './cacheService'
import storageService from './storageService'
import { withRetry } from './retryService'

const RECENT_KEY = 'recent-searches'

function stableParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null).sort(([a], [b]) => a.localeCompare(b)))
}

async function search(query, params = {}, options = {}) {
  const q = String(query || '').trim()
  const normalizedParams = stableParams(params)
  const key = `search:${q.toLowerCase()}:${JSON.stringify(normalizedParams)}`
  const data = await cacheService.remember(key, async () => {
    const response = await withRetry(() => searchApi.unified(q, normalizedParams), { retries: 1, signal: options.signal })
    return response.data
  }, { ttl: q ? 20000 : 10000, force: options.force })
  if (q) {
    storageService.update(RECENT_KEY, (current = []) => [q, ...current.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 8), [])
  }
  return {
    ...data,
    data: {
      ...data.data,
      recent: [...new Set([...(data.data?.recent || []), ...storageService.get(RECENT_KEY, [])])].slice(0, 8),
    },
  }
}

async function filters(options = {}) {
  return cacheService.remember('search:filters', async () => {
    const response = await withRetry(() => searchApi.filters(), { retries: 1 })
    return response.data.options || {}
  }, { ttl: 5 * 60 * 1000, force: options.force })
}

async function clearHistory() {
  storageService.remove(RECENT_KEY)
  cacheService.invalidate('search:')
  try {
    await searchApi.clearHistory()
  } catch (error) {
    if (error.response?.status !== 401 && error.response?.status !== 403) throw error
  }
}

export const searchService = { search, filters, clearHistory }
export default searchService
