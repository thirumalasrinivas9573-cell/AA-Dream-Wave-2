/**
 * Workflow Engine — full multi-agent workflow pipeline
 * @module mj/orchestrator/workflow/WorkflowEngine
 */

const { WORKFLOW_STAGES } = require('../constants')
const { MJLogger } = require('../../logger')

class WorkflowEngine {
  constructor(orchestrator) {
    this._orchestrator = orchestrator
    this._logger = MJLogger.child('Orchestrator:Workflow')
  }

  /**
   * Execute full workflow from user request context.
   * @param {Object} params - { command, context, reasoningResult, plan }
   */
  async execute(params = {}) {
    const trace = { stages: [], runId: params.runId || `run_${Date.now()}` }
    const { command, context, reasoningResult, plan } = params

    trace.stages.push(WORKFLOW_STAGES.USER_REQUEST)
    trace.stages.push(WORKFLOW_STAGES.INTENT_DETECTION)
    const intent = reasoningResult?.intent?.type || context?.intent || 'general'

    trace.stages.push(WORKFLOW_STAGES.GOAL_ANALYSIS)
    const goal = reasoningResult?.goal?.primary || command?.input?.slice(0, 100) || ''

    trace.stages.push(WORKFLOW_STAGES.TASK_DECOMPOSITION)
    const tasks = plan?.tasks || reasoningResult?.executionPlan?.tasks || [{
      id: `task_${Date.now()}`,
      title: goal || 'Process request',
      agentType: reasoningResult?.recommendedAgents?.[0]?.type,
      capabilities: reasoningResult?.recommendedAgents?.[0]?.capabilities || [],
    }]

    trace.stages.push(WORKFLOW_STAGES.CAPABILITY_MATCHING)
    const matches = this._orchestrator.matcher.match(
      tasks.flatMap(t => t.capabilities || [t.agentType].filter(Boolean)),
      { intent, preferredAgent: reasoningResult?.recommendedAgents?.[0]?.type }
    )

    trace.stages.push(WORKFLOW_STAGES.AGENT_SELECTION)
    const selectedAgents = matches.slice(0, Math.min(3, tasks.length)).map(m => ({
      type: m.agent.type,
      id: m.agent.id,
      score: m.score,
    }))

    trace.stages.push(WORKFLOW_STAGES.EXECUTION_PLAN)
    const executionPlan = {
      mode: reasoningResult?.executionPlan?.executionType === 'parallel' ? 'parallel' : 'sequential',
      tasks: tasks.map((t, i) => ({
        ...t,
        agentType: t.agentType || selectedAgents[i]?.type || selectedAgents[0]?.type,
        agentId: selectedAgents[i]?.id || selectedAgents[0]?.id,
      })),
    }

    trace.stages.push(WORKFLOW_STAGES.DEPENDENCY_GRAPH)
    const graph = this._orchestrator.dependencies.buildGraph(executionPlan.tasks)
    const parallelGroups = this._orchestrator.dependencies.getParallelGroups(executionPlan.tasks)

    trace.stages.push(WORKFLOW_STAGES.EXECUTION_QUEUE)
    const execution = await this._orchestrator.executePlan(executionPlan, {
      runId: trace.runId,
      command,
      context,
    })

    trace.stages.push(WORKFLOW_STAGES.RESULT_VALIDATION)
    const validation = this._orchestrator.aggregator.validate(execution.results || [])

    trace.stages.push(WORKFLOW_STAGES.MERGE_RESULTS)
    const merged = this._orchestrator.aggregator.merge(execution.results || [])

    trace.stages.push(WORKFLOW_STAGES.FINAL_RESPONSE)
    const finalResponse = this._orchestrator.aggregator.buildFinalResponse(merged, reasoningResult)

    return {
      runId: trace.runId,
      intent,
      goal,
      selectedAgents,
      executionPlan,
      graph,
      parallelGroups,
      execution,
      validation,
      merged,
      finalResponse,
      trace,
    }
  }
}

module.exports = { WorkflowEngine, WORKFLOW_STAGES }
