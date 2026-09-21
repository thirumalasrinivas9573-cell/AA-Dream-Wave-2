const mongoose = require('mongoose')
const { generateRoadmap, buildFallbackRoadmap } = require('../services/aiRoadmapService')
const { validateRoadmapPayload } = require('../services/roadmapValidator')
const { generateDailyTasks } = require('../services/aiTaskService')
const Roadmap = require('../models/Roadmap')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const UserProfile = require('../models/UserProfile')
const LearningProfile = require('../models/LearningProfile')
const LearningProgress = require('../models/LearningProgress')
const notificationService = require('../services/notificationService')
const { syncGoalProgress } = require('../services/progressEngine')

const fail = (res, status, message, code = 'ROADMAP_ERROR') => res.status(status).json({ success: false, code, message })
const validId = (id) => mongoose.isValidObjectId(id)

async function ownedGoal(goalId, userId) {
  if (!validId(goalId)) return null
  return Goal.findOne({ _id: goalId, userId })
}

async function notify(userId, data) {
  try {
    await notificationService.createForUser(userId, { channel: 'in-app', source: 'roadmaps', ...data })
  } catch (error) {
    console.warn('[roadmap-notification]', error.message)
  }
}

function emptyRoadmapData(goal) {
  return {
    currentStage: 'Planning',
    overview: goal.description || `Learning roadmap for ${goal.title}`,
    nextSteps: [],
    skills: [],
    courses: [],
    projects: [],
    timeline: [],
    milestones: [],
    books: [],
    tips: [],
  }
}

function uniqueStrings(items = [], limit = 10) {
  return [...new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean))].slice(0, limit)
}

function slug(value) {
  return String(value || '').trim().toLowerCase()
}

async function loadUserContext(userId, goal, overrides = {}) {
  const [profile, learningProfile, progressItems] = await Promise.all([
    UserProfile.findOne({ userId }).lean(),
    LearningProfile.findOne({ user: userId }).lean(),
    LearningProgress.find({ user: userId }).sort({ updatedAt: -1 }).limit(12).lean(),
  ])

  const confirmedSkills = uniqueStrings(Array.isArray(overrides.skills) ? overrides.skills : String(overrides.skills || '').split(','))
  const profileSkills = uniqueStrings(profile?.skills || [])
  const interests = uniqueStrings(Array.isArray(overrides.interests) ? overrides.interests : String(overrides.interests || '').split(',').concat(profile?.interests || []))
  const focusAreas = uniqueStrings([...(profile?.learningPreferences?.focusAreas || []), ...(learningProfile?.focusAreas || [])])
  const strengths = uniqueStrings((learningProfile?.strengths || []).map((item) => item.skill))
  const weaknesses = uniqueStrings((learningProfile?.weaknesses || []).map((item) => item.skill))
  const completedProgress = (progressItems || []).filter((item) => item.completed)

  return {
    age: overrides.age || '',
    education: overrides.education || '',
    goalTitle: goal.title,
    goalCategory: goal.category,
    goalDescription: goal.description || '',
    targetRole: profile?.targetRole || '',
    currentRole: profile?.currentRole || '',
    currentLevel: goal.difficulty || '',
    weeklyStudyHours: goal.weeklyStudyHours || 0,
    deadline: goal.deadline || null,
    confirmedSkills,
    profileSkills,
    interests,
    focusAreas,
    learningStyle: learningProfile?.learningStyle || '',
    preferredPace: learningProfile?.preferredPace || '',
    learningStrengths: strengths,
    learningWeaknesses: weaknesses,
    progressEvidence: completedProgress.slice(0, 6).map((item) => `${item.label} (${item.kind})`),
    recentLearning: progressItems.slice(0, 6).map((item) => ({
      label: item.label,
      kind: item.kind,
      percent: item.percent,
      completed: item.completed,
    })),
    databaseSignals: uniqueStrings([
      goal.description && 'goal description',
      profile?.targetRole && 'target role',
      profileSkills.length && 'stored skills',
      interests.length && 'interests',
      focusAreas.length && 'focus areas',
      strengths.length && 'learning strengths',
      progressItems.length && 'recent learning progress',
    ]),
  }
}

