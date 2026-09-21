import { dashboardApi } from './api'
import cacheService from './cacheService'
import { withRetry } from './retryService'

async function student(options = {}) {
  return cacheService.remember('dashboard:student', async () => {
    const response = await withRetry(() => dashboardApi.student(), { retries: 1 })
    return response.data
  }, { ttl: 20000, force: options.force })
}

function invalidate() {
  cacheService.invalidate('dashboard:')
}

export const dashboardService = { student, invalidate }
export default dashboardService
