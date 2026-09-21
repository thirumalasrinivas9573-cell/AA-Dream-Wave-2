const intelligenceService = require('../services/intelligenceService')
const recommendationEngine = require('../services/recommendationEngine')
const decisionSupportService = require('../services/decisionSupportService')
const studentContextEngine = require('../services/studentContextEngine')
const knowledgeGraphService = require('../services/knowledgeGraphService')
const learningIntelligenceService = require('../services/learningIntelligenceService')
const personalDailyIntelligenceService = require('../services/personalDailyIntelligenceService')

const fail = (res, status, message, code = 'INTELLIGENCE_ERROR') => res.status(status).json({ success: false, code, message })

exports.home = async (req, res) => {
  try {
    const data = await intelligenceService.getHome(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    console.error('[intelligence.home]', error.message)
    return fail(res, 500, 'AI workspace is temporarily unavailable.')
  }
}

exports.insights = async (req, res) => {
  try {
    const items = await intelligenceService.getDashboardInsights(req.user._id)
    return res.json({ success: true, data: { items } })
  } catch (error) {
    console.error('[intelligence.insights]', error.message)
    return fail(res, 500, 'AI insights are temporarily unavailable.')
  }
}

exports.recommendations = async (req, res) => {
  try {
    const types = String(req.query.types || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    const data = await recommendationEngine.getRecommendations(req.user._id, types.length ? types : null)
    return res.json({ success: true, data })
  } catch (error) {
    console.error('[intelligence.recommendations]', error.message)
    return fail(res, 500, 'Recommendations are temporarily unavailable.')
  }
}

exports.getProfile = async (req, res) => {
  try {
    const profile = await intelligenceService.getOrCreateAiProfile(req.user._id)
    const snapshot = await intelligenceService.buildActivitySnapshot(req.user._id)
    return res.json({
      success: true,
      data: {
        profile,
        activity: intelligenceService.buildPersonalProfile(snapshot),
      },
    })
  } catch (error) {
    console.error('[intelligence.profile.get]', error.message)
    return fail(res, 500, 'AI profile is temporarily unavailable.')
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const profile = await intelligenceService.updatePersonalProfile(req.user._id, req.body || {})
    return res.json({ success: true, profile })
  } catch (error) {
    console.error('[intelligence.profile.update]', error.message)
    return fail(res, 500, 'AI profile update failed.')
  }
}

exports.memory = async (req, res) => {
  try {
    const snapshot = await intelligenceService.buildActivitySnapshot(req.user._id)
    const knowledgeMemory = intelligenceService.buildKnowledgeMemory(snapshot)
    let longTerm = { total: 0, memories: [] }
    try {
      const memoryService = require('../services/memoryService')
      longTerm = await memoryService.listMemories(req.user._id, { status: 'ACTIVE', limit: 40 })
    } catch {
      // optional long-term layer
    }
    return res.json({
      success: true,
      data: {
        ...knowledgeMemory,
        longTermMemories: longTerm.memories,
        longTermTotal: longTerm.total,
        note: 'knowledgeMemory = bookmarks/saved chats; longTermMemories = Prompt 10 StudentMemory',
      },
    })
  } catch (error) {
    console.error('[intelligence.memory]', error.message)
    return fail(res, 500, 'Knowledge memory is temporarily unavailable.')
  }
}

exports.learningDashboard = async (req, res) => {
  try {
    const home = await intelligenceService.getHome(req.user._id)
    const learning = await learningIntelligenceService.getLearningIntelligence(req.user._id).catch(() => null)
    return res.json({
      success: true,
      data: {
        ...home.learningDashboard,
        learningIntelligence: learning
          ? {
            overview: learning.overview,
            nextAction: learning.nextAction,
            skillGaps: learning.skillGaps,
            adaptive: learning.adaptive,
            resources: learning.resources,
          }
          : null,
      },
    })
  } catch (error) {
    console.error('[intelligence.learningDashboard]', error.message)
    return fail(res, 500, 'Learning dashboard is temporarily unavailable.')
  }
}

/** Learning Intelligence workspace (Prompt 7) — ownership from JWT only. */
exports.learningIntelligence = async (req, res) => {
  try {
    const goalId = req.query.goalId || null
    if (goalId && !require('mongoose').isValidObjectId(goalId)) {
      return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    }
    const data = await learningIntelligenceService.getLearningIntelligence(req.user._id, { goalId })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.learningIntelligence]', error.message)
    return fail(res, 500, 'Learning intelligence is temporarily unavailable.')
  }
}

exports.learningSkillGaps = async (req, res) => {
  try {
    const goalId = req.query.goalId || null
    if (goalId && !require('mongoose').isValidObjectId(goalId)) {
      return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    }
    const snapshot = await learningIntelligenceService.loadLearningSnapshot(req.user._id, { goalId })
    const skillGaps = learningIntelligenceService.buildSkillGapAnalysis(snapshot)
    return res.json({ success: true, data: skillGaps })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.learningSkillGaps]', error.message)
    return fail(res, 500, 'Skill gap analysis is temporarily unavailable.')
  }
}

