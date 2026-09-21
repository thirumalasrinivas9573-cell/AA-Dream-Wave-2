/**
 * Decision Intelligence Engine (V4 Prompt 8).
 * Coordinates decisionSupport + POL + memory + brain insights.
 * Does NOT replace decisionSupportService / progressEngine.
 */
const mongoose = require('mongoose')
const crypto = require('crypto')
const IntelligenceDecision = require('../models/IntelligenceDecision')
const decisionSupportService = require('./decisionSupportService')
const limits = require('../config/intelligenceLimits')

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  throw err
}

function requireUserId(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  }
  return String(userId)
}

function mapConfidence(priority) {
  if (priority === 'critical' || priority === 'high') return 'HIGH'
  if (priority === 'medium' || priority === 'normal') return 'MEDIUM'
  if (priority === 'low') return 'LOW'
  return 'UNKNOWN'
}

function toActionCard(item, role = 'PRIMARY') {
  if (!item) return null
  return {
    role,
    type: item.type || 'GENERAL',
    title: item.title || item.label || 'Continue your current focus',
    why: item.reason || item.why || 'Based on your live goals, tasks, and deadlines.',
    priority: item.priority || 'medium',
    confidence: mapConfidence(item.priority),
    url: item.action?.url || item.url || '/student/intelligence',
    label: item.action?.label || 'Open',
    sources: item.sourceSignals || item.sources || [],
    fingerprint: item.fingerprint || null,
    tradeOff: item.tradeOff || null,
    effort: item.effort || null,
    requiresApproval: Boolean(item.requiresApproval),
  }
}

function buildAlternatives(recommendations = [], primaryFp) {
  return recommendations
    .filter((r) => r.fingerprint !== primaryFp)
    .slice(0, limits.MAX_ALTERNATIVES)
    .map((r, i) => toActionCard({
      ...r,
      tradeOff: r.tradeOff || `Option ${String.fromCharCode(65 + i)}: different focus than the primary action.`,
      effort: r.effort || (r.priority === 'high' ? 'medium' : 'low'),
    }, `OPTION_${String.fromCharCode(65 + i)}`))
}

function buildRisks(snapshot, primary) {
  const risks = []
  const overdue = (snapshot.tasks || []).filter((t) => {
    if (t.completed || t.status === 'completed') return false
    return t.dueDate && new Date(t.dueDate) < new Date()
  })
  if (overdue.length) {
    risks.push({
      level: 'HIGH',
      text: `${overdue.length} overdue task(s) may block goal progress.`,
      entityType: 'task',
    })
  }
  const apps = snapshot.applications || []
  const draft = apps.filter((a) => /draft|incomplete|in.?progress/i.test(String(a.status || '')))
  if (draft.length && primary?.type === 'CAREER') {
    risks.push({
      level: 'MEDIUM',
      text: 'Incomplete applications may miss deadlines if delayed further.',
      entityType: 'application',
    })
  }
  if (!primary) {
    risks.push({ level: 'LOW', text: 'Limited live signals — recommendation confidence is reduced.', entityType: 'system' })
  }
  return risks.slice(0, 4)
}

/**
 * Full decision: primary + alternatives + risks + confidence + approval flag.
 */
