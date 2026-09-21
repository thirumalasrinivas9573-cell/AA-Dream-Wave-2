/**
 * Supplemental AI routes that are not provided by aiRoutes.js.
 * Keep this router intentionally small to avoid shadowed duplicate endpoints.
 */
const router = require('express').Router()
const UserProfile = require('../models/UserProfile')
const auth = require('../middleware/auth')
const { sanitizeInput } = require('../middleware/sanitize')
const { openai } = require('../utils/openaiClient')

router.use(sanitizeInput)

router.get('/progress', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $setOnInsert: { userId: req.user._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
    res.json({
      success: true,
      progress: {
        consistencyScore: profile.consistencyScore,
        focusScore: profile.focusScore,
        dailyStreak: profile.dailyStreak,
        lastActivity: profile.lastActivity,
      },
    })
  } catch (err) {
    console.error('[ai/progress]', err.message)
    res.status(500).json({ success: false, message: 'Failed to load progress.' })
  }
})

router.get('/daily-suggestion', auth, async (req, res) => {
  try {
    const Goal = require('../models/Goal')
    const Task = require('../models/Task')
    const [goals, tasks] = await Promise.all([
      Goal.find({ userId: req.user._id, completed: false }).select('title progress').limit(3).lean(),
      Task.find({ userId: req.user._id, completed: false }).select('title').limit(5).lean(),
    ])
    const goalList = goals.map((goal) => `- ${goal.title} (${goal.progress || 0}% done)`).join('\n') || 'No active goals'
    const taskList = tasks.map((task) => `- ${task.title}`).join('\n') || 'No pending tasks'
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a concise career mentor. Return valid JSON only.' },
        { role: 'user', content: `Create today's suggestion from goals:\n${goalList}\nTasks:\n${taskList}. Keys: greeting, focus, action, avoid, affirmation.` },
      ],
    })
    const suggestion = JSON.parse(completion.choices[0].message.content)
    res.json({ success: true, suggestion })
  } catch (err) {
    console.error('[ai/daily-suggestion]', err.message)
    res.status(500).json({ success: false, message: 'Failed to generate suggestion.' })
  }
})

module.exports = router