exports.learningNextAction = async (req, res) => {
  try {
    const goalId = req.query.goalId || null
    if (goalId && !require('mongoose').isValidObjectId(goalId)) {
      return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    }
    const data = await learningIntelligenceService.getLearningIntelligence(req.user._id, { goalId })
    return res.json({ success: true, data: data.nextAction })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.learningNextAction]', error.message)
    return fail(res, 500, 'Next learning action is temporarily unavailable.')
  }
}

exports.learningAdaptive = async (req, res) => {
  try {
    const goalId = req.query.goalId || null
    if (goalId && !require('mongoose').isValidObjectId(goalId)) {
      return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    }
    const data = await learningIntelligenceService.getLearningIntelligence(req.user._id, { goalId })
    return res.json({ success: true, data: data.adaptive })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.learningAdaptive]', error.message)
    return fail(res, 500, 'Adaptive roadmap suggestions are temporarily unavailable.')
  }
}

exports.learningProgressReview = async (req, res) => {
  try {
    const goalId = req.query.goalId || null
    if (goalId && !require('mongoose').isValidObjectId(goalId)) {
      return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    }
    const data = await learningIntelligenceService.getLearningIntelligence(req.user._id, { goalId })
    return res.json({ success: true, data: data.progressReview })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.learningProgressReview]', error.message)
    return fail(res, 500, 'Learning progress review is temporarily unavailable.')
  }
}

exports.learningResources = async (req, res) => {
  try {
    const goalId = req.query.goalId || null
    if (goalId && !require('mongoose').isValidObjectId(goalId)) {
      return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    }
    const data = await learningIntelligenceService.getLearningIntelligence(req.user._id, { goalId })
    return res.json({ success: true, data: data.resources })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.learningResources]', error.message)
    return fail(res, 500, 'Learning resources are temporarily unavailable.')
  }
}

exports.learningPlanSuggestion = async (req, res) => {
  try {
    const goalId = req.body?.goalId || req.query.goalId || null
    if (goalId && !require('mongoose').isValidObjectId(goalId)) {
      return fail(res, 400, 'Invalid goal ID.', 'INVALID_ID')
    }
    // Never trust body.userId / studentId
    const data = await learningIntelligenceService.getLearningIntelligence(req.user._id, { goalId })
    return res.json({ success: true, data: data.plan })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.learningPlanSuggestion]', error.message)
    return fail(res, 500, 'Learning plan suggestion is temporarily unavailable.')
  }
}

exports.nextAction = async (req, res) => {
  try {
    if (!knowledgeGraphService.isEnabled()) {
      return fail(res, 503, 'Intelligence layer is temporarily disabled.', 'INTELLIGENCE_DISABLED')
    }
    const action = await decisionSupportService.getNextAction(req.user._id)
    return res.json({ success: true, data: action })
  } catch (error) {
    console.error('[intelligence.nextAction]', error.message)
    return fail(res, 500, 'Next action is temporarily unavailable.')
  }
}

