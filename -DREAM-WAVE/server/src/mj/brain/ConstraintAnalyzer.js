/**
 * MJ Constraint Analyzer
 * @module mj/brain/ConstraintAnalyzer
 */

const { MJLogger } = require('../logger')

class ConstraintAnalyzer {
  constructor() {
    this._logger = MJLogger.child('ConstraintAnalyzer')
  }

  /**
   * Analyze constraints from context, memory, and goals.
   * @param {Object} params
   * @returns {Object}
   */
  analyze(params = {}) {
    const { command, context, goal, memories, metadata } = params

    const constraints = {
      timeLimit: metadata?.timeLimit || null,
      budget: metadata?.budget || null,
      permissions: metadata?.permissions || [],
      userId: command?.userId || context?.userId || null,
      sessionScope: context?.sessionId || null,
      memoryAvailable: (memories?.length || 0) > 0,
      complexity: goal?.estimatedComplexity || 'medium',
      riskLevel: goal?.riskLevel || 'low',
      blockers: [],
    }

    if (!command?.userId) {
      constraints.blockers.push({ type: 'anonymous', message: 'No user context — limited personalization' })
    }

    this._logger.debug('Constraints analyzed', { blockers: constraints.blockers.length })
    return constraints
  }
}

module.exports = { ConstraintAnalyzer }
