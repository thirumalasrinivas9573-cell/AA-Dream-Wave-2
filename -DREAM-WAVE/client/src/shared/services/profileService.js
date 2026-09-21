import { profileApi } from './api'
import cacheService from './cacheService'
import { withRetry } from './retryService'

async function get(options = {}) {
  return cacheService.remember('profile:me', async () => {
    const response = await withRetry(() => profileApi.get(), { retries: 1 })
    return response.data
  }, { ttl: 30000, force: options.force })
}

async function update(data) {
  const response = await profileApi.update(data)
  cacheService.invalidate('profile:')
  cacheService.invalidate('dashboard:')
  return response.data
}

export const profileService = { get, update, invalidate: () => cacheService.invalidate('profile:') }
export default profileService
