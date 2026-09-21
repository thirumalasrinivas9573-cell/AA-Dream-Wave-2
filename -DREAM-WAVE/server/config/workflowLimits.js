/**
 * Workflow execution limits (Thirumala V4 Prompt 5).
 * Extends agentLimits — does not replace them.
 */
const agentLimits = require('./agentLimits')

module.exports = {
  ...agentLimits,
  MAX_WORKFLOW_STEPS: Number(process.env.WORKFLOW_MAX_STEPS) || 12,
  MAX_WORKFLOW_MS: Number(process.env.WORKFLOW_MAX_MS) || 60000,
  MAX_WORKFLOW_RETRIES: Number(process.env.WORKFLOW_MAX_RETRIES) || 1,
  MAX_WORKFLOW_DEPTH: Number(process.env.WORKFLOW_MAX_DEPTH) || 2,
  APPROVAL_TTL_MS: Number(process.env.WORKFLOW_APPROVAL_TTL_MS) || 15 * 60 * 1000,
  LOCK_TTL_MS: Number(process.env.WORKFLOW_LOCK_TTL_MS) || 2 * 60 * 1000,
  MAX_PARALLEL_READS: Number(process.env.WORKFLOW_MAX_PARALLEL) || 4,
}