exports.decisionRecommendations = async (req, res) => {
  try {
    if (!knowledgeGraphService.isEnabled()) {
      return fail(res, 503, 'Intelligence layer is temporarily disabled.', 'INTELLIGENCE_DISABLED')
    }
    const types = String(req.query.types || '')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8))
    const items = await decisionSupportService.getRecommendations(req.user._id, {
      types: types.length ? types : null,
      limit,
    })
    return res.json({ success: true, data: { items, version: 'v3' } })
  } catch (error) {
    console.error('[intelligence.decisionRecommendations]', error.message)
    return fail(res, 500, 'Decision recommendations are temporarily unavailable.')
  }
}

exports.contextSummary = async (req, res) => {
  try {
    const data = await studentContextEngine.buildContextSummary(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    console.error('[intelligence.contextSummary]', error.message)
    return fail(res, 500, 'Context summary is temporarily unavailable.')
  }
}

exports.graphSummary = async (req, res) => {
  try {
    if (!knowledgeGraphService.isEnabled()) {
      return fail(res, 503, 'Intelligence layer is temporarily disabled.', 'INTELLIGENCE_DISABLED')
    }
    await knowledgeGraphService.syncFromCanonical(req.user._id)
    const summary = await knowledgeGraphService.getGraphSummary(req.user._id)
    return res.json({ success: true, data: summary })
  } catch (error) {
    console.error('[intelligence.graphSummary]', error.message)
    return fail(res, 500, 'Knowledge graph summary is temporarily unavailable.')
  }
}

exports.dismissRecommendation = async (req, res) => {
  try {
    const fp = String(req.params.fingerprint || '').trim()
    if (!fp) return fail(res, 400, 'Recommendation fingerprint is required.', 'INVALID_FINGERPRINT')
    await decisionSupportService.dismissRecommendation(req.user._id, fp)
    return res.json({ success: true })
  } catch (error) {
    console.error('[intelligence.dismissRecommendation]', error.message)
    return fail(res, 500, 'Failed to dismiss recommendation.')
  }
}

exports.feedbackRecommendation = async (req, res) => {
  try {
    const fp = String(req.params.fingerprint || '').trim()
    const { feedback } = req.body || {}
    if (!fp) return fail(res, 400, 'Recommendation fingerprint is required.', 'INVALID_FINGERPRINT')
    await decisionSupportService.feedbackRecommendation(req.user._id, fp, feedback)
    return res.json({ success: true })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.feedbackRecommendation]', error.message)
    return fail(res, 500, 'Failed to save recommendation feedback.')
  }
}

/** Personal Daily Life Operating Layer (Prompt 8) — JWT ownership only. */
exports.dailyLife = async (req, res) => {
  try {
    const data = await personalDailyIntelligenceService.getDailyLifeIntelligence(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.dailyLife]', error.message)
    return fail(res, 500, 'Daily Life intelligence is temporarily unavailable.')
  }
}

exports.dailyLifeNextAction = async (req, res) => {
  try {
    const data = await personalDailyIntelligenceService.getDailyLifeIntelligence(req.user._id)
    return res.json({ success: true, data: data.nextAction })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.dailyLifeNextAction]', error.message)
    return fail(res, 500, 'Next action is temporarily unavailable.')
  }
}

exports.dailyLifePlan = async (req, res) => {
  try {
    const data = await personalDailyIntelligenceService.getDailyLifeIntelligence(req.user._id)
    return res.json({ success: true, data: data.plan })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.dailyLifePlan]', error.message)
    return fail(res, 500, 'Daily plan is temporarily unavailable.')
  }
}

exports.dailyLifeGaps = async (req, res) => {
  try {
    const data = await personalDailyIntelligenceService.getDailyLifeIntelligence(req.user._id)
    return res.json({ success: true, data: data.gaps })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.dailyLifeGaps]', error.message)
    return fail(res, 500, 'Gap review is temporarily unavailable.')
  }
}

