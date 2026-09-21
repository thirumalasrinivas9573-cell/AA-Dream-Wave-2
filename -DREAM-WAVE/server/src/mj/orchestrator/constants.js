/**
 * MJ Orchestrator Constants (Sprint 6)
 * @module mj/orchestrator/constants
 */

const EXECUTION_STATES = {
  QUEUED: 'queued',
  PREPARING: 'preparing',
  WAITING: 'waiting',
  RUNNING: 'running',
  PAUSED: 'paused',
  RETRYING: 'retrying',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
  TIMED_OUT: 'timed_out',
}

const MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
  BROADCAST: 'broadcast',
  PROGRESS: 'progress',
  COMPLETION: 'completion',
  FAILURE: 'failure',
  HEARTBEAT: 'heartbeat',
  STATUS: 'status',
  CANCELLATION: 'cancellation',
}

const ORCHESTRATOR_EVENTS = {
  TASK_CREATED: 'mj:orchestrator:task_created',
  AGENT_SELECTED: 'mj:orchestrator:agent_selected',
  EXECUTION_STARTED: 'mj:orchestrator:execution_started',
  EXECUTION_COMPLETED: 'mj:orchestrator:execution_completed',
  EXECUTION_FAILED: 'mj:orchestrator:execution_failed',
  AGENT_HEARTBEAT: 'mj:orchestrator:agent_heartbeat',
  RESULT_MERGED: 'mj:orchestrator:result_merged',
}

const WORKFLOW_STAGES = {
  USER_REQUEST: 'user_request',
  INTENT_DETECTION: 'intent_detection',
  GOAL_ANALYSIS: 'goal_analysis',
  TASK_DECOMPOSITION: 'task_decomposition',
  CAPABILITY_MATCHING: 'capability_matching',
  AGENT_SELECTION: 'agent_selection',
  EXECUTION_PLAN: 'execution_plan',
  DEPENDENCY_GRAPH: 'dependency_graph',
  EXECUTION_QUEUE: 'execution_queue',
  RESULT_VALIDATION: 'result_validation',
  MERGE_RESULTS: 'merge_results',
  FINAL_RESPONSE: 'final_response',
}

const AGENT_PERMISSIONS = {
  INTERNET: 'internet',
  DATABASE: 'database',
  FILESYSTEM: 'filesystem',
  TERMINAL: 'terminal',
  EMAIL: 'email',
  CALENDAR: 'calendar',
  SEARCH: 'search',
  API: 'api',
  LOCAL_AUTOMATION: 'local_automation',
}

const DEFAULT_RETRY_POLICY = {
  maxRetries: 2,
  backoffMs: 1000,
  timeoutMs: 30000,
}

module.exports = {
  EXECUTION_STATES,
  MESSAGE_TYPES,
  ORCHESTRATOR_EVENTS,
  WORKFLOW_STAGES,
  AGENT_PERMISSIONS,
  DEFAULT_RETRY_POLICY,
}
