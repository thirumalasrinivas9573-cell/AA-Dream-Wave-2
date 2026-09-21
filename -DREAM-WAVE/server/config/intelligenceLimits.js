/**
 * Continuous Intelligence limits (Thirumala V4 Prompt 8).
 * Deterministic bounds — no fake precision.
 */
module.exports = {
  MAX_CASCADE_DEPTH: 5,
  MAX_CONTEXT_ENTITIES: 24,
  MAX_INSIGHTS: 8,
  MAX_ALTERNATIVES: 3,
  MAX_COMMAND_HISTORY: 20,
  AGENT_TIMEOUT_MS: 12_000,
  EVENT_TTL_HOURS: 72,
  NOTIFY_PRIORITIES: ['high', 'urgent', 'approval'],
  CONFIDENCE: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
}
