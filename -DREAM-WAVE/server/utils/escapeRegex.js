/** Escape user input for safe use inside RegExp constructors. */
function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Sanitize free-text search for MongoDB $text (strip operator-like tokens). */
function sanitizeTextSearch(value, maxLen = 120) {
  return String(value || '')
    .replace(/[^\w\s@.-]/g, ' ')
    .trim()
    .slice(0, maxLen)
}

module.exports = {
  escapeRegex,
  sanitizeTextSearch,
}
