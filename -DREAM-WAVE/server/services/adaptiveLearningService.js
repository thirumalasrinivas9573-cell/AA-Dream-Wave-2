/**
 * Lasya V5 Prompt 5 — Adaptive Learning Intelligence + Study Coach + Skill Mastery
 * Composes careerCopilot, talentIntelligence, knowledgeDiscovery, personalization, Task — no duplicates.
 */
const crypto = require('crypto')
const LearningProfile = require('../models/LearningProfile')
const SkillEvidence = require('../models/SkillEvidence')
const LearningPlan = require('../models/LearningPlan')
const StudySession = require('../models/StudySession')
const AssessmentAttempt = require('../models/AssessmentAttempt')
const UserProfile = require('../models/UserProfile')
const Task = require('../models/Task')
const {
  MASTERY_STATES,
  EVIDENCE_TO_STATE,
  STRONG_EVIDENCE_TYPES,
  MASTERED_MIN_STRONG_EVIDENCE,
  STATE_RANK,
  SKILL_PREREQUISITES,
  INJECTION_PATTERNS,
  TEACHING_MODES,
} = require('../constants/adaptiveLearning')
const { getCareerData } = require('../data/careerDataset')
const careerCopilot = require('./careerCopilotService')
const talentIntelligence = require('./talentIntelligenceService')
const knowledgeDiscovery = require('./knowledgeDiscoveryService')
const contextPersonalization = require('./contextPersonalizationService')