async function decide(userId, { question = '', domain = null, persist = true } = {}) {
  const uid = requireUserId(userId)
  let snapshot
  let primaryRaw
  let recommendations = []
  let memoryNote = null
  let pol = null

  try {
    snapshot = await decisionSupportService.loadSnapshot(uid)
    primaryRaw = decisionSupportService.buildNextBestAction(snapshot)
    const recBundle = await decisionSupportService.getRecommendations(uid, { limit: 8 }).catch(() => [])
    recommendations = Array.isArray(recBundle) ? recBundle : (recBundle?.items || [])
  } catch (err) {
    return {
      state: 'PARTIAL',
      primary: null,
      alternatives: [],
      risks: [{ level: 'HIGH', text: `Decision data partially unavailable: ${err.message}`, entityType: 'system' }],
      confidence: 'UNKNOWN',
      requiresApproval: false,
      why: 'Canonical systems could not be fully loaded. Platform data remains usable.',
      question: String(question || '').slice(0, 500),
    }
  }

  // Optional POL + memory enrichment (never fail decision)
  try {
    const polSvc = require('./personalOperatingLayerService')
    pol = await polSvc.getPersonalOperatingLayer(uid).catch(() => null)
  } catch { /* optional */ }

  try {
    const memoryService = require('./memoryService')
    const settings = await memoryService.getMemorySettings(uid).catch(() => ({ personalizationEnabled: true }))
    if (settings.personalizationEnabled !== false) {
      const mems = await memoryService.getRelevantMemories(uid, {
        message: question || domain || 'what should I do next',
        intent: domain === 'career' ? 'CAREER_HELP' : domain === 'learning' ? 'STUDY_HELP' : 'PLANNER_HELP',
        limit: 3,
        markUsed: false,
      })
      if (mems.length) {
        memoryNote = `Using preferences you previously shared: ${mems.slice(0, 2).map((m) => m.content).join('; ')}.`
      }
    }
  } catch { /* memory optional */ }

  // Domain-specific nudge
  const q = String(question || '').toLowerCase()
  if (/\b(apply|internship|opportunity|job)\b/.test(q) || domain === 'career') {
    const careerRec = recommendations.find((r) => /career|application|opportun/i.test(String(r.type || r.title || '')))
    if (careerRec) primaryRaw = careerRec
  } else if (/\b(learn|skill|study|read|book)\b/.test(q) || domain === 'learning') {
    const learnRec = recommendations.find((r) => /learn|study|skill|book|roadmap/i.test(String(r.type || r.title || '')))
    if (learnRec) primaryRaw = learnRec
  } else if (/\b(project|build|portfolio)\b/.test(q) || domain === 'project') {
    const projRec = recommendations.find((r) => /project|build|portfolio/i.test(String(r.type || r.title || '')))
    if (projRec) primaryRaw = projRec
  }

  const primary = toActionCard(primaryRaw, 'PRIMARY')
  const alternatives = buildAlternatives(recommendations, primary?.fingerprint)
  const risks = buildRisks(snapshot, primary)
  const confidence = primary?.confidence || 'UNKNOWN'
  const requiresApproval = Boolean(
    primary?.requiresApproval
    || /submit|send|publish|email|external/i.test(String(primary?.title || '') + String(primary?.label || '')),
  )

  const whyParts = [
    primary?.why,
    memoryNote,
    pol?.proactive?.reason || null,
  ].filter(Boolean)

  const result = {
    state: 'SUCCESS',
    primary,
    alternatives,
    optionalActions: alternatives,
    risks,
    confidence,
    requiresApproval,
    why: whyParts.join(' ') || 'Derived from your live goals, tasks, and deadlines.',
    sources: primary?.sources || [],
    question: String(question || '').slice(0, 500),
    memoryNote,
    policy: {
      currentRequestWins: true,
      noAutoExternalActions: true,
      userOverrideWins: true,
    },
  }

  if (persist && primary) {
    const fp = primary.fingerprint || crypto.createHash('sha256')
      .update(`${uid}|${primary.title}|${Date.now()}`).digest('hex').slice(0, 24)
    try {
      const doc = await IntelligenceDecision.create({
        userId: uid,
        kind: 'DECISION',
        request: result.question,
        primaryAction: primary.title,
        why: result.why.slice(0, 600),
        confidence,
        requiresApproval,
        sources: (primary.sources || []).slice(0, 6).map((s) => (
          typeof s === 'string' ? { type: 'signal', title: s } : s
        )),
        fingerprint: fp,
        meta: { alternatives: alternatives.map((a) => a.title), risks: risks.map((r) => r.text) },
      })
      result.decisionId = String(doc._id)
      result.fingerprint = fp
    } catch {
      // audit optional
    }
  }

  return result
}

async function overrideDecision(userId, decisionId, { note = '', accept = false } = {}) {
  const uid = requireUserId(userId)
  if (!mongoose.isValidObjectId(decisionId)) deny('VALIDATION_ERROR', 'Invalid decision id.')
  const doc = await IntelligenceDecision.findOne({ _id: decisionId, userId: uid })
  if (!doc) deny('NOT_FOUND', 'Decision not found.', 404)
  doc.status = accept ? 'ACCEPTED' : 'OVERRIDDEN'
  doc.overrideNote = String(note || '').slice(0, 300)
  await doc.save()
  return {
    decisionId: String(doc._id),
    status: doc.status,
    note: 'User decision wins. Recommendation state updated; canonical data unchanged.',
  }
}

async function feedbackDecision(userId, decisionId, feedback) {
  const uid = requireUserId(userId)
  if (!['helpful', 'not_helpful', 'wrong'].includes(feedback)) {
    deny('INVALID_FEEDBACK', 'Feedback must be helpful, not_helpful, or wrong.')
  }
  if (!mongoose.isValidObjectId(decisionId)) deny('VALIDATION_ERROR', 'Invalid decision id.')
  const doc = await IntelligenceDecision.findOne({ _id: decisionId, userId: uid })
  if (!doc) deny('NOT_FOUND', 'Decision not found.', 404)
  doc.feedback = feedback
  // Feedback must NOT mutate goals/tasks/applications
  await doc.save()
  if (doc.fingerprint && (feedback === 'not_helpful' || feedback === 'wrong')) {
    await decisionSupportService.dismissRecommendation(uid, doc.fingerprint).catch(() => null)
  }
  return { decisionId: String(doc._id), feedback, appliedToCanonicalData: false }
}

async function getDecision(userId, decisionId) {
  const uid = requireUserId(userId)
  if (!mongoose.isValidObjectId(decisionId)) deny('VALIDATION_ERROR', 'Invalid decision id.')
  const doc = await IntelligenceDecision.findOne({ _id: decisionId, userId: uid }).lean()
  if (!doc) deny('NOT_FOUND', 'Decision not found.', 404)
  return doc
}

async function listDecisions(userId, { limit = 10 } = {}) {
  const uid = requireUserId(userId)
  return IntelligenceDecision.find({ userId: uid })
    .sort('-createdAt')
    .limit(Math.min(40, Math.max(1, Number(limit) || 10)))
    .lean()
}

module.exports = {
  decide,
  overrideDecision,
  feedbackDecision,
  getDecision,
  listDecisions,
  mapConfidence,
  toActionCard,
}
