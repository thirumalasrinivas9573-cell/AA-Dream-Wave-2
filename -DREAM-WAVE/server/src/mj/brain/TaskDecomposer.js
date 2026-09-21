/**
 * MJ Brain Task Decomposer
 * Converts goals into executable tasks with execution graph.
 * @module mj/brain/TaskDecomposer
 */

const { generateId } = require('../utils')
const { getPromptManager } = require('./prompts')
const { MJLogger } = require('../logger')

class BrainTaskDecomposer {
  /**
   * @param {import('../ai/FallbackManager').FallbackManager} fallbackManager
   */
  constructor(fallbackManager) {
    this._fallback = fallbackManager
    this._prompts = getPromptManager()
    this._logger = MJLogger.child('Brain:TaskDecomposer')
  }

  _decomposeByRules(goal, intent) {
    const tasks = [
      { id: generateId('task'), description: `Analyze request: ${goal.primaryGoal?.slice(0, 80)}`, priority: 1, dependencies: [], type: 'sequential', agentType: intent },
      { id: generateId('task'), description: 'Generate execution plan', priority: 2, dependencies: [], type: 'sequential', agentType: 'planning' },
      { id: generateId('task'), description: 'Prepare structured response', priority: 3, dependencies: [], type: 'sequential', agentType: intent },
    ]

    return {
      tasks,
      executionGraph: {
        sequential: tasks.filter(t => t.type === 'sequential').map(t => t.id),
        parallel: tasks.filter(t => t.type === 'parallel').map(t => t.id),
        dependent: tasks.filter(t => t.dependencies.length).map(t => ({ id: t.id, dependsOn: t.dependencies })),
        background: [],
        scheduled: [],
      },
      method: 'rules',
    }
  }

  /**
   * Decompose goal into tasks.
   * @param {Object} goal
   * @param {Object} intentResult
   * @param {Object} [context]
   * @returns {Promise<Object>}
   */
  async decompose(goal, intentResult, context = {}) {
    const messages = this._prompts.buildMessages('planning', `Decompose this goal into executable tasks. Return JSON with:
- tasks: array of { description, priority (1-10), dependencies (array of task indices), type (sequential|parallel|dependent|background|scheduled), agentType }
- executionGraph: { sequential, parallel, dependent, background, scheduled }

Primary Goal: ${goal.primaryGoal}
Intent: ${intentResult.intent}
Complexity: ${goal.estimatedComplexity}`, context)

    const result = await this._fallback.execute('structuredJSON', messages, { type: 'task_decomposition' })

    if (result.data?.tasks?.length) {
      const tasks = result.data.tasks.map((t, i) => ({
        id: generateId('task'),
        ...t,
        status: 'pending',
      }))

      this._logger.planner('Tasks decomposed (AI)', { count: tasks.length })
      return {
        tasks,
        executionGraph: result.data.executionGraph || this._buildGraph(tasks),
        method: 'ai',
        provider: result.usedProvider,
        usage: result.usage,
      }
    }

    return this._decomposeByRules(goal, intentResult.intent)
  }

  _buildGraph(tasks) {
    return {
      sequential: tasks.filter(t => t.type === 'sequential').map(t => t.id),
      parallel: tasks.filter(t => t.type === 'parallel').map(t => t.id),
      dependent: tasks.filter(t => t.dependencies?.length).map(t => ({ id: t.id, dependsOn: t.dependencies })),
      background: tasks.filter(t => t.type === 'background').map(t => t.id),
      scheduled: tasks.filter(t => t.type === 'scheduled').map(t => t.id),
    }
  }
}

module.exports = { BrainTaskDecomposer }
