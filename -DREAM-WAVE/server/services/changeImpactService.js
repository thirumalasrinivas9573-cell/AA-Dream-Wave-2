/**
 * Change Impact Engine (V4 Prompt 8).
 * Maps domain events → CHANGED / AFFECTED / RECALCULATE / IGNORE.
 * Prevents full-system recalculation and infinite cascades.
 */
const limits = require('../config/intelligenceLimits')

const IMPACT_MAP = {
  GOAL_CREATED: {
    changed: ['goals'],
    affected: ['tasks', 'learning', 'recommendations', 'progress'],
    recalculate: ['decision', 'daily', 'progress'],
    ignore: ['books', 'unrelated_research'],
  },
  GOAL_UPDATED: {
    changed: ['goals'],
    affected: ['tasks', 'learning', 'recommendations', 'progress', 'memory'],
    recalculate: ['decision', 'daily', 'progress', 'insights'],
    ignore: ['books'],
  },
  TASK_CREATED: {
    changed: ['tasks'],
    affected: ['goals', 'daily', 'progress'],
    recalculate: ['decision', 'daily'],
    ignore: ['opportunities', 'books'],
  },
  TASK_COMPLETED: {
    changed: ['tasks'],
    affected: ['goals', 'progress', 'daily', 'insights'],
    recalculate: ['decision', 'progress', 'daily', 'insights'],
    ignore: ['books'],
  },
  LEARNING_STARTED: {
    changed: ['learning'],
    affected: ['skills', 'goals', 'daily'],
    recalculate: ['decision', 'learning'],
    ignore: ['applications'],
  },
  LEARNING_COMPLETED: {
    changed: ['learning'],
    affected: ['skills', 'goals', 'evidence', 'progress'],
    recalculate: ['decision', 'progress', 'insights', 'skills'],
    ignore: ['unrelated_books'],
  },
  SKILL_UPDATED: {
    changed: ['skills'],
    affected: ['career', 'opportunities', 'projects', 'learning'],
    recalculate: ['insights', 'career', 'decision'],
    ignore: ['daily_tasks'],
  },
  PROJECT_CREATED: {
    changed: ['projects'],
    affected: ['skills', 'goals', 'evidence'],
    recalculate: ['decision', 'insights'],
    ignore: ['books'],
  },
  PROJECT_COMPLETED: {
    changed: ['projects'],
    affected: ['skills', 'evidence', 'portfolio', 'opportunities', 'career'],
    recalculate: ['insights', 'career', 'decision', 'progress'],
    ignore: ['unrelated_books'],
  },
  EVIDENCE_ADDED: {
    changed: ['evidence'],
    affected: ['portfolio', 'career', 'opportunities'],
    recalculate: ['career', 'insights'],
    ignore: ['tasks'],
  },
  BOOK_COMPLETED: {
    changed: ['books'],
    affected: ['learning', 'skills'],
    recalculate: ['learning', 'decision'],
    ignore: ['applications'],
  },
  OPPORTUNITY_FOUND: {
    changed: ['opportunities'],
    affected: ['career', 'skills', 'applications', 'recommendations'],
    recalculate: ['career', 'decision', 'insights'],
    ignore: ['books'],
  },
  APPLICATION_CREATED: {
    changed: ['applications'],
    affected: ['career', 'tasks', 'daily'],
    recalculate: ['decision', 'career', 'daily'],
    ignore: ['books'],
  },
  APPLICATION_SUBMITTED: {
    changed: ['applications'],
    affected: ['career', 'tasks', 'followups'],
    recalculate: ['decision', 'career', 'insights'],
    ignore: ['books'],
  },
  INTERVIEW_SCHEDULED: {
    changed: ['interviews'],
    affected: ['applications', 'tasks', 'daily', 'career'],
    recalculate: ['decision', 'daily'],
    ignore: ['books'],
  },
  INTERVIEW_COMPLETED: {
    changed: ['interviews'],
    affected: ['applications', 'outcomes', 'career'],
    recalculate: ['career', 'insights', 'decision'],
    ignore: ['books'],
  },
  MEMORY_UPDATED: {
    changed: ['memory'],
    affected: ['personalization', 'decision'],
    recalculate: ['decision'],
    ignore: ['canonical_goals'],
  },
  WORKFLOW_COMPLETED: {
    changed: ['workflows'],
    affected: ['tasks', 'progress', 'notifications'],
    recalculate: ['decision', 'daily'],
    ignore: ['books'],
  },
  COMMAND_EXECUTED: {
    changed: ['commands'],
    affected: ['decision'],
    recalculate: [],
    ignore: ['all_domains'],
  },
  DECISION_OVERRIDDEN: {
    changed: ['decisions'],
    affected: ['recommendations'],
    recalculate: ['decision'],
    ignore: ['canonical_data'],
  },
}

function analyzeImpact(eventType, { depth = 0 } = {}) {
  const map = IMPACT_MAP[eventType]
  if (!map) {
    return {
      eventType,
      action: 'IGNORE',
      changed: [],
      affected: [],
      recalculate: [],
      ignore: ['unknown_event'],
      cascade: false,
      depth,
      maxDepth: limits.MAX_CASCADE_DEPTH,
      reason: 'Unknown event type — ignore.',
    }
  }

  if (depth >= limits.MAX_CASCADE_DEPTH) {
    return {
      eventType,
      action: 'IGNORE',
      changed: map.changed,
      affected: [],
      recalculate: [],
      ignore: ['cascade_depth_exceeded', ...map.ignore],
      cascade: false,
      depth,
      maxDepth: limits.MAX_CASCADE_DEPTH,
      reason: `Cascade depth ${depth} reached max ${limits.MAX_CASCADE_DEPTH}.`,
    }
  }

  const action = map.recalculate.length ? 'RECALCULATE' : (map.affected.length ? 'AFFECTED' : 'CHANGED')
  return {
    eventType,
    action,
    changed: map.changed,
    affected: map.affected,
    recalculate: map.recalculate,
    ignore: map.ignore,
    cascade: map.recalculate.length > 0 && depth + 1 < limits.MAX_CASCADE_DEPTH,
    depth,
    maxDepth: limits.MAX_CASCADE_DEPTH,
    reason: `${eventType}: ${action.toLowerCase()} ${map.recalculate.join(', ') || 'none'}.`,
  }
}

function shouldNotify(impact, { urgency = 'normal' } = {}) {
  if (impact.action === 'IGNORE') return false
  if (['APPLICATION_SUBMITTED', 'INTERVIEW_SCHEDULED', 'OPPORTUNITY_FOUND', 'TASK_COMPLETED'].includes(impact.eventType)) {
    return true
  }
  return urgency === 'high' || urgency === 'urgent'
}

module.exports = {
  IMPACT_MAP,
  analyzeImpact,
  shouldNotify,
  MAX_CASCADE_DEPTH: limits.MAX_CASCADE_DEPTH,
}
