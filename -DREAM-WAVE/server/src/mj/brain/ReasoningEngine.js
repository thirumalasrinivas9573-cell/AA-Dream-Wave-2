/**
 * MJ Reasoning Engine
 * Delegates to ReasoningPipeline — MJ thinks before answering.
 * @module mj/brain/ReasoningEngine
 */

const { getAIBrain } = require('./AIBrain')
const { MJLogger } = require('../logger')

class ReasoningEngine {
  constructor(aiBrain = null) {
    this._logger = MJLogger.child('ReasoningEngine')
    this._aiBrain = aiBrain
  }

  _getBrain() {
    return this._aiBrain || getAIBrain()
  }

  /**
   * Process command through full reasoning pipeline.
   * @param {Object} params
   * @returns {Promise<Object>} Structured AI response
   */
  async process(params = {}) {
    const brain = this._getBrain().initialize()
    this._logger.ai('Reasoning pipeline starting', {
      commandId: params.command?.id,
      correlationId: params.correlationId,
    })

    return brain.reasoningPipeline.execute(params)
  }

  /** @deprecated Use process() — kept for backward compatibility */
  async reason(params = {}) {
    const result = await this.process(params)
    return {
      conclusion: result.response,
      confidence: result.confidence,
      reasoning: result.reasoningStages,
      suggestedAction: result.executionPlan,
      structured: result,
    }
  }
}

module.exports = { ReasoningEngine }