exports.dailyLifeRisks = async (req, res) => {
  try {
    const data = await personalDailyIntelligenceService.getDailyLifeIntelligence(req.user._id)
    return res.json({ success: true, data: data.risks })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.dailyLifeRisks]', error.message)
    return fail(res, 500, 'Progress risk review is temporarily unavailable.')
  }
}

exports.dailyLifeBreakdown = async (req, res) => {
  try {
    const title = String(req.body?.title || req.query?.title || '').trim()
    if (!title) return fail(res, 400, 'Task title is required for breakdown.', 'VALIDATION_ERROR')
    // Never trust body.userId
    const data = personalDailyIntelligenceService.proposeSafeAction(req.user._id, {
      type: 'breakdown_task',
      payload: { title },
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.dailyLifeBreakdown]', error.message)
    return fail(res, 500, 'Task breakdown suggestion failed.')
  }
}

exports.dailyLifeProposeAction = async (req, res) => {
  try {
    const type = String(req.body?.type || '').trim()
    const payload = req.body?.payload || {}
    // Strip mass-assignment fields
    delete payload.userId
    delete payload.ownerId
    delete payload.studentId
    delete payload.institutionId
    delete payload.companyId
    delete payload.role
    delete payload.permissions
    const data = personalDailyIntelligenceService.proposeSafeAction(req.user._id, { type, payload })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.dailyLifeProposeAction]', error.message)
    return fail(res, 500, 'Action proposal failed.')
  }
}

exports.dailyLifeConfirmAction = async (req, res) => {
  try {
    const previewId = String(req.body?.previewId || '').trim()
    const confirmed = Boolean(req.body?.confirmed)
    if (!previewId) return fail(res, 400, 'previewId is required.', 'VALIDATION_ERROR')
    const data = await personalDailyIntelligenceService.confirmSafeAction(req.user._id, {
      previewId,
      confirmed,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.dailyLifeConfirmAction]', error.message)
    return fail(res, 500, 'Action confirmation failed.')
  }
}

// ─── Unified AI Brain (V4 Prompt 1) — coordinates existing services ───────────

const unifiedBrainService = require('../services/unifiedBrainService')

exports.brainAsk = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    delete body.studentId
    const data = await unifiedBrainService.ask(req.user, body.message || '', {
      includeAgent: body.includeAgent === true,
      mode: body.mode || 'READ_ONLY',
      confirmForget: body.confirmForget === true,
      memoryId: body.memoryId || null,
      search: body.search === true,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.brainAsk]', error.message)
    return fail(res, 500, 'Unified AI Brain is temporarily unavailable.')
  }
}

exports.brainContext = async (req, res) => {
  try {
    const data = await unifiedBrainService.buildUnifiedContext(req.user, {
      message: req.query.q || req.body?.message || '',
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.brainContext]', error.message)
    return fail(res, 500, 'Unified context failed.')
  }
}

exports.brainSummary = async (req, res) => {
  try {
    const data = await unifiedBrainService.getIntelligenceSummary(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.brainSummary]', error.message)
    return fail(res, 500, 'Intelligence summary failed.')
  }
}

exports.brainWeekly = async (req, res) => {
  try {
    const data = await unifiedBrainService.getWeeklyIntelligence(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.brainWeekly]', error.message)
    return fail(res, 500, 'Weekly intelligence failed.')
  }
}

exports.brainSearch = async (req, res) => {
  try {
    const q = req.query.q || req.body?.q || ''
    const data = await unifiedBrainService.unifiedDomainSearch(req.user._id, q)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.brainSearch]', error.message)
    return fail(res, 500, 'Unified search failed.')
  }
}

