/**
 * Structured AI Response Builder
 * @module mj/brain/response/AIResponseBuilder
 */

const { generateId } = require('../../utils')

class AIResponseBuilder {
  build(params = {}) {
    const {
      requestId,
      intent,
      goal,
      reasoningTrace,
      executionPlan,
      tasks,
      executionGraph,
      aiResponse,
      tokenSummary,
      warnings = [],
      metadata = {},
    } = params

    const reasoningSummary = (reasoningTrace || [])
      .map(r => `[${r.stage}] ${r.detail}`)
      .join(' → ')

    return {
      requestId,
      intent: {
        type: intent?.intent || 'unknown',
        confidence: intent?.confidence || 0,
        method: intent?.method || 'unknown',
      },
      goal: {
        primary: goal?.primaryGoal || null,
        secondary: goal?.secondaryGoals || [],
        requiredSkills: goal?.requiredSkills || [],
        expectedOutput: goal?.expectedOutput || null,
        complexity: goal?.estimatedComplexity || 'medium',
        riskLevel: goal?.riskLevel || 'low',
        executionType: goal?.executionType || 'immediate',
      },
      reasoningSummary,
      reasoningStages: reasoningTrace || [],
      executionPlan: {
        type: executionPlan?.executionType || 'sequential',
        tasks: tasks || [],
        executionGraph: executionGraph || {},
        estimatedTimeMinutes: executionPlan?.estimatedTimeMinutes || 15,
        taskCount: tasks?.length || 0,
      },
      recommendedAgents: executionPlan?.recommendedAgents || [],
      confidence: intent?.confidence || 0,
      estimatedTime: `${executionPlan?.estimatedTimeMinutes || 15} minutes`,
      response: aiResponse?.content || '',
      warnings,
      metadata: {
        ...metadata,
        provider: aiResponse?.provider || null,
        model: aiResponse?.model || null,
        fallbackUsed: aiResponse?.fallbackUsed || false,
        tokens: tokenSummary ? {
          input: tokenSummary.inputTokens,
          output: tokenSummary.outputTokens,
          total: tokenSummary.totalTokens,
          estimatedCost: tokenSummary.estimatedCost,
          executionTimeMs: tokenSummary.executionTimeMs,
        } : null,
        responseId: generateId('ai_res'),
        timestamp: Date.now(),
      },
    }
  }

  buildError(params = {}) {
    const { requestId, error, warnings = [], partial = {} } = params
    return {
      requestId,
      intent: partial.intent ? { type: partial.intent.intent, confidence: partial.intent.confidence } : { type: 'unknown', confidence: 0 },
      goal: partial.goal ? { primary: partial.goal.primaryGoal } : null,
      reasoningSummary: 'Pipeline error occurred',
      executionPlan: null,
      recommendedAgents: [],
      confidence: 0,
      estimatedTime: null,
      response: '',
      warnings: [...warnings, { type: 'error', message: error }],
      metadata: { error: true, timestamp: Date.now() },
    }
  }
}

module.exports = { AIResponseBuilder }
