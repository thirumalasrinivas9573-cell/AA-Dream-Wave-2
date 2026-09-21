/** Short-lived in-memory cache for institution lookups and analytics */

const CACHE_TTL_MS = {
  filters: 5 * 60 * 1000,
  stats: 2 * 60 * 1000,
  analytics: 2 * 60 * 1000,
}

const MAX_ENTRIES = 300
const store = new Map()

function makeKey(prefix, institutionId, suffix = '') {
  return `${prefix}:${institutionId}:${suffix}`
}

function get(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > entry.ttl) {
    store.delete(key)
    return null
  }
  return entry.value
}

function set(key, value, ttlMs = CACHE_TTL_MS.stats) {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value
    store.delete(firstKey)
  }
  store.set(key, { value, ts: Date.now(), ttl: ttlMs })
}

function invalidateInstitution(institutionId) {
  const prefix = `:${institutionId}:`
  for (const key of store.keys()) {
    if (key.includes(prefix)) store.delete(key)
  }
}

function getOrSet(key, ttlMs, factory) {
  const cached = get(key)
  if (cached !== null) return Promise.resolve(cached)
  return Promise.resolve(factory()).then((value) => {
    set(key, value, ttlMs)
    return value
  })
}

module.exports = {
  CACHE_TTL_MS,
  makeKey,
  get,
  set,
  getOrSet,
  invalidateInstitution,
  clear: () => store.clear(),
}
