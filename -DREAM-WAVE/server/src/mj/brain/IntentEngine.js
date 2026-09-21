/**
 * MJ Intent Engine
 * Classifies user intent with confidence score.
 * @module mj/brain/IntentEngine
 */

const { INTENT_TYPES } = require('../ai/constants')
const { getPromptManager } = require('./prompts')
const { MJLogger } = require('../logger')

const INTENT_KEYWORDS = {
  [INTENT_TYPES.CODING]: ['code', 'program', 'debug', 'api', 'function', 'react', 'node', 'javascript', 'python', 'bug', 'implement'],
  [INTENT_TYPES.RESEARCH]: ['research', 'analyze', 'study', 'investigate', 'compare', 'report on', 'find out'],
  [INTENT_TYPES.LEARNING]: ['learn', 'teach', 'course', 'study', 'tutorial', 'skill', 'roadmap', 'curriculum'],
  [INTENT_TYPES.BUSINESS]: ['business', 'strategy', 'startup', 'company', 'market', 'revenue'],
  [INTENT_TYPES.FINANCE]: ['finance', 'budget', 'invest', 'money', 'salary', 'cost', 'roi'],
  [INTENT_TYPES.MARKETING]: ['marketing', 'seo', 'campaign', 'brand', 'social media', 'content'],
  [INTENT_TYPES.AUTOMATION]: ['automate', 'workflow', 'script', 'bot', 'schedule'],
  [INTENT_TYPES.PLANNING]: ['plan', 'organize', 'schedule', 'roadmap', 'strategy', 'goal'],
  [INTENT_TYPES.CONVERSATION]: ['hello', 'hi', 'thanks', 'how are you', 'chat'],
  [INTENT_TYPES.DEPLOYMENT]: ['deploy', 'hosting', 'ci/cd', 'docker', 'kubernetes', 'render', 'netlify'],
  [INTENT_TYPES.REPORTS]: ['report', 'analysis', 'summary', 'document'],
  [INTENT_TYPES.RESUME]: ['resume', 'cv', 'job', 'interview', 'career', 'hire'],
  [INTENT_TYPES.CREATIVE]: ['design', 'creative', 'write', 'story', 'video', 'animation'],
  [INTENT_TYPES.PRODUCTIVITY]: ['productivity', 'task', 'focus', 'time management', 'efficient'],
}

class IntentEngine {
  /**
   * @param {import('../ai/FallbackManager').FallbackManager} fallbackManager
   */
  constructor(fallbackManager) {
    this._fallback = fallbackManager
    this._prompts = getPromptManager()
    this._logger = MJLogger.child('IntentEngine')
  }

  /** Rule-based classification fallback */
  _classifyByRules(input) {
    const lower = input.toLowerCase()
    let bestIntent = INTENT_TYPES.GENERAL
    let bestScore = 0.3

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      const matches = keywords.filter(kw => lower.includes(kw)).length
      if (matches > 0) {
        const score = Math.min(0.5 + matches * 0.15, 0.95)
        if (score > bestScore) {
          bestScore = score
          bestIntent = intent
        }
      }
    }

    return { intent: bestIntent, confidence: bestScore, method: 'rules' }
  }

  /**
   * Classify user intent.
   * @param {string} input
   * @param {Object} [context]
   * @returns {Promise<Object>}
   */
  async classify(input, context = {}) {
    const messages = this._prompts.buildMessages('planning', `Classify the intent of this request. Return JSON with: intent (one of: ${Object.values(INTENT_TYPES).join(', ')}), confidence (0-1), reasoning (brief).

Request: "${input}"`, context)

    const result = await this._fallback.execute('structuredJSON', messages, {
      type: 'intent_classification',
      required: ['intent', 'confidence'],
    })

    if (result.data?.intent) {
      this._logger.ai('Intent classified (AI)', { intent: result.data.intent, confidence: result.data.confidence })
      return {
        intent: result.data.intent,
        confidence: result.data.confidence,
        reasoning: result.data.reasoning || null,
        method: 'ai',
        provider: result.usedProvider,
        usage: result.usage,
      }
    }

    const rules = this._classifyByRules(input)
    this._logger.ai('Intent classified (rules)', rules)
    return rules
  }
}

module.exports = { IntentEngine, INTENT_TYPES }