function attachTransparency(data, context, fallback = false) {
  const confirmedUserData = uniqueStrings([
    'goal title',
    context.goalDescription ? 'goal description' : '',
    context.currentLevel ? 'current level' : '',
    context.weeklyStudyHours ? 'weekly study hours' : '',
    context.confirmedSkills.length ? 'confirmed skills' : '',
    context.interests.length ? 'interests' : '',
  ], 8)

  return {
    ...data,
    transparency: {
      confirmedUserData,
      databaseSignals: context.databaseSignals || [],
      aiInferences: fallback ? ['stage ordering', 'skill-gap prioritization'] : ['skill-gap prioritization', 'stage sequencing', 'resource suggestions'],
      needsUserConfirmation: uniqueStrings([
        !context.targetRole ? 'target role' : '',
        !context.confirmedSkills.length ? 'current skills' : '',
        !context.deadline ? 'deadline' : '',
        !context.weeklyStudyHours ? 'weekly study hours' : '',
      ]),
      label: fallback ? 'SYSTEM-GENERATED FALLBACK' : 'AI_GENERATED_WITH_CONTEXT',
    },
  }
}

function preserveGeneratedProgress(existingRoadmap, roadmapData) {
  if (!existingRoadmap) return roadmapData
  const nextStepsByTitle = new Map((existingRoadmap.data?.nextSteps || []).map((step) => [slug(step.title), step]))
  const stageByTitle = new Map((existingRoadmap.learningStages || []).map((stage) => [slug(stage.title), stage]))

  return {
    ...roadmapData,
    nextSteps: (roadmapData.nextSteps || []).map((step) => {
      const existing = nextStepsByTitle.get(slug(step.title))
      return existing ? { ...step, completed: Boolean(existing.completed) } : step
    }),
    learningStages: (roadmapData.learningStages || []).map((stage, index) => {
      const existing = stageByTitle.get(slug(stage.title))
      return existing ? {
        ...stage,
        order: index + 1,
        status: existing.status || stage.status,
        progress: Number.isFinite(existing.progress) ? existing.progress : stage.progress,
      } : stage
    }),
  }
}

function preserveGeneratedTasks(existingTasks = [], tasksToCreate = []) {
  const existingByTitle = new Map(existingTasks.map((task) => [slug(task.title), task]))
  return tasksToCreate.map((task) => {
    const existing = existingByTitle.get(slug(task.title))
    if (!existing) return task
    return {
      ...task,
      completed: Boolean(existing.completed),
      completedAt: existing.completedAt || undefined,
      status: existing.status || (existing.completed ? 'completed' : task.status || 'todo'),
      progress: existing.progress || (existing.completed ? 100 : 0),
      actualMinutes: existing.actualMinutes || 0,
    }
  })
}

exports.getRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ userId: req.user._id })
      .populate('goalId', 'title category status progress deadline')
      .sort({ updatedAt: -1 })
      .lean()
    return res.json({ success: true, roadmaps })
  } catch (error) {
    console.error('[roadmapController.getRoadmaps]', error.message)
    return fail(res, 500, 'Failed to load roadmaps.')
  }
}

exports.initializeRoadmap = async (req, res) => {
  try {
    const { goalId } = req.body
    if (!goalId || !validId(goalId)) return fail(res, 400, 'A valid goal ID is required.', 'INVALID_ID')
    const goal = await ownedGoal(goalId, req.user._id)
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const existing = await Roadmap.findOne({ goalId: goal._id, userId: req.user._id })
    if (existing) return res.json({ success: true, roadmap: existing, created: false })
    const roadmap = await Roadmap.create({
      goalId: goal._id,
      userId: req.user._id,
      data: emptyRoadmapData(goal),
      status: 'draft',
      architecture: {
        schemaVersion: 'learning-roadmap-v1',
        source: 'manual',
        estimatedCompletion: goal.deadline,
      },
      progress: { percent: goal.progress || 0, completedSteps: 0, totalSteps: 0, lastUpdatedAt: new Date() },
    })
    notify(req.user._id, {
      type: 'roadmap',
      title: 'Learning roadmap started',
      body: `Your roadmap workspace for “${goal.title}” is ready.`,
      link: `/student/roadmap?goalId=${goal._id}`,
      meta: { goalId: goal._id, roadmapId: roadmap._id, event: 'initialized' },
    })
    return res.status(201).json({ success: true, roadmap, created: true })
  } catch (error) {
    console.error('[roadmapController.initializeRoadmap]', error.message)
    return fail(res, 500, 'Failed to initialize roadmap.')
  }
}