exports.brainMetrics = async (req, res) => {
  try {
    if (!['student', 'admin'].includes(req.user.role)) {
      return fail(res, 403, 'Not allowed.', 'FORBIDDEN')
    }
    return res.json({ success: true, data: unifiedBrainService.getObservability() })
  } catch (error) {
    return fail(res, 500, 'Metrics unavailable.')
  }
}

// ─── Personal AI Operating Layer (V4 Prompt 3) ────────────────────────────────

const personalOperatingLayerService = require('../services/personalOperatingLayerService')

exports.personalHome = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await personalOperatingLayerService.getPersonalOperatingLayer(req.user._id, {
      message: req.query.q || '',
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.personalHome]', error.message)
    return fail(res, 500, 'Personal intelligence is temporarily unavailable.')
  }
}

exports.personalPlan = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    const data = await personalOperatingLayerService.planPersonalRequest(req.user, body.message || '', {
      includeAgents: body.includeAgents === true,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.personalPlan]', error.message)
    return fail(res, 500, 'Personal plan failed.')
  }
}

exports.personalControlsGet = async (req, res) => {
  try {
    const data = await personalOperatingLayerService.getControls(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Controls unavailable.')
  }
}

exports.personalControlsUpdate = async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    delete body.userId
    const data = await personalOperatingLayerService.updateControls(req.user._id, body)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Failed to update controls.')
  }
}

exports.personalHealth = async (req, res) => {
  try {
    const layer = await personalOperatingLayerService.getPersonalOperatingLayer(req.user._id)
    return res.json({
      success: true,
      data: {
        health: layer.health,
        progressTrend: layer.progressTrend,
        overload: layer.overload,
        deadlines: layer.deadlines,
        dependencies: layer.dependencies,
      },
    })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Health summary failed.')
  }
}

exports.personalProactive = async (req, res) => {
  try {
    const layer = await personalOperatingLayerService.getPersonalOperatingLayer(req.user._id)
    return res.json({ success: true, data: layer.proactive })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Proactive intelligence failed.')
  }
}

// ─── Personal Knowledge Graph + Research Knowledge (V4 Prompt 4) ───────────────

const personalKnowledgeIntelligenceService = require('../services/personalKnowledgeIntelligenceService')

exports.knowledgeCenter = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await personalKnowledgeIntelligenceService.getKnowledgeCenter(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.knowledgeCenter]', error.message)
    return fail(res, 500, 'Knowledge center unavailable.')
  }
}

exports.knowledgeSearch = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const q = req.query.q || req.body?.q || ''
    const data = await personalKnowledgeIntelligenceService.searchKnowledge(req.user._id, q, {
      limit: Number(req.query.limit || req.body?.limit) || 24,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Knowledge search failed.')
  }
}

exports.knowledgeAsk = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    const data = await personalKnowledgeIntelligenceService.askKnowledgeQuestion(req.user, body.message || '', {
      researchProjectId: body.researchProjectId || null,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.knowledgeAsk]', error.message)
    return fail(res, 500, 'Knowledge question failed.')
  }
}

exports.knowledgeMap = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await personalKnowledgeIntelligenceService.getPersonalKnowledgeMap(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Knowledge map failed.')
  }
}

exports.knowledgeProjectMap = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await personalKnowledgeIntelligenceService.getProjectKnowledgeMap(req.user._id, req.params.projectId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Project knowledge map failed.')
  }
}

exports.knowledgeGoalMap = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await personalKnowledgeIntelligenceService.getGoalKnowledgeMap(req.user._id, req.params.goalId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Goal knowledge map failed.')
  }
}

exports.knowledgeExplain = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await personalKnowledgeIntelligenceService.explainRelationship(req.user._id, req.params.edgeId)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Relationship explanation failed.')
  }
}

exports.knowledgeSync = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const sync = await personalKnowledgeIntelligenceService.syncResearchKnowledge(req.user._id, { force: true })
    const cleanup = await personalKnowledgeIntelligenceService.cleanupStaleRelationships(req.user._id)
    return res.json({ success: true, data: { sync, cleanup } })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Knowledge sync failed.')
  }
}

