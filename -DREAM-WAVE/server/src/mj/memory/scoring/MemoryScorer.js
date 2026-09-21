/**
 * MJ Memory Scorer — importance, recency, access-based ranking
 * @module mj/memory/scoring/MemoryScorer
 */

class MemoryScorer {
  /**
   * Calculate recency score from updatedAt timestamp (0-1).
   * @param {Date|string} updatedAt
   * @returns {number}
   */
  recencyScore(updatedAt) {
    if (!updatedAt) return 0.5
    const ageMs = Date.now() - new Date(updatedAt).getTime()
    const dayMs = 86400000
    if (ageMs < dayMs) return 1
    if (ageMs < dayMs * 7) return 0.8
    if (ageMs < dayMs * 30) return 0.5
    if (ageMs < dayMs * 90) return 0.3
    return 0.1
  }

  /**
   * Keyword relevance score (0-1).
   * @param {string} query
   * @param {Object} memory
   */
  keywordScore(query, memory) {
    if (!query) return 0
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return 0

    const haystack = [
      memory.content,
      memory.summary,
      memory.title,
      memory.topic,
      memory.name,
      ...(memory.tags || []),
    ].filter(Boolean).join(' ').toLowerCase()

    let matches = 0
    for (const term of terms) {
      if (haystack.includes(term)) matches++
    }
    return Math.min(matches / terms.length, 1)
  }

  /**
   * Combined ranking score.
   * @param {Object} memory
   * @param {Object} [options]
   * @returns {number}
   */
  rankScore(memory, options = {}) {
    const importance = memory.importanceScore ?? 0.5
    const recency = options.recencyOverride ?? this.recencyScore(memory.updatedAt || memory.createdAt)
    const access = Math.min((memory.accessCount || 0) / 20, 1) * 0.2
    const keyword = (options.keywordScore ?? 0) * 0.35
    const confidence = (memory.confidence ?? 0.8) * 0.1

    return (importance * 0.35) + (recency * 0.25) + access + keyword + confidence
  }

  /** Default importance by category */
  defaultImportance(category) {
    const map = {
      preference: 0.9,
      project: 0.85,
      learning: 0.8,
      knowledge: 0.75,
      task: 0.7,
      conversation: 0.6,
      working: 0.4,
      system: 0.3,
    }
    return map[category] ?? 0.5
  }
}

module.exports = { MemoryScorer }
