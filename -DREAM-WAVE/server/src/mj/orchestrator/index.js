/**
 * @module mj/orchestrator
 */
const { AgentOrchestrator, getAgentOrchestrator } = require('./AgentOrchestrator')
const {
  EXECUTION_STATES,
  MESSAGE_TYPES,
  ORCHESTRATOR_EVENTS,
  WORKFLOW_STAGES,
  AGENT_PERMISSIONS,
} = require('./constants')
const { AgentCommunicationBus } = require('./bus/AgentCommunicationBus')
const { CapabilityMatcher } = require('./matching/CapabilityMatcher')
const { TaskExecutionEngine } = require('./execution/TaskExecutionEngine')
const { DependencyResolver } = require('./execution/DependencyResolver')
const { ResultAggregator } = require('./aggregation/ResultAggregator')
const { PerformanceEngine } = require('./performance/PerformanceEngine')
const { HealthMonitor } = require('./health/HealthMonitor')
const { AgentPermissionManager } = require('./permissions/AgentPermissionManager')
const { getOrchestratorObservability } = require('./observability/OrchestratorObservability')
const { WorkflowEngine } = require('./workflow/WorkflowEngine')

module.exports = {
  AgentOrchestrator,
  getAgentOrchestrator,
  AgentCommunicationBus,
  CapabilityMatcher,
  TaskExecutionEngine,
  DependencyResolver,
  ResultAggregator,
  PerformanceEngine,
  HealthMonitor,
  AgentPermissionManager,
  getOrchestratorObservability,
  WorkflowEngine,
  EXECUTION_STATES,
  MESSAGE_TYPES,
  ORCHESTRATOR_EVENTS,
  WORKFLOW_STAGES,
  AGENT_PERMISSIONS,
}
