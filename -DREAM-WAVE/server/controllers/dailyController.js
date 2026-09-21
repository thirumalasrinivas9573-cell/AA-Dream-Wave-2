const { robustAiCall } = require('../services/openaiService')

const FALLBACK = {
  tip:         'Small steps every day lead to big results.',
  action:      'Identify your top priority and work on it for 30 minutes.',
  affirmation: 'Every expert was once a beginner.',
  advice:      'Keep going. The hardest part is showing up consistently. You are doing it.',
}

// @desc  GET /api/daily  — daily insight (no body required)
// @desc  POST /api/daily — daily insight (with optional category/query)
exports.getDailyAdvice = async (req, res) => {
  try {
    const category = req.body?.category || 'General'
    const query    = req.body?.query    || 'Give me a motivational insight for a student working on their career goals today.'

    const messages = [
      {
        role: 'system',
        content: 'You are a calm, supportive daily life coach for ambitious students. Return JSON only — no markdown, no code blocks.',
      },
      {
        role: 'user',
        content: `Category: ${category}\nRequest: ${query}\n\nReturn JSON:\n{ "tip": "one practical sentence", "action": "one specific thing to do today", "affirmation": "a short positive statement", "advice": "2-3 sentences of deeper motivational advice for a learner" }`,
      },
    ]

    const result = await robustAiCall(messages, 'gpt-3.5-turbo', FALLBACK)

    res.json({ success: true, ...result })
  } catch (error) {
    console.error('[dailyController]', error.message)
    res.json({ success: true, ...FALLBACK })
  }
}
