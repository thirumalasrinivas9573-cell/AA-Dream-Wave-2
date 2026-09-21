import { mentorApi } from './api'
import cacheService from './cacheService'
import { withRetry } from './retryService'

async function conversations(options = {}) {
  return cacheService.remember('mentor:conversations', async () => {
    const response = await withRetry(() => mentorApi.conversations(), { retries: 1 })
    return response.data
  }, { ttl: 15000, force: options.force })
}

async function getConversation(id) {
  const response = await withRetry(() => mentorApi.getConversation(id), { retries: 1 })
  return response.data
}

async function chat(payload, config = {}) {
  const response = await withRetry(() => mentorApi.chat(payload, config), { retries: 0 })
  cacheService.invalidate('mentor:')
  return response.data
}

async function createConversation(data = {}) {
  const response = await withRetry(() => mentorApi.createConversation(data), { retries: 1 })
  cacheService.invalidate('mentor:')
  return response.data
}

async function updateConversation(id, data) {
  const response = await withRetry(() => mentorApi.updateConversation(id, data), { retries: 1 })
  cacheService.invalidate('mentor:')
  return response.data
}

async function deleteConversation(id) {
  const response = await withRetry(() => mentorApi.deleteConversation(id), { retries: 1 })
  cacheService.invalidate('mentor:')
  return response.data
}

function invalidate() {
  cacheService.invalidate('mentor:')
}

export const mentorService = {
  conversations,
  getConversation,
  chat,
  createConversation,
  updateConversation,
  deleteConversation,
  invalidate,
}

export default mentorService
