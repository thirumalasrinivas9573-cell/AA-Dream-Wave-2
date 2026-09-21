/**
 * MJ Agent Orchestrator — Chief Executive AI coordination layer
 * MJ is NOT an agent. MJ supervises all specialists.
 * @module mj/orchestrator/AgentOrchestrator
 */

const { ORCHESTRATOR_EVENTS, EXECUTION_STATES } = require('./constants')
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
const { getEventBus } = require('../events')
const { MJLogger } = require('../logger')
const { MJ_EVENTS } = require('../constants')

class AgentOrchestrator {
  constructor(registry, options = {}) {
    this._logger = MJLogger.child('AgentOrchestrator')
    this._registry = registry
    this._eventBus = getEventBus()
    this._initialized = false
    this._currentRun = null

    this.bus = new AgentCommunicationBus()
    this.matcher = new CapabilityMatcher(registry)
    this.execution = new TaskExecutionEngine(options)
    this.dependencies = new DependencyResolver()
    this.aggregator = new ResultAggregator()
    this.performance = new PerformanceEngine()
    this.health = new HealthMonitor(registry)
    this.permissions = new AgentPermissionManager()
    this.observability = getOrchestratorObservability()
    this.workflow = new WorkflowEngine(this)
  }

  initialize() {
    if (this._initialized) return this
    this._logger.info('Agent Orchestrator initialized — MJ executive mode active')
    this._initialized = true
    return this
  }

  /** Discover agents by capability or task */
  discover(query = {}) {
    const { capability, taskType, intent } = query
    const caps = capability ? [capability] : taskType ? [taskType] : []
    return this.matcher.match(caps, { intent }).map(m => m.agent.toDescriptor?.() || m.agent)
  }

  /** Select agents for a plan */
  selectAgents(plan = {}, reasoningResult = null) {
    const recommended = reasoningResult?.recommendedAgents || []
    const selected = []

    for (const rec of recommended) {
      const agent = this._registry.get(rec.type)
      if (agent) {
        selected.push({ ...agent.toDescriptor(), reason: rec.reason, instance: agent })
        this.observability.recordAgentSelection({ agentType: rec.type, reason: rec.reason })
        this._eventBus.emitEvent(MJ_EVENTS.AGENT_SELECTED, { agentType: rec.type })
        this._eventBus.emitEvent(ORCHESTRATOR_EVENTS.AGENT_SELECTED, { agentType: rec.type })
      }
    }

    if (!selected.length && plan.tasks?.length) {
      for (const task of plan.tasks) {
        const agent = this.matcher.selectBest(
          task.capabilities || [task.agentType].filter(Boolean),
          { preferredAgent: task.agentType }
        )
        if (agent) {
          selected.push({ ...agent.toDescriptor(), instance: agent })
        }
      }
    }

    return selected
  }

  /** Execute a plan through the task engine */
  async executePlan(plan = {}, context = {}) {
    const runId = context.runId || `run_${Date.now()}`
    this._currentRun = runId
    const mode = plan.mode || plan.executionType || 'sequential'
    const tasks = plan.tasks || []

    this.execution.clear()
    for (const task of tasks) {
      this.execution.enqueue({
        ...task,
        agentId: task.agentType || task.agentId,
      }, { runId })
    }

    const executor = async (entry, agent, ctx) => {
      const agentInstance = agent || this._registry.get(entry.agentId)
      if (!agentInstance) {
        return { success: false, output: `Agent not found: ${entry.agentId}`, stub: true }
      }

      this.bus.sendToAgent(agentInstance.id, { task: entry.task }, runId)
      this.health.recordHeartbeat(agentInstance.id)

      const permCheck = this.permissions.check(agentInstance.id, 'api')
      const result = await agentInstance.execute({
        ...entry.task,
        runId,
        context: ctx.context,
        permissions: permCheck,
      })

      this.bus.receiveFromAgent(agentInstance.id, result, runId)

      this.performance.recordExecution({
        agentId: agentInstance.id,
        durationMs: Date.now() - (entry.startedAt || Date.now()),
        success: result.success !== false,
      })

      return result
    }

    const execResult = await this.execution.executeAll(executor, {
      registry: this._registry,
      bus: this.bus,
      runId,
      mode,
      context,
    })

    this.observability.recordExecution({ runId, ...execResult })
    this._currentRun = null
    return execResult
  }

  /** Run full workflow */
  async run(params = {}) {
    return this.workflow.execute(params)
  }

  /** Execute single agent task directly */
  async executeAgent(agentId, task, context = {}) {
    const agent = this._registry.getById?.(agentId) || this._registry.get(agentId)
    if (!agent) return { success: false, error: 'Agent not found' }

    const runId = context.runId || `run_${Date.now()}`
    this.bus.sendToAgent(agent.id, { task }, runId)
    const result = await agent.execute({ ...task, runId, context })
    this.bus.receiveFromAgent(agent.id, result, runId)

    this.performance.recordExecution({
      agentId: agent.id,
      durationMs: 0,
      success: result.success !== false,
    })

    return { agentId: agent.id, result, runId }
  }

  getStatus() {
    return {
      initialized: this._initialized,
      currentRun: this._currentRun,
      queue: this.observability.getQueueStats(this.execution),
      health: this.health.getStatus(),
      agents: {
        registered: this._registry.getAll().length,
        active: this._registry.getActive().length,
      },
    }
  }

  getMetrics() {
    return {
      performance: this.performance.getMetrics(),
      observability: this.observability.getSummary(),
      queue: this.observability.getQueueStats(this.execution),
    }
  }

  getHealth() {
    return this.health.checkAll()
  }

  reset() {
    this.execution.clear()
    this.bus.clear()
    this._currentRun = null
    return { reset: true }
  }
}

let _instance = null

function getAgentOrchestrator(registry, options) {
  if (!_instance && registry) {
    _instance = new AgentOrchestrator(registry, options)
  }
  return _instance
}

module.exports = { AgentOrchestrator, getAgentOrchestrator }
