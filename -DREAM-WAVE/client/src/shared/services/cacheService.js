const entries = new Map()
const inflight = new Map()

function get(key) {
  const entry = entries.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key)
    return undefined
  }
  return entry.value
}

function set(key, value, ttl = 30000) {
  entries.set(key, { value, expiresAt: Date.now() + ttl })
  return value
}

async function remember(key, loader, { ttl = 30000, force = false } = {}) {
  if (!force) {
    const cached = get(key)
    if (cached !== undefined) return cached
    if (inflight.has(key)) return inflight.get(key)
  }
  const request = Promise.resolve()
    .then(loader)
    .then((value) => set(key, value, ttl))
    .finally(() => inflight.delete(key))
  inflight.set(key, request)
  return request
}

function invalidate(prefix = '') {
  for (const key of entries.keys()) {
    if (!prefix || key.startsWith(prefix)) entries.delete(key)
  }
}

function clear() {
  entries.clear()
  inflight.clear()
}

export const cacheService = { get, set, remember, invalidate, clear }
export default cacheService
