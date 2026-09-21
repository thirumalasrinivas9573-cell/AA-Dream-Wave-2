const { generateLesson } = require('../services/aiLessonService')
const { generateVideoScript: generateVideoScriptService } = require('../services/aiLessonService')
const cache = require('../services/responseCache')

// POST /api/lesson/generate
exports.generateLesson = async (req, res) => {
  try {
    const { topic, category = 'General', difficulty = 'Beginner', context = '' } = req.body
    if (!topic?.trim()) return res.status(400).json({ success: false, message: 'Topic is required.' })

    const cacheKey = cache.makeKey('lesson', topic, category, difficulty)
    const cached = cache.get(cacheKey)
    if (cached) return res.json({ success: true, lesson: cached, cached: true })

    const lesson = await generateLesson(topic.trim(), category, difficulty, context)
    cache.set(cacheKey, lesson)

    res.json({ success: true, lesson })
  } catch (err) {
    console.error('[lessonController]', err.message)
    res.status(500).json({ success: false, message: 'Failed to generate lesson.', error: err.message })
  }
}

// POST /api/lesson/video-script
exports.generateVideoScript = async (req, res) => {
  try {
    const { topic, category = 'General', difficulty = 'Beginner' } = req.body
    if (!topic?.trim()) return res.status(400).json({ success: false, message: 'Topic is required.' })

    const cacheKey = cache.makeKey('video-script', topic, category, difficulty)
    const cached = cache.get(cacheKey)
    if (cached) return res.json({ success: true, script: cached, cached: true })

    const script = await generateVideoScriptService(topic.trim(), category, difficulty)
    cache.set(cacheKey, script)

    res.json({ success: true, script })
  } catch (err) {
    console.error('[lessonController/videoScript]', err.message)
    res.status(500).json({ success: false, message: 'Failed to generate video script.', error: err.message })
  }
}

// GET /api/lesson/topics — suggested topics based on user's goals
exports.getSuggestedTopics = async (req, res) => {
  try {
    const Goal = require('../models/Goal')
    const Task = require('../models/Task')

    const [goals, pendingTasks] = await Promise.all([
      Goal.find({ userId: req.user._id, completed: false }).limit(3).lean(),
      Task.find({ userId: req.user._id, completed: false, type: 'learn' }).limit(5).lean(),
    ])

    const suggestions = []

    // From goals
    for (const g of goals) {
      suggestions.push({
        topic: g.title,
        category: g.category,
        source: 'goal',
        reason: 'Your active goal',
      })
    }

    // From pending learn tasks
    for (const t of pendingTasks) {
      suggestions.push({
        topic: t.title,
        category: t.category || 'General',
        source: 'task',
        reason: 'Scheduled lesson',
      })
    }

    res.json({ success: true, suggestions })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get suggestions.' })
  }
}
