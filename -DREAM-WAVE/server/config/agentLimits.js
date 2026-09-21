/**
 * Agent execution limits (Thirumala V3 Prompt 9 + V4 Prompt 2).
 * Prevents infinite loops and unbounded cost.
 */
module.exports = {
  MAX_PLAN_STEPS: Number(process.env.AGENT_MAX_PLAN_STEPS) || 8,
  MAX_TOOL_CALLS: Number(process.env.AGENT_MAX_TOOL_CALLS) || 12,
  MAX_RETRIES_READ: Number(process.env.AGENT_MAX_RETRIES_READ) || 1,
  MAX_EXECUTION_MS: Number(process.env.AGENT_MAX_EXECUTION_MS) || 45000,
  MAX_PLANNING_ITERATIONS: Number(process.env.AGENT_MAX_PLANNING_ITERATIONS) || 3,
  PREVIEW_TTL_MS: Number(process.env.AGENT_PREVIEW_TTL_MS) || 15 * 60 * 1000,
  IDEMPOTENCY_TTL_MS: Number(process.env.AGENT_IDEMPOTENCY_TTL_MS) || 60 * 60 * 1000,
  // Multi-agent specialist network (V4 P2)
  MAX_SPECIALIST_AGENTS: Number(process.env.AGENT_MAX_SPECIALISTS) || 4,
  MAX_SPECIALIST_DEPTH: Number(process.env.AGENT_MAX_SPECIALIST_DEPTH) || 3,
  MAX_SPECIALIST_MS: Number(process.env.AGENT_MAX_SPECIALIST_MS) || 20000,
  MAX_SPECIALIST_TOOL_CALLS: Number(process.env.AGENT_MAX_SPECIALIST_TOOLS) || 6,
}
