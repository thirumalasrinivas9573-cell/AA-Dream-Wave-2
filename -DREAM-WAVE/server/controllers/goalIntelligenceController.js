const goalIntelligence = require('../services/goalIntelligenceService')
const progressEngine = require('../services/progressEngine')
const { validateRoadmapPayload } = require('../services/roadmapValidator')
const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')

const fail = (res, status, message, code = 'GOAL_INTELLIGENCE_ERROR') => res.status(status).json({ success: false, code, message })

exports.suggestGoal = async (req, res) => {
  try {
    const data = await goalIntelligence.suggestGoal(req.user._id, req.body || {})
    return res.json({ success: true, data })
  } catch (error) {
    console.error('[goalIntelligence.suggestGoal]', error.message)
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.clarifyGoal = async (req, res) => {
  try {
    const data = await goalIntelligence.clarifyGoal(req.body || {})
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.getProgress = async (req, res) => {
  try {
    const data = await progressEngine.computeGoalProgress(req.params.goalId, req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, 500, 'Progress calculation failed.')
  }
}

exports.syncProgress = async (req, res) => {
  try {
    const result = await progressEngine.syncGoalProgress(req.params.goalId, req.user._id)
    if (!result) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    return res.json({ success: true, data: result })
  } catch (error) {
    return fail(res, 500, 'Progress sync failed.')
  }
}

exports.getNextAction = async (req, res) => {
  try {
    const action = await progressEngine.getNextBestAction(req.params.goalId, req.user._id)
    if (!action) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    return res.json({ success: true, data: action })
  } catch (error) {
    return fail(res, 500, 'Next action unavailable.')
  }
}

exports.getReview = async (req, res) => {
  try {
    const data = await goalIntelligence.buildGoalReview(req.user._id, req.params.goalId)
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.getWeeklyReview = async (req, res) => {
  try {
    const data = await goalIntelligence.buildWeeklyReview(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, 500, 'Weekly review unavailable.')
  }
}

exports.adaptRoadmapPreview = async (req, res) => {
  try {
    const data = await goalIntelligence.suggestRoadmapAdaptation(req.user._id, req.params.goalId)
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.applyRoadmapAdaptation = async (req, res) => {
  try {
    const data = await goalIntelligence.applyRoadmapAdaptation(req.user._id, req.params.goalId, req.body.suggested || req.body)
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.suggestTasks = async (req, res) => {
  try {
    const data = await goalIntelligence.suggestTasks(req.user._id, req.params.goalId, req.body || {})
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.acceptTasks = async (req, res) => {
  try {
    const tasks = await goalIntelligence.acceptSuggestedTasks(req.user._id, req.params.goalId, req.body.tasks || [])
    return res.json({ success: true, tasks })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.getConflicts = async (req, res) => {
  try {
    const data = await goalIntelligence.detectGoalConflicts(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, 500, 'Conflict detection failed.')
  }
}

exports.validateRoadmap = async (req, res) => {
  try {
    const result = validateRoadmapPayload(req.body || {})
    return res.json({ success: true, ...result })
  } catch (error) {
    return fail(res, 500, 'Validation failed.')
  }
}

exports.saveGoalFromSuggestion = async (req, res) => {
  try {
    const suggestion = req.body.suggestion || req.body
    if (!suggestion?.title) return fail(res, 400, 'Goal title is required.', 'VALIDATION_ERROR')

    const goal = await Goal.create({
      userId: req.user._id,
      title: String(suggestion.title).slice(0, 160),
      description: String(suggestion.description || '').slice(0, 4000),
      category: goalIntelligence.GOAL_CATEGORIES.includes(suggestion.category) ? suggestion.category : 'Personal',
      priority: suggestion.priority || 'Medium',
      difficulty: suggestion.difficulty || 'Intermediate',
      estimatedDuration: suggestion.estimatedDuration || '',
      status: 'planning',
      milestones: (suggestion.milestones || []).map((item) => ({
        title: item.title,
        description: item.description || '',
      })),
      aiPlan: (suggestion.roadmapStages || []).map((stage) => stage.title),
    })

    if ((suggestion.roadmapStages || []).length) {
      await Roadmap.findOneAndUpdate(
        { goalId: goal._id, userId: req.user._id },
        {
          $set: {
            learningStages: suggestion.roadmapStages.map((stage, index) => ({
              title: stage.title,
              description: stage.description || '',
              order: index + 1,
              status: index === 0 ? 'available' : 'locked',
              progress: 0,
              skills: stage.skills || [],
            })),
            status: 'active',
            'architecture.schemaVersion': 'learning-roadmap-v1',
            'architecture.source': 'ai-suggestion',
            'architecture.generatedAt': new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
    }

    return res.status(201).json({ success: true, goal, suggestion })
  } catch (error) {
    return fail(res, 500, 'Failed to save goal from suggestion.')
  }
}
