/**
 * Unified Dream Wave AI Brain limits (Thirumala V4 Prompt 1).
 * Cost / latency guards — Brain coordinates, does not bypass agent limits.
 */
module.exports = {
  MAX_CONTEXT_CHARS: Number(process.env.BRAIN_MAX_CONTEXT_CHARS) || 4800,
  MAX_DOMAIN_READS: Number(process.env.BRAIN_MAX_DOMAIN_READS) || 6,
  MAX_AGENT_CALLS: Number(process.env.BRAIN_MAX_AGENT_CALLS) || 1,
  MAX_SEARCH_RESULTS: Number(process.env.BRAIN_MAX_SEARCH_RESULTS) || 24,
  MAX_EXECUTION_MS: Number(process.env.BRAIN_MAX_EXECUTION_MS) || 40000,
  MEMORY_BUDGET_CHARS: Number(process.env.BRAIN_MEMORY_BUDGET_CHARS) || 700,
}
