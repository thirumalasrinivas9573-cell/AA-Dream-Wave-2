import { intelligenceApi } from './api'
import cacheService from './cacheService'
import { withRetry } from './retryService'

async function home(options = {}) {
  return cacheService.remember('intelligence:home', async () => {
    const response = await withRetry(() => intelligenceApi.home(), { retries: 1 })
    return response.data
  }, { ttl: 30000, force: options.force })
}

async function insights(options = {}) {
  return cacheService.remember('intelligence:insights', async () => {
    const response = await withRetry(() => intelligenceApi.insights(), { retries: 1 })
    return response.data
  }, { ttl: 30000, force: options.force })
}

async function recommendations(types = [], options = {}) {
  const key = `intelligence:recommendations:${types.join(',') || 'all'}`
  return cacheService.remember(key, async () => {
    const response = await withRetry(() => intelligenceApi.recommendations(types), { retries: 1 })
    return response.data
  }, { ttl: 60000, force: options.force })
}

async function profile(options = {}) {
  return cacheService.remember('intelligence:profile', async () => {
    const response = await withRetry(() => intelligenceApi.profile(), { retries: 1 })
    return response.data
  }, { ttl: 45000, force: options.force })
}

async function updateProfile(payload) {
  const response = await withRetry(() => intelligenceApi.updateProfile(payload), { retries: 1 })
  cacheService.invalidate('intelligence:')
  return response.data
}

async function memory(options = {}) {
  return cacheService.remember('intelligence:memory', async () => {
    const response = await withRetry(() => intelligenceApi.memory(), { retries: 1 })
    return response.data
  }, { ttl: 45000, force: options.force })
}

async function nextAction(options = {}) {
  return cacheService.remember('intelligence:next-action', async () => {
    const response = await withRetry(() => intelligenceApi.nextAction(), { retries: 1 })
    return response.data
  }, { ttl: 30000, force: options.force })
}

async function decisions(params = {}, options = {}) {
  const key = `intelligence:decisions:${JSON.stringify(params)}`
  return cacheService.remember(key, async () => {
    const response = await withRetry(() => intelligenceApi.decisions(params), { retries: 1 })
    return response.data
  }, { ttl: 60000, force: options.force })
}

async function dismissRecommendation(fingerprint) {
  await intelligenceApi.dismissRecommendation(fingerprint)
  cacheService.invalidate('intelligence:')
}

function invalidate() {
  cacheService.invalidate('intelligence:')
}

export const intelligenceService = {
  home,
  insights,
  recommendations,
  nextAction,
  decisions,
  dismissRecommendation,
  profile,
  updateProfile,
  memory,
  invalidate,
}

export default intelligenceService
