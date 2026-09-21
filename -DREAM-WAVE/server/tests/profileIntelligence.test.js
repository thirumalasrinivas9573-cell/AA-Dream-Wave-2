const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const profileIntelligence = require('../services/profileIntelligenceService')

describe('profile AI assistant', () => {
  it('requires draft text before improving a headline', async () => {
    await assert.rejects(
      () => profileIntelligence.improveHeadline({ headline: '', bio: '' }),
      (error) => error.statusCode === 400,
    )
  })

  it('requires about text before improving bio', async () => {
    await assert.rejects(
      () => profileIntelligence.improveAbout({ bio: '', headline: 'Student' }),
      (error) => error.statusCode === 400,
    )
  })

  it('returns deterministic suggestions when OpenAI is unavailable', async () => {
    const original = require('../utils/openaiClient').openai
    require('../utils/openaiClient').openai = {
      chat: {
        completions: {
          create: async () => { throw new Error('Provider unavailable') },
        },
      },
    }
    try {
      await assert.rejects(
        () => profileIntelligence.improveHeadline({ headline: 'Builder', bio: '' }),
        (error) => error.statusCode === 503,
      )
    } finally {
      require('../utils/openaiClient').openai = original
    }
  })
})
