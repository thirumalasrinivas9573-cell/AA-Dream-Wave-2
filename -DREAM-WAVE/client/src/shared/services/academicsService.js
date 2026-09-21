import { academicsApi } from '@shared/services/api'
import cacheService from './cacheService'
import { withRetry } from './retryService'

async function overview(options = {}) {
  return cacheService.remember('academics:overview', async () => {
    const response = await withRetry(() => academicsApi.overview(), { retries: 1 })
    return response.data
  }, { ttl: 30000, force: options.force })
}

async function subject(id, options = {}) {
  return cacheService.remember(`academics:subject:${id}`, async () => {
    const response = await withRetry(() => academicsApi.subject(id), { retries: 1 })
    return response.data
  }, { ttl: 30000, force: options.force })
}

function invalidate(prefix = 'academics:') {
  cacheService.invalidate(prefix)
}

export default {
  overview,
  subject,
  invalidate,
  api: academicsApi,
}
