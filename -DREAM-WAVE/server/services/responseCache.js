// ── Simple in-memory LRU-style response cache ─────────────────────────────────
// Caches AI responses for identical (goal + message) pairs for 10 minutes.
// Prevents duplicate OpenAI API calls for repeated questions.
// NOT used for chat (which needs memory context) -- only for stateless endpoints:
// goal-plan, daily-suggestion, roadmap, report, books

const CACHE_TTL_MS = 10 * 60 * 1000  // 10 minutes
const MAX_ENTRIES  = 200

const store = new Map()

const makeKey = (...parts) =>
  parts.map(p => String(p || '').toLowerCase().trim().slice(0, 100)).join('|')

const get = (key) => {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    store.delete(key)
    return null
  }
  return entry.value
}

const set = (key, value) => {
  // Evict oldest if at capacity
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value
    store.delete(firstKey)
  }
  store.set(key, { value, ts: Date.now() })
}

const clear = () => store.clear()

module.exports = { get, set, makeKey, clear }
