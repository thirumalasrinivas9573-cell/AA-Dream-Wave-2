import { notificationApi } from './api'
import cacheService from './cacheService'
import { withRetry } from './retryService'

const keyFor = (params = {}) => `notifications:${JSON.stringify(params)}`
const invalidate = () => cacheService.invalidate('notifications:')

async function list(params = {}, options = {}) {
  return cacheService.remember(keyFor(params), async () => {
    const response = await withRetry(() => notificationApi.list(params), { retries: 1 })
    return response.data
  }, { ttl: 20000, force: options.force })
}

async function mutate(loader) {
  const response = await loader()
  invalidate()
  return response.data
}

export const notificationService = {
  list,
  invalidate,
  markRead: (id) => mutate(() => notificationApi.markRead(id)),
  markAllRead: () => mutate(() => notificationApi.markAllRead()),
  archive: (id) => mutate(() => notificationApi.archive(id)),
  restore: (id) => mutate(() => notificationApi.restore(id)),
  pin: (id, pinned) => mutate(() => notificationApi.pin(id, pinned)),
  priority: (id, priority) => mutate(() => notificationApi.priority(id, priority)),
  remove: (id) => mutate(() => notificationApi.delete(id)),
}

export default notificationService