exports.knowledgeProcessSource = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const body = { ...(req.body || {}) }
    delete body.userId
    const data = await personalKnowledgeIntelligenceService.processSourceDocument(
      req.user._id,
      req.params.sourceId,
      { rawText: body.rawText, documentFormat: body.documentFormat },
    )
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Document processing failed.')
  }
}

// ─── Continuous Intelligence + Command Center (V4 Prompt 8) ───────────────────

const continuousIntelligenceService = require('../services/continuousIntelligenceService')
const decisionIntelligenceService = require('../services/decisionIntelligenceService')
const intelligenceEventService = require('../services/intelligenceEventService')
const aiCommandRouterService = require('../services/aiCommandRouterService')

exports.commandCenter = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await continuousIntelligenceService.getCommandCenter(req.user)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.commandCenter]', error.message)
    return fail(res, 500, 'AI Command Center is temporarily unavailable.')
  }
}

exports.aiCommand = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    const data = await continuousIntelligenceService.runCommand(req.user, body.message || '', {
      confirmed: body.confirmed === true,
      includeAgents: body.includeAgents === true,
      includeBrain: body.includeBrain === true,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    console.error('[intelligence.aiCommand]', error.message)
    return fail(res, 500, 'Command execution failed.')
  }
}

exports.continuousInsights = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await continuousIntelligenceService.buildInsights(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Insights unavailable.')
  }
}

exports.continuousProgress = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await continuousIntelligenceService.getProgressIntelligence(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Progress intelligence unavailable.')
  }
}

exports.continuousDaily = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await continuousIntelligenceService.getDailyIntelligence(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Daily intelligence unavailable.')
  }
}

exports.continuousWeekly = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await continuousIntelligenceService.getWeeklyIntelligence(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Weekly intelligence unavailable.')
  }
}

exports.continuousDecide = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const body = { ...(req.body || {}) }
    delete body.userId
    const data = await decisionIntelligenceService.decide(req.user._id, {
      question: body.question || body.message || '',
      domain: body.domain || null,
      persist: body.persist !== false,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Decision engine unavailable.')
  }
}

exports.decisionOverride = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const body = { ...(req.body || {}) }
    delete body.userId
    const data = await decisionIntelligenceService.overrideDecision(req.user._id, req.params.id, {
      note: body.note,
      accept: body.accept === true,
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Override failed.')
  }
}

exports.decisionFeedback = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const body = { ...(req.body || {}) }
    delete body.userId
    const data = await decisionIntelligenceService.feedbackDecision(
      req.user._id,
      req.params.id,
      body.feedback,
    )
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Feedback failed.')
  }
}

exports.decisionGet = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await decisionIntelligenceService.getDecision(req.user._id, req.params.id)
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Decision lookup failed.')
  }
}

exports.continuousEvent = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const body = { ...(req.body || {}) }
    delete body.userId
    delete body.ownerId
    const io = req.app.get('io') || null
    const data = await continuousIntelligenceService.processDomainEvent(req.user._id, body, { io })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Event processing failed.')
  }
}

exports.continuousEvents = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await intelligenceEventService.listEvents(req.user._id, {
      limit: req.query.limit,
      eventType: req.query.eventType,
    })
    return res.json({ success: true, data: { events: data } })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Events unavailable.')
  }
}

exports.commandHistory = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await aiCommandRouterService.commandHistory(req.user._id, { limit: req.query.limit })
    return res.json({ success: true, data: { history: data } })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Command history unavailable.')
  }
}

exports.continuousContext = async (req, res) => {
  try {
    if (!req.user?._id) return fail(res, 401, 'Authentication required.', 'AUTH_REQUIRED')
    const data = await continuousIntelligenceService.assembleContext(req.user._id, {
      message: req.query.q || req.query.message || '',
      intent: req.query.intent || 'PLANNING',
    })
    return res.json({ success: true, data })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, error.code)
    return fail(res, 500, 'Context assembly failed.')
  }
}
