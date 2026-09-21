/**
 * MJ Response Builder
 * Builds standardized responses from reasoning pipeline output.
 * @module mj/services/ResponseBuilder
 */

const { createResponse } = require('../types')
const { MJLogger } = require('../logger')

class ResponseBuilder {
  constructor() {
    this._logger = MJLogger.child('ResponseBuilder')
  }

  /**
   * Build response from pipeline context.
   * @param {Object} pipelineContext
   * @returns {Object}
   */
  build(pipelineContext) {
    const {
      command,
      plan,
      selectedAgent,
      correlationId,
      reasoningResult,
    } = pipelineContext

    const content = reasoningResult?.response || ''
    const structured = reasoningResult || null

    const response = createResponse(command.id, content, {
      metadata: {
        planId: plan?.id,
        agentType: selectedAgent?.type || selectedAgent?.name,
        correlationId,
        pipelineComplete: true,
        reasoning: structured ? {
          requestId: structured.requestId,
          intent: structured.intent,
          goal: structured.goal,
          reasoningSummary: structured.reasoningSummary,
          executionPlan: structured.executionPlan,
          recommendedAgents: structured.recommendedAgents,
          confidence: structured.confidence,
          estimatedTime: structured.estimatedTime,
          warnings: structured.warnings,
          tokens: structured.metadata?.tokens,
          provider: structured.metadata?.provider,
        } : null,
      },
      success: true,
    })

    response.structured = structured

    this._logger.debug('Response built', {
      responseId: response.id,
      intent: structured?.intent?.type,
      hasContent: !!content,
    })
    return response
  }
}

module.exports = { ResponseBuilder }
