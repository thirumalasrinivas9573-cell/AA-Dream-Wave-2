/**
 * MJ Goal Analyzer
 * Extracts primary/secondary goals, skills, complexity, risk.
 * @module mj/brain/GoalAnalyzer
 */

const { EXECUTION_TYPES, COMPLEXITY_LEVELS, RISK_LEVELS } = require('../ai/constants')
const { getPromptManager } = require('./prompts')
const { MJLogger } = require('../logger')

class GoalAnalyzer {
  /**
   * @param {import('../ai/FallbackManager').FallbackManager} fallbackManager
   */
  constructor(fallbackManager) {
    this._fallback = fallbackManager
    this._prompts = getPromptManager()
    this._logger = MJLogger.child('GoalAnalyzer')
  }

  _analyzeByRules(input, intent) {
    const wordCount = input.split(/\s+/).length
    const complexity = wordCount > 50 ? COMPLEXITY_LEVELS.HIGH
      : wordCount > 20 ? COMPLEXITY_LEVELS.MEDIUM
        : COMPLEXITY_LEVELS.LOW

    return {
      primaryGoal: input.slice(0, 200),
      secondaryGoals: [],
      requiredSkills: [intent],
      expectedOutput: 'Structured analysis and action plan',
      estimatedComplexity: complexity,
      riskLevel: RISK_LEVELS.LOW,
      executionType: EXECUTION_TYPES.IMMEDIATE,
      method: 'rules',
    }
  }

  /**
   * Analyze goals from user input.
   * @param {string} input
   * @param {Object} intentResult
   * @param {Object} [context]
   * @returns {Promise<Object>}
   */
  async analyze(input, intentResult, context = {}) {
    const messages = this._prompts.buildMessages('planning', `Analyze this request and return JSON with:
- primaryGoal (string)
- secondaryGoals (array of strings)
- requiredSkills (array)
- expectedOutput (string)
- estimatedComplexity (low|medium|high|critical)
- riskLevel (low|medium|high)
- executionType (immediate|sequential|parallel|background|scheduled)

Intent: ${intentResult.intent} (${intentResult.confidence})
Request: "${input}"`, context)

    const result = await this._fallback.execute('structuredJSON', messages, {
      type: 'goal_analysis',
    })

    if (result.data?.primaryGoal) {
      this._logger.ai('Goals analyzed (AI)', { primaryGoal: result.data.primaryGoal })
      return { ...result.data, method: 'ai', provider: result.usedProvider, usage: result.usage }
    }

    return this._analyzeByRules(input, intentResult.intent)
  }
}

module.exports = { GoalAnalyzer }