function uid(prefix = 'sk') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`
}

function sanitizeText(text = '') {
  let str = String(text || '').trim().slice(0, 4000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str
}

function skillKey(name = '') {
  return String(name).toLowerCase().trim().replace(/\s+/g, ' ')
}

function skillIdFromName(name) {
  return skillKey(name).replace(/\s+/g, '_')
}

async function getOrCreateProfile(userId) {
  let profile = await LearningProfile.findOne({ userId })
  if (!profile) {
    const userProf = await UserProfile.findOne({ userId }).lean()
    profile = await LearningProfile.create({
      userId,
      currentGoal: userProf?.targetRole || '',
      targetRole: userProf?.targetRole || '',
      subjects: userProf?.interests || [],
    })
  }
  return profile
}

async function assertProfileAccess(profileId, userId) {
  const profile = await LearningProfile.findById(profileId)
  if (!profile) {
    const err = new Error('Learning profile not found')
    err.statusCode = 404
    throw err
  }
  if (profile.userId.toString() !== userId.toString()) {
    const err = new Error('Not authorized for this learning profile')
    err.statusCode = 403
    throw err
  }
  return profile
}

async function assertOwned(model, id, userId, label = 'Resource') {
  const doc = await model.findById(id)
  if (!doc) {
    const err = new Error(`${label} not found`)
    err.statusCode = 404
    throw err
  }
  if (doc.userId.toString() !== userId.toString()) {
    const err = new Error(`Not authorized for this ${label.toLowerCase()}`)
    err.statusCode = 403
    throw err
  }
  return doc
}

function computeMasteryState(evidences = []) {
  if (!evidences.length) return { state: 'NOT_STARTED', strongCount: 0, evidenceCount: 0 }
  let maxState = 'NOT_STARTED'
  let strongCount = 0
  for (const e of evidences) {
    const mapped = EVIDENCE_TO_STATE[e.evidenceType] || 'EXPLORING'
    if (STATE_RANK[mapped] > STATE_RANK[maxState]) maxState = mapped
    if (STRONG_EVIDENCE_TYPES.includes(e.evidenceType) && (e.passed !== false)) strongCount += 1
  }
  if (strongCount >= MASTERED_MIN_STRONG_EVIDENCE && STATE_RANK[maxState] >= STATE_RANK.ASSESSED) {
    maxState = 'MASTERED'
  }
  return { state: maxState, strongCount, evidenceCount: evidences.length }
}

function nextStepForState(state, skillName) {
  const map = {
    NOT_STARTED: `Start exploring ${skillName} with an introductory resource`,
    EXPLORING: `Complete a structured learning resource for ${skillName}`,
    LEARNING: `Practice ${skillName} with exercises`,
    PRACTICING: `Take an assessment to demonstrate ${skillName}`,
    ASSESSED: `Build a project applying ${skillName}`,
    DEMONSTRATED: `Maintain mastery with revision and advanced practice`,
    MASTERED: `Optional: teach or mentor others on ${skillName}`,
  }
  return map[state] || `Continue learning ${skillName}`
}

async function refreshSkillMastery(userId, skillName) {
  const sid = skillIdFromName(skillName)
  const evidences = await SkillEvidence.find({ userId, skillId: sid }).sort({ recordedAt: -1 }).lean()
  const { state, strongCount, evidenceCount } = computeMasteryState(evidences)
  const profile = await getOrCreateProfile(userId)
  const idx = profile.skillMasteries.findIndex((s) => s.skillId === sid)
  const entry = {
    skillId: sid,
    skillName,
    category: '',
    state,
    evidenceCount,
    strongEvidenceCount: strongCount,
    lastEvidenceAt: evidences[0]?.recordedAt || null,
    nextStep: nextStepForState(state, skillName),
  }
  if (idx >= 0) profile.skillMasteries[idx] = entry
  else profile.skillMasteries.push(entry)
  await profile.save()
  return entry
}

function getPrerequisites(skillName) {
  const key = skillKey(skillName)
  for (const [k, prereqs] of Object.entries(SKILL_PREREQUISITES)) {
    if (key.includes(k) || k.includes(key)) return prereqs
  }
  return []
}

async function checkPrerequisites(userId, skillName) {
  const prereqs = getPrerequisites(skillName)
  if (!prereqs.length) return { satisfied: true, missing: [], prerequisites: [] }
  const profile = await getOrCreateProfile(userId)
  const missing = []
  for (const p of prereqs) {
    const sid = skillIdFromName(p)
    const mastery = profile.skillMasteries.find((s) => s.skillId === sid)
    const minState = STATE_RANK.ASSESSED
    if (!mastery || STATE_RANK[mastery.state] < minState) {
      missing.push({ skill: p, requiredState: 'ASSESSED', currentState: mastery?.state || 'NOT_STARTED' })
    }
  }
  return { satisfied: !missing.length, missing, prerequisites: prereqs }
}

async function getSkillGapAnalysis(userId, { targetRole } = {}) {
  const profile = await getOrCreateProfile(userId)
  const role = targetRole || profile.targetRole || profile.currentGoal
  const careerData = getCareerData(role)
  const careerGaps = await careerCopilot.getCareerGapAnalysis(userId, { targetRole: role }).catch(() => null)
  const talentGaps = await talentIntelligence.getSkillGapIntelligence(userId, { targetRole: role }).catch(() => null)

  const requiredSkills = [
    ...(careerData?.important_skills || []),
    ...(talentGaps?.criticalGaps || []),
    ...(talentGaps?.requiredSkills || []),
  ]
  const uniqueRequired = [...new Set(requiredSkills.map((s) => String(s).trim()).filter(Boolean))]

  const gaps = []
  const strengths = []
  for (const skill of uniqueRequired) {
    const sid = skillIdFromName(skill)
    const mastery = profile.skillMasteries.find((s) => s.skillId === sid)
    const userProf = await UserProfile.findOne({ userId }).lean()
    const declared = (userProf?.skills || []).some((s) => skillKey(s).includes(skillKey(skill)) || skillKey(skill).includes(skillKey(s)))
    if (mastery && STATE_RANK[mastery.state] >= STATE_RANK.ASSESSED) {
      strengths.push({ skill, state: mastery.state, evidenceCount: mastery.evidenceCount })
    } else if (mastery && STATE_RANK[mastery.state] >= STATE_RANK.LEARNING) {
      gaps.push({
        skill,
        priority: 'MEDIUM',
        status: mastery.state,
        what: `${skill} is in progress but not yet assessed`,
        why: `Target role "${role}" lists ${skill} as important`,
        whereRequired: role,
        learnNext: mastery.nextStep || nextStepForState(mastery.state, skill),
      })
    } else {
      gaps.push({
        skill,
        priority: 'HIGH',
        status: mastery?.state || 'NOT_STARTED',
        what: `${skill} lacks demonstrated evidence`,
        why: careerData?.important_skills?.includes(skill)
          ? `Required for ${role} based on career knowledge base`
          : talentGaps?.criticalGaps?.includes(skill)
            ? `Listed as a gap for matched opportunities`
            : `Relevant to your learning goal`,
        whereRequired: role,
        learnNext: `Start with prerequisite check and introductory ${skill} resource`,
      })
    }
    if (!mastery && declared) {
      gaps.push({
        skill,
        priority: 'MEDIUM',
        status: 'EXPLORING',
        what: `${skill} is declared but not demonstrated`,
        why: 'Self-reported skills require evidence before mastery',
        whereRequired: role,
        learnNext: `Complete practice or assessment for ${skill}`,
      })
    }
  }

  const deduped = []
  const seen = new Set()
  for (const g of gaps) {
    const k = skillKey(g.skill)
    if (seen.has(k)) continue
    seen.add(k)
    deduped.push(g)
  }

  return {
    targetRole: role || 'INSUFFICIENT_DATA',
    gaps: deduped.sort((a, b) => (a.priority === 'HIGH' ? -1 : 1)),
    strengths,
    opportunityContext: talentGaps?.explanation || null,
    careerContext: careerGaps?.disclaimer || null,
    hasInstitutionLink: talentGaps?.hasInstitutionLink ?? false,
  }
}

async function recommendResources(userId, role, { skill, topic, limit = 8 } = {}) {
  const query = topic || skill || 'learning resources'
  const safeQ = knowledgeDiscovery.sanitizeQuery(`${query} ${skill || ''}`.trim())
  const personalization = await contextPersonalization.buildUserContext(userId, 'student', {}).catch(() => null)
  const search = await knowledgeDiscovery.globalSearch({
    userId,
    role: 'student',
    query: safeQ,
    limit,
    useSemantic: true,
    personalization,
  })
  return search.results.map((r, i) => ({
    rank: i + 1,
    type: r.type || r.sourceType || 'DOCUMENT',
    id: r.id || r.sourceId,
    title: r.title,
    excerpt: r.excerpt || r.description || '',
    href: r.href || '',
    explanation: skill
      ? `Recommended because it may cover ${skill} concepts relevant to your objective`
      : r.explanation || 'Relevant to your learning query',
    authority: r.authority || 'UNKNOWN',
  }))
}

async function generateStudyPlan(userId, { goal, targetRole, deadline, availableMinutesPerDay } = {}) {
  const profile = await getOrCreateProfile(userId)
  const role = targetRole || goal || profile.targetRole
  if (role) {
    profile.targetRole = role
    profile.currentGoal = goal || role
    await profile.save()
  }

  const gapAnalysis = await getSkillGapAnalysis(userId, { targetRole: role })
  const topGaps = gapAnalysis.gaps.filter((g) => g.priority === 'HIGH').slice(0, 5)
  const mediumGaps = gapAnalysis.gaps.filter((g) => g.priority !== 'HIGH').slice(0, 3)
  const focusSkills = [...topGaps, ...mediumGaps]

  const items = []
  let order = 1
  for (const gap of focusSkills) {
    const prereq = await checkPrerequisites(userId, gap.skill)
    if (!prereq.satisfied) {
      for (const m of prereq.missing.slice(0, 2)) {
        items.push({
          order: order++,
          skillId: skillIdFromName(m.skill),
          skillName: m.skill,
          topic: m.skill,
          objective: `Build prerequisite: ${m.skill}`,
          practiceType: 'learn',
          estimatedMinutes: 45,
          priority: 'HIGH',
          reason: `${gap.skill} requires ${m.skill} first (current: ${m.currentState})`,
        })
      }
    }
    const resources = await recommendResources(userId, 'student', { skill: gap.skill, limit: 2 })
    const res = resources[0]
    items.push({
      order: order++,
      skillId: skillIdFromName(gap.skill),
      skillName: gap.skill,
      topic: gap.skill,
      objective: gap.learnNext,
      resourceRef: res?.id || '',
      resourceType: res?.type || '',
      practiceType: 'learn',
      estimatedMinutes: availableMinutesPerDay ? Math.min(availableMinutesPerDay, 60) : 30,
      priority: gap.priority,
      reason: gap.why,
    })
    items.push({
      order: order++,
      skillId: skillIdFromName(gap.skill),
      skillName: gap.skill,
      topic: gap.skill,
      objective: `Practice ${gap.skill}`,
      practiceType: 'practice',
      estimatedMinutes: 30,
      priority: gap.priority,
      reason: 'Practice converts learning into demonstrable skill',
    })
    items.push({
      order: order++,
      skillId: skillIdFromName(gap.skill),
      skillName: gap.skill,
      topic: gap.skill,
      objective: `Assess ${gap.skill}`,
      practiceType: 'quiz',
      estimatedMinutes: 20,
      priority: gap.priority,
      reason: 'Assessment required before mastery claims',
    })
  }

  if (!items.length) {
    items.push({
      order: 1,
      skillName: 'General learning',
      topic: role || 'your goal',
      objective: 'Set a target role or explore learning resources',
      practiceType: 'learn',
      estimatedMinutes: 30,
      priority: 'MEDIUM',
      reason: 'No skill gaps identified — set a clearer career goal',
    })
  }

  const existing = await LearningPlan.findOne({ userId, status: { $in: ['ACTIVE', 'PAUSED'] } }).sort({ updatedAt: -1 })
  if (existing) {
    existing.status = 'ACTIVE'
    existing.versions.push({
      version: existing.version,
      changeSummary: 'Plan regenerated from updated skill gaps',
      itemsSnapshot: existing.items,
    })
    existing.version += 1
    existing.items = items
    existing.goal = goal || existing.goal
    existing.targetRole = role || existing.targetRole
    existing.deadline = deadline || existing.deadline
    if (availableMinutesPerDay) existing.availableMinutesPerDay = availableMinutesPerDay
    existing.todayFocus = items.filter((i) => !i.completed).slice(0, 3).map((i) => i.objective)
    existing.nextFocus = items.filter((i) => !i.completed).slice(3, 5).map((i) => i.objective)
    await existing.save()
    profile.activePlanId = existing._id
    await profile.save()
    return existing.toObject()
  }

  const plan = await LearningPlan.create({
    userId,
    title: `Study plan: ${role || 'Adaptive learning'}`,
    goal: goal || role || '',
    targetRole: role || '',
    deadline: deadline || null,
    availableMinutesPerDay: availableMinutesPerDay || null,
    items,
    todayFocus: items.slice(0, 3).map((i) => i.objective),
    nextFocus: items.slice(3, 5).map((i) => i.objective),
    generatedBy: 'LEARNING_AGENT',
  })
  profile.activePlanId = plan._id
  await profile.save()
  return plan.toObject()
}

async function getDashboard(userId) {
  const profile = await getOrCreateProfile(userId)
  const gapAnalysis = await getSkillGapAnalysis(userId)
  const plan = profile.activePlanId
    ? await LearningPlan.findById(profile.activePlanId).lean()
    : null
  const tasks = await Task.find({ userId, completed: false }).sort({ day: 1 }).limit(5).lean()
  const recentSessions = await StudySession.find({ userId }).sort({ updatedAt: -1 }).limit(3).lean()

  const skillProgress = (profile.skillMasteries || []).slice(0, 8).map((s) => ({
    skill: s.skillName,
    state: s.state,
    evidenceCount: s.evidenceCount,
    progressPct: Math.round((STATE_RANK[s.state] / (MASTERY_STATES.length - 1)) * 100),
    nextStep: s.nextStep,
  }))

  return {
    currentGoal: profile.currentGoal || profile.targetRole || 'Set a learning goal',
    targetRole: profile.targetRole,
    skillProgress,
    gaps: gapAnalysis.gaps.slice(0, 5),
    strengths: gapAnalysis.strengths.slice(0, 5),
    today: plan?.todayFocus || tasks.map((t) => t.title).slice(0, 3),
    next: plan?.nextFocus || [],
    plan: plan ? { id: plan._id, title: plan.title, status: plan.status, version: plan.version, itemCount: plan.items?.length } : null,
    weakAreas: profile.weakAreas.slice(0, 5),
    revisionQueue: profile.revisionQueue.slice(0, 3),
    recentSessions,
    studyCoachPrompt: 'What do you want to learn today?',
  }
}

async function getLearningRoadmap(userId) {
  const profile = await getOrCreateProfile(userId)
  const gapAnalysis = await getSkillGapAnalysis(userId)
  const careerView = await careerCopilot.getPersonalizedRoadmapView(userId).catch(() => null)
  const steps = careerView?.steps || []

  return {
    careerGoal: profile.targetRole || profile.currentGoal,
    skills: gapAnalysis.gaps.concat(gapAnalysis.strengths).map((g) => ({
      name: g.skill,
      status: g.status || g.state || 'UNKNOWN',
      type: g.state ? 'strength' : 'gap',
    })),
    topics: gapAnalysis.gaps.map((g) => g.skill),
    resources: await recommendResources(userId, 'student', { skill: gapAnalysis.gaps[0]?.skill, limit: 5 }),
    practice: gapAnalysis.gaps.slice(0, 3).map((g) => ({ skill: g.skill, action: g.learnNext })),
    projects: (careerView?.nextSteps || []).filter((s) => s.type === 'BUILD').slice(0, 3),
    opportunities: careerView?.opportunityMatches?.slice?.(0, 3) || [],
    phases: steps,
  }
}

async function recordEvidence(userId, payload) {
  const skillName = sanitizeText(payload.skillName || payload.skill)
  if (!skillName) {
    const err = new Error('skillName required')
    err.statusCode = 400
    throw err
  }
  const evidenceType = payload.evidenceType || 'PRACTICE'
  if (evidenceType === 'RESOURCE_OPENED') {
    // Opening alone — EXPLORING only, never mastery
  }
  const evidence = await SkillEvidence.create({
    userId,
    skillId: skillIdFromName(skillName),
    skillName,
    evidenceType,
    title: sanitizeText(payload.title || ''),
    score: payload.score ?? null,
    passed: payload.passed ?? null,
    sourceRef: payload.sourceRef || '',
    resourceId: payload.resourceId || '',
    resourceType: payload.resourceType || '',
    sessionId: payload.sessionId || null,
    metadata: payload.metadata || {},
  })
  const mastery = await refreshSkillMastery(userId, skillName)
  return { evidence: evidence.toObject(), mastery }
}

async function startStudySession(userId, payload) {
  const session = await StudySession.create({
    userId,
    planId: payload.planId || null,
    planItemId: payload.planItemId || null,
    objective: sanitizeText(payload.objective || payload.topic || ''),
    skillId: payload.skillId || skillIdFromName(payload.skillName || ''),
    skillName: sanitizeText(payload.skillName || ''),
    topic: sanitizeText(payload.topic || ''),
    resourceId: payload.resourceId || '',
    resourceType: payload.resourceType || '',
    resourceTitle: sanitizeText(payload.resourceTitle || ''),
    teachingMode: TEACHING_MODES.includes(payload.teachingMode) ? payload.teachingMode : 'EXPLAIN',
    status: 'IN_PROGRESS',
    startedAt: new Date(),
  })
  return session.toObject()
}

async function updateSession(userId, sessionId, patch) {
  const session = await assertOwned(StudySession, sessionId, userId, 'Study session')
  if (patch.status) session.status = patch.status
  if (patch.teachingMode && TEACHING_MODES.includes(patch.teachingMode)) session.teachingMode = patch.teachingMode
  if (patch.status === 'COMPLETED') {
    session.endedAt = new Date()
    if (session.startedAt) {
      session.durationMinutes = Math.round((session.endedAt - session.startedAt) / 60000)
    }
    const profile = await getOrCreateProfile(userId)
    profile.totalStudyMinutes += session.durationMinutes || 0
    profile.lastStudyAt = new Date()
    await profile.save()
    if (session.skillName) {
      await recordEvidence(userId, {
        skillName: session.skillName,
        evidenceType: 'RESOURCE_COMPLETED',
        title: session.resourceTitle || session.topic,
        sessionId: session._id,
        resourceId: session.resourceId,
      })
    }
  }
  if (patch.status === 'PAUSED') session.status = 'PAUSED'
  await session.save()
  return session.toObject()
}

function generatePracticeQuestions(skillName, topic, count = 3, difficulty = 'MEDIUM') {
  const t = topic || skillName
  return Array.from({ length: count }, (_, i) => ({
    questionId: uid('q'),
    questionText: `[${difficulty}] Explain a core concept of ${t} (question ${i + 1}).`,
    type: 'SHORT_ANSWER',
    skillName,
    topic: t,
  }))
}

function evaluateAnswer(question, userAnswer) {
  const ua = sanitizeText(userAnswer).toLowerCase()
  if (!ua || ua.length < 5) {
    return {
      result: 'incorrect',
      explanation: 'Answer too short to evaluate meaningfully.',
      conceptGap: question.topic || question.skillName,
      errorType: 'insufficient_response',
    }
  }
  if (ua.length >= 20) {
    return {
      result: 'partial',
      explanation: 'Answer shows engagement. A tutor or assessment rubric would needed for full grading certainty.',
      conceptGap: null,
      errorType: null,
    }
  }
  return {
    result: 'partial',
    explanation: 'Partial response — expand with examples and definitions.',
    conceptGap: question.topic,
    errorType: 'underdeveloped',
  }
}

async function submitAssessment(userId, payload) {
  const skillName = sanitizeText(payload.skillName || payload.skill)
  const answers = (payload.answers || []).map((a) => {
    const evaluation = evaluateAnswer(
      { topic: payload.topic, skillName },
      a.userAnswer,
    )
    return {
      questionId: a.questionId || uid('q'),
      questionText: a.questionText || '',
      userAnswer: sanitizeText(a.userAnswer),
      correctAnswer: a.correctAnswer || '',
      result: evaluation.result,
      explanation: evaluation.explanation,
      conceptGap: evaluation.conceptGap || '',
    }
  })
  const correct = answers.filter((a) => a.result === 'correct').length
  const partial = answers.filter((a) => a.result === 'partial').length
  const score = answers.length ? Math.round(((correct + partial * 0.5) / answers.length) * 100) : 0
  const passed = score >= 70

  const weakAreas = answers
    .filter((a) => a.result !== 'correct' && a.conceptGap)
    .map((a) => ({ skill: skillName, topic: a.conceptGap, errorType: 'concept_gap' }))

  const attempt = await AssessmentAttempt.create({
    userId,
    sessionId: payload.sessionId || null,
    skillId: skillIdFromName(skillName),
    skillName,
    topic: sanitizeText(payload.topic || ''),
    quizType: payload.quizType || 'SHORT_ANSWER',
    difficulty: payload.difficulty || 'MEDIUM',
    score,
    passed,
    answers,
    weakAreas,
    errorAnalysis: weakAreas.map((w) => `Repeated difficulty in ${w.topic}`),
  })

  await recordEvidence(userId, {
    skillName,
    evidenceType: 'QUIZ',
    title: `Quiz: ${payload.topic || skillName}`,
    score,
    passed,
    sessionId: payload.sessionId,
  })

  const profile = await getOrCreateProfile(userId)
  for (const w of weakAreas) {
    const existing = profile.weakAreas.find((x) => x.topic === w.topic)
    if (existing) {
      existing.attemptCount = (existing.attemptCount || 0) + 1
      existing.lastSeen = new Date()
    } else {
      profile.weakAreas.push({ ...w, attemptCount: 1, lastSeen: new Date() })
    }
  }
  if (!passed) {
    profile.revisionQueue.push({
      skill: skillName,
      topic: payload.topic || skillName,
      reason: `Quiz score ${score}% — review recommended`,
      dueAt: new Date(Date.now() + 86400000 * 2),
    })
  }
  await profile.save()

  return { attempt: attempt.toObject(), score, passed, weakAreas, nextStep: passed ? nextStepForState('ASSESSED', skillName) : `Review ${skillName} and retry practice` }
}

async function studyCoachChat(userId, { question, sessionId, teachingMode, resourceContext } = {}) {
  const q = sanitizeText(question)
  if (!q) {
    const err = new Error('Question required')
    err.statusCode = 400
    throw err
  }
  const profile = await getOrCreateProfile(userId)
  let session = null
  if (sessionId) {
    session = await assertOwned(StudySession, sessionId, userId, 'Study session')
  }
  const mode = teachingMode || session?.teachingMode || 'EXPLAIN'
  const topic = session?.topic || session?.skillName || profile.targetRole || 'your current topic'
  const ql = q.toLowerCase()

  let answer = ''
  let contentType = 'AI_SUMMARY'

  if (/explain simply|simple|beginner|eli5/.test(ql)) {
    answer = `Simple explanation for ${topic}: This topic builds foundational understanding step by step. Focus on one concept at a time and verify with practice. (Teaching mode: simplified EXPLAIN)`
  } else if (/advanced|deep|technical/.test(ql)) {
    answer = `Advanced view of ${topic}: Consider implementation details, trade-offs, and how this connects to prerequisite skills. (Teaching mode: advanced EXPLAIN)`
  } else if (mode === 'SOCRATIC' || /guide me|help me think|socratic/.test(ql)) {
    answer = `Let's explore ${topic} together:\n1. What do you already know about this?\n2. What specific part is unclear?\n3. Can you give an example from your experience?\n(Answer these and I'll guide you further — switch to EXPLAIN for direct answers.)`
    contentType = 'AI_NOTE'
  } else if (/practice|exercise|drill/.test(ql)) {
    const qs = generatePracticeQuestions(session?.skillName || topic, topic, 2)
    answer = `Practice for ${topic}:\n${qs.map((x, i) => `${i + 1}. ${x.questionText}`).join('\n')}`
  } else if (/quiz|test|assess/.test(ql)) {
    answer = `Start a quiz session for ${topic} using POST /assessment/submit after answering practice questions. Mastery requires passing assessment — not just reading.`
  } else if (/next|what should i|what do i/.test(ql)) {
    const gap = await getSkillGapAnalysis(userId)
    const top = gap.gaps[0]
    answer = top
      ? `Next priority: ${top.skill}. ${top.learnNext}. Reason: ${top.why}`
      : 'Set a target role to get personalized next steps.'
  } else if (/gap|missing|weak/.test(ql)) {
    const gap = await getSkillGapAnalysis(userId)
    answer = gap.gaps.length
      ? gap.gaps.map((g) => `${g.skill}: ${g.what}`).join('\n')
      : 'No major gaps detected. Set a clearer target role for deeper analysis.'
  } else if (resourceContext) {
    const ctx = sanitizeText(resourceContext).slice(0, 2000)
    answer = `Based on the authorized resource context provided (${ctx.length} chars): I'll answer about ${topic} using only this material. For "${q.slice(0, 80)}": review the relevant section in your resource. If the answer isn't in the source, I cannot fabricate it.`
  } else {
    answer = `Study Coach (${mode}) for ${topic}: You asked "${q.slice(0, 120)}". I can explain, generate practice, run quizzes, or suggest next steps based on your skill gaps. Ask "what should I learn next?" or "explain simply".`
    contentType = 'AI_NOTE'
  }

  if (session) {
    session.activities.push({ type: 'CHAT', description: q.slice(0, 100) })
    await session.save()
  }

  return { answer, contentType, teachingMode: mode, topic, disclaimer: 'Study Coach does not modify academic records or impersonate instructors.' }
}

async function updateProfile(userId, patch) {
  const profile = await getOrCreateProfile(userId)
  if (patch.targetRole) profile.targetRole = sanitizeText(patch.targetRole)
  if (patch.currentGoal) profile.currentGoal = sanitizeText(patch.currentGoal)
  if (patch.preferredFormats) profile.preferredFormats = patch.preferredFormats
  if (patch.deadlines) profile.deadlines = patch.deadlines
  await profile.save()
  if (patch.targetRole) {
    await generateStudyPlan(userId, { targetRole: patch.targetRole })
  }
  return profile.toObject()
}

async function pausePlan(userId) {
  const profile = await getOrCreateProfile(userId)
  if (!profile.activePlanId) return { paused: false }
  const plan = await LearningPlan.findById(profile.activePlanId)
  if (plan) {
    plan.status = 'PAUSED'
    await plan.save()
  }
  return { paused: true, planId: profile.activePlanId }
}

async function getMasteryDetail(userId, skillName) {
  const sid = skillIdFromName(skillName)
  const evidences = await SkillEvidence.find({ userId, skillId: sid }).sort({ recordedAt: -1 }).lean()
  const mastery = await refreshSkillMastery(userId, skillName)
  const prereq = await checkPrerequisites(userId, skillName)
  return {
    mastery,
    evidences: evidences.map((e) => ({
      type: e.evidenceType,
      title: e.title,
      score: e.score,
      passed: e.passed,
      recordedAt: e.recordedAt,
    })),
    prerequisites: prereq,
    transparency: {
      status: mastery.state,
      evidence: `${mastery.evidenceCount} evidence record(s), ${mastery.strongEvidenceCount} strong`,
      remains: mastery.state === 'MASTERED' ? 'Maintain with revision' : nextStepForState(mastery.state, skillName),
      improve: nextStepForState(mastery.state, skillName),
    },
  }
}

module.exports = {
  getOrCreateProfile,
  getDashboard,
  getLearningRoadmap,
  getSkillGapAnalysis,
  checkPrerequisites,
  recommendResources,
  generateStudyPlan,
  recordEvidence,
  startStudySession,
  updateSession,
  submitAssessment,
  generatePracticeQuestions,
  studyCoachChat,
  updateProfile,
  pausePlan,
  getMasteryDetail,
  refreshSkillMastery,
  assertOwned,
}