exports.updateArchitecture = async (req, res) => {
  try {
    if (!validId(req.params.goalId)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const roadmap = await Roadmap.findOne({ goalId: req.params.goalId, userId: req.user._id })
    if (!roadmap) return fail(res, 404, 'Roadmap not found.', 'NOT_FOUND')
    const arrayFields = [
      'learningStages',
      'weeklyPlans',
      'monthlyPlans',
      'learningResources',
      'practiceProjects',
      'revisionSessions',
      'assessmentPoints',
    ]
    for (const field of arrayFields) {
      if (req.body[field] !== undefined) {
        if (!Array.isArray(req.body[field]) || req.body[field].length > 100) {
          return fail(res, 400, `${field} must be an array with at most 100 items.`, 'VALIDATION_ERROR')
        }
        roadmap[field] = req.body[field]
      }
    }
    if (req.body.status !== undefined) {
      if (!['draft', 'active', 'paused', 'archived'].includes(req.body.status)) return fail(res, 400, 'Invalid roadmap status.', 'VALIDATION_ERROR')
      roadmap.status = req.body.status
    }
    if (req.body.estimatedCompletion !== undefined) {
      if (!req.body.estimatedCompletion) roadmap.architecture.estimatedCompletion = undefined
      else {
        const date = new Date(req.body.estimatedCompletion)
        if (Number.isNaN(date.getTime())) return fail(res, 400, 'Invalid estimated completion date.', 'VALIDATION_ERROR')
        roadmap.architecture.estimatedCompletion = date
      }
    }
    roadmap.version += 1
    await roadmap.save()
    return res.json({ success: true, roadmap })
  } catch (error) {
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    console.error('[roadmapController.updateArchitecture]', error.message)
    return fail(res, 500, 'Failed to update roadmap architecture.')
  }
}

exports.createRoadmap = async (req, res) => {
  const { goalId, age, education, skills, interests, resetProgress = false } = req.body
  if (!goalId || !validId(goalId)) return fail(res, 400, 'A valid goal ID is required.', 'INVALID_ID')

  const goal = await ownedGoal(goalId, req.user._id)
  if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')

  try {
    const existingRoadmap = await Roadmap.findOne({ goalId: goal._id, userId: req.user._id })
    const userContext = await loadUserContext(req.user._id, goal, { age, education, skills, interests })
    const rawData = await generateRoadmap(goal.title, goal.category, userContext)
    const validated = validateRoadmapPayload(rawData)
    const fallbackData = attachTransparency(buildFallbackRoadmap(goal, userContext), userContext, true)
    const mergedData = validated.valid ? attachTransparency({ ...rawData, ...validated.data }, userContext, false) : fallbackData
    const roadmapData = preserveGeneratedProgress(existingRoadmap, mergedData)
    const learningStages = (roadmapData.learningStages || []).length
      ? roadmapData.learningStages
      : (roadmapData.nextSteps || []).map((step, index) => ({
          title: step.title || `Step ${index + 1}`,
          description: step.description || '',
          order: index + 1,
          status: index === 0 ? 'available' : 'locked',
          progress: step.completed ? 100 : 0,
        }))
    const roadmap = await Roadmap.findOneAndUpdate(
      { goalId: goal._id, userId: req.user._id },
      {
        $set: {
          data: roadmapData,
          learningStages,
          status: 'active',
          'architecture.schemaVersion': 'learning-roadmap-v1',
          'architecture.source': validated.valid ? 'ai' : 'fallback',
          'architecture.generatedAt': new Date(),
          'architecture.estimatedCompletion': goal.deadline,
        },
        $inc: { version: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    try {
      const generated = await generateDailyTasks(goal.title, goal.category, roadmapData)
      const days = Array.isArray(generated?.days) ? generated.days : []
      const existingTasks = await Task.find({
        roadmapId: roadmap._id,
        userId: req.user._id,
        $or: [{ source: { $in: ['ai', 'roadmap'] } }, { source: { $exists: false } }],
      }).lean()
      const tasksToCreate = preserveGeneratedTasks(existingTasks, days.flatMap((dayInfo) => (
        Array.isArray(dayInfo.tasks) ? dayInfo.tasks.map((task) => ({
          userId: req.user._id,
          goalId: goal._id,
          roadmapId: roadmap._id,
          source: 'roadmap',
          day: dayInfo.day,
          type: task.type,
          title: task.title,
          description: task.description,
          estimatedTime: task.estimatedTime,
          category: goal.category,
          completed: false,
          status: 'todo',
        })) : []
      )).filter((task) => task.title))

      await Task.deleteMany({
        roadmapId: roadmap._id,
        userId: req.user._id,
        $or: [{ source: { $in: ['ai', 'roadmap'] } }, { source: { $exists: false } }],
      })
      if (tasksToCreate.length) await Task.insertMany(tasksToCreate)
      if (resetProgress === true && !existingRoadmap) {
        await Goal.updateOne({ _id: goal._id, userId: req.user._id }, { $set: { progress: 0, completed: false } })
      }
    } catch (taskErr) {
      console.error('[roadmapController] Task generation failed:', taskErr.message)
    }

    await syncGoalProgress(goal._id, req.user._id, 'Roadmap generated')
    return res.json({ success: true, roadmap })
  } catch (error) {
    console.error('[roadmapController.createRoadmap]', error.message)
    const isQuota = error?.status === 429 || error?.code === 'insufficient_quota'
    if (isQuota) {
      const userContext = await loadUserContext(req.user._id, goal, { age, education, skills, interests })
      const fallbackRoadmap = attachTransparency(buildFallbackRoadmap(goal, userContext), userContext, true)
      const roadmap = await Roadmap.findOneAndUpdate(
        { goalId: goal._id, userId: req.user._id },
        {
          $set: {
            data: fallbackRoadmap,
            status: 'active',
            'architecture.schemaVersion': 'learning-roadmap-v1',
            'architecture.source': 'fallback',
            'architecture.generatedAt': new Date(),
            'architecture.estimatedCompletion': goal.deadline,
          },
          $inc: { version: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      return res.json({ success: true, roadmap, fallback: true })
    }
    return fail(res, 502, 'Failed to generate roadmap.', 'AI_SERVICE_ERROR')
  }
}

exports.getRoadmap = async (req, res) => {
  try {
    if (!validId(req.params.goalId)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    const goal = await ownedGoal(req.params.goalId, req.user._id)
    if (!goal) return fail(res, 404, 'Goal not found.', 'NOT_FOUND')
    const roadmap = await Roadmap.findOne({ goalId: goal._id, userId: req.user._id })
    if (!roadmap) return fail(res, 404, 'No roadmap found for this goal.', 'NOT_FOUND')
    return res.json({ success: true, roadmap })
  } catch (error) {
    console.error('[roadmapController.getRoadmap]', error.message)
    return fail(res, 500, 'Failed to load roadmap.')
  }
}

exports.updateTaskStatus = async (req, res) => {
  try {
    if (!validId(req.params.goalId)) return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    if (typeof req.body.completed !== 'boolean') return fail(res, 400, 'completed must be a boolean.', 'VALIDATION_ERROR')
    const roadmap = await Roadmap.findOne({ goalId: req.params.goalId, userId: req.user._id })
    if (!roadmap) return fail(res, 404, 'Roadmap not found.', 'NOT_FOUND')

    let allSteps
    if (Array.isArray(roadmap.data?.nextSteps)) {
      const stepIndex = Number(req.body.stepIndex)
      if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= roadmap.data.nextSteps.length) {
        return fail(res, 400, 'Invalid step index.', 'VALIDATION_ERROR')
      }
      roadmap.data.nextSteps[stepIndex].completed = req.body.completed
      allSteps = roadmap.data.nextSteps
    } else if (Array.isArray(roadmap.data?.phases)) {
      const phaseIndex = Number(req.body.phaseIndex)
      const taskIndex = Number(req.body.taskIndex)
      const tasks = roadmap.data.phases[phaseIndex]?.tasks
      if (!Number.isInteger(phaseIndex) || !Number.isInteger(taskIndex) || !Array.isArray(tasks) || !tasks[taskIndex]) {
        return fail(res, 400, 'Invalid phase or task index.', 'VALIDATION_ERROR')
      }
      tasks[taskIndex].completed = req.body.completed
      allSteps = roadmap.data.phases.flatMap((phase) => Array.isArray(phase.tasks) ? phase.tasks : [])
    } else {
      return fail(res, 400, 'Invalid roadmap format for task update.', 'VALIDATION_ERROR')
    }

    roadmap.markModified('data')
    await roadmap.save()
    const total = allSteps.length
    const done = allSteps.filter((step) => step.completed).length
    const progress = total ? Math.round((done / total) * 100) : 0
    roadmap.progress = { percent: progress, completedSteps: done, totalSteps: total, lastUpdatedAt: new Date() }
    await roadmap.save()
    await syncGoalProgress(req.params.goalId, req.user._id, 'Roadmap step updated')
    return res.json({ success: true, roadmap, progress: roadmap.progress?.percent })
  } catch (error) {
    console.error('[roadmapController.updateTaskStatus]', error.message)
    return fail(res, 500, 'Failed to update roadmap progress.')
  }
}
