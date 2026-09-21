import { researchWorkspaceApi } from '@shared/services/api'
import cacheService from './cacheService'
import { withRetry } from './retryService'

async function list(options = {}) {
  const params = options.params || {}
  return cacheService.remember(`research:workspaces:${JSON.stringify(params)}`, async () => {
    const response = await withRetry(() => researchWorkspaceApi.list(params), { retries: 1 })
    return response.data
  }, { ttl: 30000, force: options.force })
}

async function workspace(id, options = {}) {
  return cacheService.remember(`research:workspace:${id}`, async () => {
    const response = await withRetry(() => researchWorkspaceApi.get(id), { retries: 1 })
    return response.data
  }, { ttl: 30000, force: options.force })
}

function invalidate(prefix = 'research:') {
  cacheService.invalidate(prefix)
}

export default { list, workspace, invalidate, api: researchWorkspaceApi }
