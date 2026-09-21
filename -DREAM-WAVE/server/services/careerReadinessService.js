/**
 * Lasya V5 Prompt 7 — Career Simulator + Interview Intelligence + Job Readiness
 * Composes careerCopilot, adaptiveLearning, projectIntelligence, opportunityMatching — no duplicates.
 */
const crypto = require('crypto')
const InterviewSession = require('../models/InterviewSession')
const CareerReadinessSnapshot = require('../models/CareerReadinessSnapshot')
const PortfolioProject = require('../models/PortfolioProject')
const UserProfile = require('../models/UserProfile')
const {
  INTERVIEW_MODES,
  DIFFICULTY_LEVELS,
  GAP_LEVELS,
  READINESS_DIMENSIONS,
  QUESTION_SOURCES,
  EVAL_DIMENSIONS,
  APPLICATION_READINESS,
  INJECTION_PATTERNS,
  BEHAVIORAL_QUESTIONS,
  TECHNICAL_TOPICS,
} = require('../constants/careerReadiness')
const { getCareerData } = require('../data/careerDataset')
const careerCopilot = require('./careerCopilotService')
const adaptiveLearning = require('./adaptiveLearningService')
const projectIntelligence = require('./projectIntelligenceService')
const opportunityMatching = require('./opportunityMatchingService')

function uid(prefix = 'q') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`
}

function sanitizeText(text = '') {
  let str = String(text || '').trim().slice(0, 8000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str
}

async function assertSessionAccess(sessionId, userId) {
  const session = await InterviewSession.findById(sessionId)
  if (!session) {
    const err = new Error('Interview session not found')
    err.statusCode = 404
    throw err
  }
  if (session.userId.toString() !== userId.toString()) {
    const err = new Error('Not authorized for this interview session')
    err.statusCode = 403
    throw err
  }
  return session
}

function mapGapLevel(skill, strengths = [], gaps = []) {
  const sk = String(skill).toLowerCase()
  const strong = strengths.find((s) => String(s.skill || s).toLowerCase().includes(sk) || sk.includes(String(s.skill || s).toLowerCase()))
  if (strong) return 'STRONG'
  const gap = gaps.find((g) => String(g.skill || g).toLowerCase().includes(sk) || sk.includes(String(g.skill || g).toLowerCase()))
  if (gap) {
    if (gap.status === 'EXPLORING' || gap.status === 'LEARNING' || gap.status === 'PARTIAL') return 'PARTIAL'
    return 'MISSING'
  }
  return 'UNKNOWN'
}

function computeDimensionScore({ numerator, denominator, label, explanation, insufficientData }) {
  if (insufficientData || !denominator) {
    return { score: null, label, explanation: explanation || 'INSUFFICIENT DATA', insufficientData: true }
  }
  const score = Math.round((numerator / denominator) * 100)
  return { score, label, explanation, insufficientData: false }
}

async function computeReadinessDimensions(userId, { targetRole } = {}) {
  const ctx = await careerCopilot.loadCareerContext(userId)
  const role = targetRole || ctx.targetRole || ''
  const careerData = getCareerData(role)
  const gapAnalysis = await adaptiveLearning.getSkillGapAnalysis(userId, { targetRole: role })
  const portfolio = await projectIntelligence.getPortfolio(userId).catch(() => ({ projects: [], coverage: {} }))
  const sessions = await InterviewSession.find({ userId, status: 'COMPLETED' }).sort({ completedAt: -1 }).limit(10).lean()

  const requiredSkills = [...new Set([
    ...(careerData?.important_skills || []),
    ...gapAnalysis.gaps.map((g) => g.skill),
    ...gapAnalysis.strengths.map((s) => s.skill),
  ])].filter(Boolean)

  const skillStrong = gapAnalysis.strengths.length
  const skillTotal = requiredSkills.length || gapAnalysis.gaps.length + gapAnalysis.strengths.length
  const skillDim = computeDimensionScore({
    numerator: skillStrong,
    denominator: skillTotal,
    label: 'SKILL_READINESS',
    explanation: skillTotal
      ? `${skillStrong} of ${skillTotal} tracked skills have demonstrated evidence`
      : 'No role skills defined — set a target role',
    insufficientData: !role || !skillTotal,
  })

  const projectCount = portfolio.projects?.length || 0
  const projectWithEvidence = (portfolio.projects || []).filter(
    (p) => (p.evidence || []).some((e) => ['DEMONSTRATED', 'VERIFIED'].includes(e.strength)) || p.status === 'COMPLETED',
  ).length
  const projectDim = computeDimensionScore({
    numerator: projectWithEvidence,
    denominator: Math.max(projectCount, 1),
    label: 'PROJECT_READINESS',
    explanation: projectCount
      ? `${projectWithEvidence} project(s) with evidence out of ${projectCount}`
      : 'No portfolio projects yet',
    insufficientData: !projectCount,
  })

  const portfolioScore = portfolio.scores
    ? Math.round(((portfolio.scores.documentation || 0) + (portfolio.scores.evidence || 0)) / 2)
    : null
  const portfolioDim = {
    score: projectCount ? portfolioScore : null,
    label: 'PORTFOLIO_READINESS',
    explanation: projectCount
      ? `Documentation ${portfolio.scores?.documentation || 0}%, evidence ${portfolio.scores?.evidence || 0}%`
      : 'No portfolio data',
    insufficientData: !projectCount,
  }

  const profile = await adaptiveLearning.getOrCreateProfile(userId)
  const learningActive = profile.skillMasteries?.filter((s) => ['LEARNING', 'PRACTICING', 'ASSESSED'].includes(s.state)).length || 0
  const learningDim = computeDimensionScore({
    numerator: learningActive,
    denominator: Math.max(gapAnalysis.gaps.length, 1),
    label: 'LEARNING_READINESS',
    explanation: `${learningActive} skill(s) actively in learning/practice`,
    insufficientData: !gapAnalysis.gaps.length && !learningActive,
  })

  const avgInterview = sessions.length
    ? sessions.reduce((sum, s) => {
        const scores = (s.answers || []).flatMap((a) => Object.values(a.scores || {}).filter((v) => v != null))
        return sum + (scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0)
      }, 0) / sessions.length
    : null
  const interviewDim = {
    score: avgInterview != null ? Math.round(avgInterview) : null,
    label: 'INTERVIEW_READINESS',
    explanation: sessions.length
      ? `Based on ${sessions.length} completed mock interview session(s)`
      : 'No completed interview sessions — practice to establish signals',
    insufficientData: !sessions.length,
  }

  const commScores = sessions.flatMap((s) =>
    (s.answers || []).map((a) => a.scores?.CLARITY).filter((v) => v != null),
  )
  const commAvg = commScores.length ? commScores.reduce((a, b) => a + b, 0) / commScores.length : null
  const commDim = {
    score: commAvg != null ? Math.round(commAvg) : null,
    label: 'COMMUNICATION_PRACTICE',
    explanation: commScores.length ? 'Derived from clarity scores in mock interviews' : 'Complete behavioral/HR practice for communication signals',
    insufficientData: !commScores.length,
  }

  let appState = 'INSUFFICIENT_DATA'
  let appExplanation = 'Set target role and build evidence before application readiness can be assessed'
  if (role && skillTotal) {
    const skillPct = skillDim.score ?? 0
    const projPct = projectDim.insufficientData ? 0 : (projectDim.score ?? 0)
    if (skillPct >= 70 && projPct >= 50) {
      appState = 'READY'
      appExplanation = 'Core skills and project evidence meet preparation thresholds — review gaps before applying'
    } else {
      appState = 'NEEDS_IMPROVEMENT'
      appExplanation = 'Gaps remain in skills or projects — see top gaps before applying'
    }
  }
  const appDim = {
    score: appState === 'READY' ? 80 : appState === 'NEEDS_IMPROVEMENT' ? 45 : null,
    label: 'APPLICATION_READINESS',
    explanation: appExplanation,
    insufficientData: appState === 'INSUFFICIENT_DATA',
    state: appState,
  }

  return {
    targetRole: role || 'INSUFFICIENT_DATA',
    dimensions: [skillDim, projectDim, portfolioDim, learningDim, interviewDim, commDim, appDim],
    disclaimer: 'Readiness reflects preparation signals from available evidence — not employment prediction.',
  }
}

async function getGapExplanations(userId, { targetRole } = {}) {
  const gapAnalysis = await adaptiveLearning.getSkillGapAnalysis(userId, { targetRole })
  const careerGaps = await careerCopilot.getCareerGapAnalysis(userId, { targetRole })

  const explained = (gapAnalysis.gaps || []).slice(0, 8).map((g) => ({
    skill: g.skill,
    level: mapGapLevel(g.skill, gapAnalysis.strengths, gapAnalysis.gaps),
    what: g.what || `${g.skill} needs development`,
    why: g.why || 'Relevant to target role',
    evidence: g.status || 'NOT_STARTED',
    howToImprove: g.learnNext || `Practice and demonstrate ${g.skill}`,
  }))

  return {
    targetRole: gapAnalysis.targetRole,
    gaps: explained,
    strengths: (gapAnalysis.strengths || []).map((s) => ({
      skill: s.skill,
      level: 'STRONG',
      evidence: s.state || s.evidenceLevel,
    })),
    unknown: careerGaps.unknown || [],
    disclaimer: careerGaps.disclaimer,
  }
}

async function getReadinessDashboard(userId, { targetRole } = {}) {
  const dimensions = await computeReadinessDimensions(userId, { targetRole })
  const gaps = await getGapExplanations(userId, { targetRole: dimensions.targetRole })
  const ctx = await careerCopilot.loadCareerContext(userId)

  const nextActions = []
  gaps.gaps.slice(0, 3).forEach((g, i) => {
    nextActions.push({ order: i + 1, action: `Improve ${g.skill}`, reason: g.why })
  })
  if (dimensions.dimensions.find((d) => d.label === 'INTERVIEW_READINESS')?.insufficientData) {
    nextActions.push({ order: nextActions.length + 1, action: 'Start a mock interview session', reason: 'No interview practice evidence yet' })
  }
  const weakProjects = !(await projectIntelligence.listProjects(userId, { limit: 1 })).length
  if (weakProjects) {
    nextActions.push({ order: nextActions.length + 1, action: 'Build or document a portfolio project', reason: 'Projects strengthen readiness signals' })
  }

  const snapshot = await CareerReadinessSnapshot.create({
    userId,
    targetRole: dimensions.targetRole,
    dimensions: dimensions.dimensions.map((d) => ({
      key: d.label,
      score: d.score,
      label: d.label,
      explanation: d.explanation,
      insufficientData: d.insufficientData,
    })),
    topGaps: gaps.gaps.slice(0, 5).map((g) => ({ skill: g.skill, level: g.level, explanation: g.what })),
    nextActions,
    overallLabel: 'PREPARATION_SIGNALS',
  })

  return {
    targetRole: dimensions.targetRole || ctx.targetRole || 'Set target role',
    readiness: dimensions.dimensions.reduce((acc, d) => {
      acc[d.label] = d.insufficientData ? { state: 'INSUFFICIENT_DATA', explanation: d.explanation } : { score: d.score, explanation: d.explanation }
      return acc
    }, {}),
    topGaps: gaps.gaps.slice(0, 5).map((g) => g.skill),
    gapDetails: gaps.gaps,
    strengths: gaps.strengths,
    nextActions,
    coachPrompt: 'What should I improve next?',
    snapshotId: snapshot._id,
    disclaimer: dimensions.disclaimer,
  }
}

async function getOpportunityReadiness(userId, source, sourceId) {
  try {
    const prep = await opportunityMatching.buildPreparationPlan(userId, source, sourceId)
    const dims = await computeReadinessDimensions(userId, { targetRole: prep.opportunity?.title })
    return {
      opportunity: prep.opportunity,
      match: prep.match,
      requiredSkills: prep.requiredSkills || prep.opportunity?.requiredSkills || [],
      preferredSkills: prep.opportunity?.preferredSkills || [],
      gaps: prep.missingRequirements || prep.gaps || [],
      projectEvidence: prep.relevantProjects || [],
      readiness: dims.dimensions,
      disclaimer: 'Preparation signals only — does not guarantee eligibility or selection.',
    }
  } catch (err) {
    if (err.statusCode === 403) {
      return {
        opportunity: null,
        readiness: [],
        disclaimer: 'Institution link required for verified opportunity data',
        insufficientData: true,
      }
    }
    throw err
  }
}

function pickTopics(role, mode, gaps = [], projects = []) {
  const roleKey = Object.keys(TECHNICAL_TOPICS).find((k) => role.toLowerCase().includes(k)) || 'default'
  const base = TECHNICAL_TOPICS[roleKey]
  const gapSkills = gaps.slice(0, 3).map((g) => g.skill || g)
  if (mode === 'BEHAVIORAL' || mode === 'HR') return ['Communication', 'Teamwork', 'Problem solving']
  if (mode === 'PROJECT') return projects.slice(0, 3).map((p) => p.title || p)
  if (mode === 'SYSTEM_DESIGN') return ['Architecture', 'Scalability', 'Trade-offs']
  if (mode === 'CODING') return ['Algorithms', 'Data structures', ...gapSkills.slice(0, 2)]
  return [...base, ...gapSkills].slice(0, 5)
}

function generateQuestionText({ mode, role, topic, project, difficulty, source = 'GENERATED' }) {
  const sourceLabel = source === 'VERIFIED_SOURCE'
    ? 'VERIFIED SOURCE'
    : 'Practice question inspired by role requirements'

  if (mode === 'BEHAVIORAL' || mode === 'HR') {
    const q = BEHAVIORAL_QUESTIONS[Math.floor(Math.random() * BEHAVIORAL_QUESTIONS.length)]
    return { text: q, topic: 'Behavioral', source, sourceLabel }
  }
  if (mode === 'PROJECT' && project) {
    return {
      text: `Walk me through "${project.title}": What problem did it solve, what was your role, and what would you improve?`,
      topic: project.title,
      skill: (project.skills || [])[0] || '',
      source,
      sourceLabel,
    }
  }
  if (mode === 'SYSTEM_DESIGN') {
    return {
      text: `Design a system for a ${role}-relevant service. Cover requirements, components, scalability, and trade-offs.`,
      topic: 'System Design',
      source,
      sourceLabel,
    }
  }
  if (mode === 'CODING') {
    return {
      text: `Coding practice (${difficulty}): Implement a function related to ${topic}. Explain your approach and time complexity.`,
      topic,
      source,
      sourceLabel,
    }
  }
  if (mode === 'TECHNICAL' || mode === 'ROLE_SPECIFIC' || mode === 'MIXED') {
    return {
      text: `Explain ${topic} and how it applies to a ${role} role. Include a concrete example from your experience if available.`,
      topic,
      source,
      sourceLabel,
    }
  }
  return { text: `Tell me about your experience relevant to ${role}.`, topic: 'General', source, sourceLabel }
}

async function createInterviewSession(userId, config = {}) {
  const ctx = await careerCopilot.loadCareerContext(userId)
  const role = config.targetRole || ctx.targetRole || 'software engineer'
  const mode = INTERVIEW_MODES.includes(config.mode) ? config.mode : 'MIXED'
  const difficulty = DIFFICULTY_LEVELS.includes(config.difficulty) ? config.difficulty : 'INTERMEDIATE'
  const questionCount = Math.min(Math.max(Number(config.questionCount) || 5, 1), 15)

  const gapAnalysis = await adaptiveLearning.getSkillGapAnalysis(userId, { targetRole: role })
  const projects = await PortfolioProject.find({ ownerUserId: userId }).limit(5).lean()
  const topics = config.topics?.length ? config.topics : pickTopics(role, mode, gapAnalysis.gaps, projects)

  const session = await InterviewSession.create({
    userId,
    targetRole: role,
    mode,
    difficulty,
    questionCount,
    topics,
    status: 'IN_PROGRESS',
    startedAt: new Date(),
    opportunityRef: config.opportunityRef || undefined,
  })

  const firstQ = await generateNextQuestion(session, { projects, gapAnalysis })
  session.questions.push(firstQ)
  await session.save()

  return { session, currentQuestion: firstQ }
}

async function generateNextQuestion(session, context = {}) {
  const projects = context.projects || await PortfolioProject.find({ ownerUserId: session.userId }).limit(5).lean()
  const gapAnalysis = context.gapAnalysis || await adaptiveLearning.getSkillGapAnalysis(session.userId, { targetRole: session.targetRole })
  const answered = session.answers.length
  const topic = session.topics[answered % session.topics.length] || session.targetRole
  const project = session.mode === 'PROJECT' ? projects[answered % projects.length] : null

  const q = generateQuestionText({
    mode: session.mode,
    role: session.targetRole,
    topic,
    project,
    difficulty: session.difficulty,
  })

  return {
    questionId: uid('q'),
    text: q.text,
    topic: q.topic || topic,
    skill: q.skill || '',
    source: q.source || 'GENERATED',
    sourceLabel: q.sourceLabel,
  }
}

function evaluateAnswerText(answerText, question, { project, resumeSkills = [] }) {
  const text = sanitizeText(answerText)
  const words = text.split(/\s+/).filter(Boolean)
  const flags = []

  const hasStructure = /situation|task|action|result|first|then|because|therefore/i.test(text)
  const hasEvidence = /\d+|percent|metric|deploy|built|implemented|designed|tested/i.test(text)
  const minWords = question.topic === 'Behavioral' ? 40 : 25

  const scores = {}
  scores.RELEVANCE = text.toLowerCase().includes(String(question.topic || '').toLowerCase().slice(0, 8)) || words.length >= minWords ? 75 : 45
  scores.COMPLETENESS = words.length >= minWords ? (words.length >= minWords * 2 ? 85 : 65) : 35
  scores.CLARITY = words.length >= 15 ? 70 : 40
  scores.STRUCTURE = hasStructure ? 80 : 50
  scores.EVIDENCE = hasEvidence ? 75 : 40
  scores.TECHNICAL_ACCURACY = question.skill ? (text.toLowerCase().includes(question.skill.toLowerCase()) ? 70 : 55) : 60

  const strengths = []
  const missing = []
  const improve = []

  if (words.length >= minWords) strengths.push('Provided a substantive response')
  else missing.push('Answer is too brief — expand with specifics')
  if (hasStructure) strengths.push('Structured explanation detected')
  else improve.push('Use STAR (Situation, Task, Action, Result) for behavioral answers')
  if (hasEvidence) strengths.push('Included concrete details or metrics')
  else improve.push('Add measurable outcomes or specific technologies used')

  if (project && /built|deployed|led team of 50|million users/i.test(text)) {
    const projDesc = `${project.title} ${project.description || ''}`.toLowerCase()
    if (/deployed to production|10 million|fortune 500/i.test(text) && !projDesc.includes('deploy')) {
      flags.push('Please verify this statement against your project record')
    }
  }

  let followUp = ''
  if (scores.COMPLETENESS < 60) followUp = 'Can you walk me through a specific example with more detail?'
  else if (!hasEvidence) followUp = 'What measurable outcome did this achieve?'
  else followUp = 'What trade-off did you consider, and what would you improve next time?'

  return {
    feedback: {
      strengths,
      missing,
      improve,
      modelStructure: question.topic === 'Behavioral'
        ? 'Situation → Task → Action → Result (with a measurable outcome)'
        : 'Context → Approach → Implementation → Outcome → Lessons learned',
    },
    scores,
    flags,
    followUp,
    sanitizedAnswer: text,
  }
}

async function submitAnswer(userId, sessionId, { questionId, answerText }) {
  const session = await assertSessionAccess(sessionId, userId)
  if (session.status === 'COMPLETED') {
    const err = new Error('Session already completed')
    err.statusCode = 400
    throw err
  }

  const question = session.questions.find((q) => q.questionId === questionId)
  if (!question) {
    const err = new Error('Question not found in session')
    err.statusCode = 404
    throw err
  }

  let project = null
  if (session.mode === 'PROJECT') {
    const projects = await PortfolioProject.find({ ownerUserId: userId }).lean()
    project = projects.find((p) => question.text.includes(p.title))
  }

  const userProf = await UserProfile.findOne({ userId }).lean()
  const evaluation = evaluateAnswerText(answerText, question, {
    project,
    resumeSkills: userProf?.skills || [],
  })

  session.answers.push({
    questionId,
    answerText: evaluation.sanitizedAnswer,
    feedback: evaluation.feedback,
    scores: evaluation.scores,
    flags: evaluation.flags,
    followUp: evaluation.followUp,
  })

  const isLast = session.answers.length >= session.questionCount
  let nextQuestion = null
  if (!isLast) {
    nextQuestion = await generateNextQuestion(session)
    session.questions.push(nextQuestion)
  } else {
    session.status = 'COMPLETED'
    session.completedAt = new Date()
    session.report = buildSessionReport(session)
    session.weakTopics = detectWeakTopics(session)
  }

  await session.save()

  return {
    evaluation: {
      strengths: evaluation.feedback.strengths,
      missing: evaluation.feedback.missing,
      improve: evaluation.feedback.improve,
      modelStructure: evaluation.feedback.modelStructure,
      scores: evaluation.scores,
      flags: evaluation.flags,
      followUp: evaluation.followUp,
    },
    nextQuestion,
    sessionComplete: isLast,
    report: isLast ? session.report : null,
    recommendations: isLast ? await buildPostInterviewRecommendations(userId, session) : null,
  }
}

function detectWeakTopics(session) {
  const topicScores = {}
  for (const ans of session.answers) {
    const q = session.questions.find((x) => x.questionId === ans.questionId)
    const topic = q?.topic || 'General'
    const vals = Object.values(ans.scores || {}).filter((v) => v != null)
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    if (!topicScores[topic]) topicScores[topic] = []
    topicScores[topic].push(avg)
  }
  return Object.entries(topicScores)
    .filter(([, scores]) => scores.reduce((a, b) => a + b, 0) / scores.length < 60)
    .map(([topic]) => topic)
}

function buildSessionReport(session) {
  const allScores = session.answers.flatMap((a) => Object.values(a.scores || {}).filter((v) => v != null))
  const avg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null
  const weakAreas = detectWeakTopics(session)
  const strengths = []
  if (avg != null && avg >= 70) strengths.push('Consistent clarity and structure across answers')
  session.answers.forEach((a) => {
    if ((a.scores?.EVIDENCE || 0) >= 75) strengths.push('Strong use of evidence in at least one answer')
  })

  return {
    summary: avg != null
      ? `Completed ${session.answers.length} question(s). Average dimension score: ${avg}%. This reflects practice performance, not hiring outcome.`
      : 'Session completed — insufficient scoring data',
    strengths: [...new Set(strengths)],
    weakAreas,
    skillsToImprove: session.topics.filter((t) => weakAreas.includes(t)),
    recommendedPractice: weakAreas.map((t) => `Practice ${t} questions and review learning resources`),
    nextLevel: avg != null && avg >= 75 ? 'ADVANCED' : avg != null && avg >= 55 ? 'INTERMEDIATE' : 'BEGINNER',
  }
}

async function buildPostInterviewRecommendations(userId, session) {
  const weak = session.weakTopics || detectWeakTopics(session)
  const recs = { learning: [], projects: [], portfolio: [] }

  for (const topic of weak.slice(0, 3)) {
    recs.learning.push({
      skill: topic,
      action: `Add learning objective for ${topic}`,
      path: '/learn/intelligence',
    })
    const projRecs = await projectIntelligence.getSkillToProjectRecommendations(userId, { targetRole: session.targetRole, limit: 1 }).catch(() => ({ recommendations: [] }))
    if (projRecs.recommendations?.[0]) {
      recs.projects.push({ ...projRecs.recommendations[0], reason: `Interview revealed weakness in ${topic}` })
    }
  }

  if (session.mode === 'PROJECT') {
    recs.portfolio.push({
      action: 'Improve project README, architecture diagram, and demo documentation',
      path: '/projects/intelligence',
    })
  }

  return recs
}

async function listInterviewHistory(userId, { limit = 20 } = {}) {
  const sessions = await InterviewSession.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('-answers.answerText')
    .lean()

  return sessions.map((s) => ({
    sessionId: s._id,
    targetRole: s.targetRole,
    mode: s.mode,
    difficulty: s.difficulty,
    status: s.status,
    questionCount: s.questionCount,
    completed: s.answers?.length || 0,
    weakTopics: s.weakTopics || [],
    reportSummary: s.report?.summary,
    createdAt: s.createdAt,
    completedAt: s.completedAt,
  }))
}

async function getInterviewSession(userId, sessionId) {
  const session = await assertSessionAccess(sessionId, userId)
  const obj = session.toObject()
  delete obj.__v
  return obj
}

async function getQuestionBank(userId, { role, mode, limit = 20 } = {}) {
  const ctx = await careerCopilot.loadCareerContext(userId)
  const targetRole = role || ctx.targetRole || 'software engineer'
  const gapAnalysis = await adaptiveLearning.getSkillGapAnalysis(userId, { targetRole })
  const projects = await PortfolioProject.find({ ownerUserId: userId }).limit(3).lean()
  const m = INTERVIEW_MODES.includes(mode) ? mode : 'MIXED'
  const topics = pickTopics(targetRole, m, gapAnalysis.gaps, projects)

  const questions = topics.slice(0, limit).map((topic) => {
    const q = generateQuestionText({ mode: m, role: targetRole, topic, difficulty: 'INTERMEDIATE' })
    return {
      questionId: uid('bank'),
      ...q,
      role: targetRole,
      mode: m,
      difficulty: 'INTERMEDIATE',
      type: m,
    }
  })

  return { questions, disclaimer: 'Internal practice bank — not verified company questions.' }
}

async function multiAgentCareerAnalysis(userId, { targetRole, source, sourceId } = {}) {
  const ctx = await careerCopilot.loadCareerContext(userId)
  const role = targetRole || ctx.targetRole
  const agents = []

  agents.push({
    agentId: 'OPPORTUNITY_AGENT',
    output: source && sourceId
      ? `Analyzing opportunity ${source}/${sourceId}`
      : 'No specific opportunity selected',
  })

  const gaps = await adaptiveLearning.getSkillGapAnalysis(userId, { targetRole: role })
  agents.push({ agentId: 'SKILL_AGENT', output: `${gaps.strengths.length} strength(s), ${gaps.gaps.length} gap(s)` })

  const portfolio = await projectIntelligence.getPortfolio(userId).catch(() => ({ projects: [] }))
  agents.push({ agentId: 'PROJECT_AGENT', output: `${portfolio.projects?.length || 0} portfolio project(s)` })
  agents.push({
    agentId: 'PORTFOLIO_AGENT',
    output: portfolio.projects?.length
      ? `Documentation ${portfolio.scores?.documentation || 0}%, evidence ${portfolio.scores?.evidence || 0}%`
      : 'Portfolio coverage pending',
  })

  const sessions = await InterviewSession.find({ userId, status: 'COMPLETED' }).countDocuments()
  agents.push({ agentId: 'INTERVIEW_AGENT', output: `${sessions} completed mock interview(s)` })

  agents.push({
    agentId: 'LEARNING_AGENT',
    output: gaps.gaps.slice(0, 2).map((g) => g.learnNext).join('; ') || 'No active gaps',
  })

  const dimensions = await computeReadinessDimensions(userId, { targetRole: role })
  let oppDetail = null
  if (source && sourceId) {
    oppDetail = await getOpportunityReadiness(userId, source, sourceId).catch(() => null)
  }

  return {
    targetRole: role,
    agents,
    readinessSummary: dimensions.dimensions.map((d) => ({
      dimension: d.label,
      score: d.insufficientData ? 'INSUFFICIENT_DATA' : d.score,
      explanation: d.explanation,
    })),
    topGaps: gaps.gaps.slice(0, 5).map((g) => g.skill),
    opportunity: oppDetail?.opportunity || null,
    disclaimer: 'Readiness summary based on preparation signals — not a guarantee of selection.',
  }
}

async function getCareerActionPlan(userId, { weeks = 4 } = {}) {
  const dashboard = await getReadinessDashboard(userId)
  const plan = []
  const gapSkills = dashboard.topGaps.slice(0, weeks)

  for (let w = 0; w < Math.min(weeks, 4); w += 1) {
    const skill = gapSkills[w]
    plan.push({
      week: w + 1,
      focus: skill ? `Improve ${skill}` : 'Interview practice',
      actions: skill
        ? [`Study ${skill}`, `Complete practice for ${skill}`, skill && w === 1 ? 'Build related project milestone' : 'Review portfolio evidence']
        : ['Mock interview session', 'Review feedback', 'Update learning plan'],
    })
  }

  return {
    plan,
    disclaimer: 'Advisory plan only — deadlines should be set by you or your institution.',
  }
}

async function getApplicationReadinessCheck(userId, { source, sourceId, targetRole } = {}) {
  if (source && sourceId) {
    const prep = await careerCopilot.prepareApplication(userId, source, sourceId)
    return {
      state: prep.readiness || 'INSUFFICIENT_DATA',
      safeToApply: prep.safeToApply,
      checklist: prep.checklist,
      gaps: prep.gaps,
      disclaimer: prep.disclaimer,
    }
  }

  const dims = await computeReadinessDimensions(userId, { targetRole })
  const appDim = dims.dimensions.find((d) => d.label === 'APPLICATION_READINESS')
  return {
    state: appDim?.state || (appDim?.insufficientData ? 'INSUFFICIENT_DATA' : 'NEEDS_IMPROVEMENT'),
    checklist: dims.dimensions.filter((d) => d.insufficientData).map((d) => `Add evidence for ${d.label}`),
    disclaimer: 'Preparation check only — does not submit applications.',
  }
}

async function getCareerSimulation(userId, { targetRole } = {}) {
  const ctx = await careerCopilot.loadCareerContext(userId)
  const role = targetRole || ctx.targetRole
  const gaps = await getGapExplanations(userId, { targetRole: role })
  const dims = await computeReadinessDimensions(userId, { targetRole: role })
  const prep = await careerCopilot.prepareInterview(userId, { targetRole: role })
  const projRecs = await projectIntelligence.getSkillToProjectRecommendations(userId, { targetRole: role, limit: 2 }).catch(() => ({ recommendations: [] }))

  return {
    simulationType: 'CAREER_PREPARATION_SIMULATION',
    targetRole: role,
    requirements: getCareerData(role)?.important_skills || [],
    currentProfile: {
      strengths: gaps.strengths,
      gaps: gaps.gaps,
    },
    readiness: dims.dimensions,
    interviewPrep: prep,
    projectRecommendations: projRecs.recommendations,
    disclaimer: 'Simulation models preparation paths — not employer hiring decisions.',
  }
}

async function getCareerProgressTimeline(userId) {
  const ctx = await careerCopilot.loadCareerContext(userId)
  const events = []

  if (ctx.careerGoals?.length) {
    events.push({ event: 'Goal created', description: ctx.careerGoals[0].title || ctx.targetRole, at: ctx.careerGoals[0].createdAt })
  }
  if (ctx.targetRole) {
    events.push({ event: 'Target role set', description: ctx.targetRole, at: new Date() })
  }

  const masteries = await adaptiveLearning.getOrCreateProfile(userId)
  masteries.skillMasteries?.filter((s) => s.state === 'MASTERED').forEach((s) => {
    events.push({ event: 'Skill learned', description: s.skillName || s.skillId, at: s.updatedAt })
  })

  const projects = await PortfolioProject.find({ ownerUserId: userId, status: 'COMPLETED' }).lean()
  projects.forEach((p) => {
    events.push({ event: 'Project completed', description: p.title, at: p.updatedAt })
  })

  const interviews = await InterviewSession.find({ userId, status: 'COMPLETED' }).lean()
  interviews.forEach((s) => {
    events.push({ event: 'Interview practiced', description: `${s.mode} — ${s.targetRole}`, at: s.completedAt })
  })

  events.sort((a, b) => new Date(b.at) - new Date(a.at))
  return { timeline: events.slice(0, 30), disclaimer: 'Timeline from authorized records only.' }
}

async function careerCoachChat(userId, { question } = {}) {
  const q = sanitizeText(question)
  if (!q) {
    const err = new Error('Question required')
    err.statusCode = 400
    throw err
  }

  const dashboard = await getReadinessDashboard(userId)
  let answer = ''

  if (/ready|readiness|am i prepared/i.test(q)) {
    answer = `Target role: ${dashboard.targetRole}. Top gaps: ${dashboard.topGaps.join(', ') || 'none identified'}. `
    const skillR = dashboard.readiness.SKILL_READINESS
    answer += skillR?.score != null ? `Skill readiness signal: ${skillR.score}%. ` : 'Skill readiness: INSUFFICIENT DATA. '
    answer += dashboard.disclaimer
  } else if (/improve|next|what should/i.test(q)) {
    answer = dashboard.nextActions.map((a) => `${a.order}. ${a.action} — ${a.reason}`).join('\n') || 'Set a target role to receive personalized actions.'
  } else if (/interview|mock/i.test(q)) {
    answer = `Start a mock interview at /ai/career/interview. Modes: technical, behavioral, project, system design. Questions are practice-only unless labeled VERIFIED SOURCE.`
  } else if (/gap|skill/i.test(q)) {
    answer = dashboard.gapDetails?.map((g) => `${g.skill} (${g.level}): ${g.what}`).join('\n') || 'No gaps identified yet.'
  } else {
    answer = `Career Coach: Ask about readiness, gaps, interviews, or next actions. I use your authorized profile evidence only.`
  }

  return {
    answer,
    contentType: 'CAREER_READINESS_COACH',
    dashboard: { targetRole: dashboard.targetRole, topGaps: dashboard.topGaps },
    disclaimer: 'Coach provides preparation guidance — not employment guarantees.',
  }
}

async function getReadinessReport(userId, { targetRole } = {}) {
  const [dashboard, gaps, simulation, history] = await Promise.all([
    getReadinessDashboard(userId, { targetRole }),
    getGapExplanations(userId, { targetRole }),
    getCareerSimulation(userId, { targetRole }),
    listInterviewHistory(userId, { limit: 5 }),
  ])

  return {
    targetRole: dashboard.targetRole,
    strengths: gaps.strengths,
    gaps: gaps.gaps,
    projects: simulation.projectRecommendations,
    portfolio: simulation.currentProfile,
    interviewPerformance: history,
    learningPlan: dashboard.nextActions,
    recommendedNextActions: dashboard.nextActions,
    disclaimer: dashboard.disclaimer,
  }
}

module.exports = {
  getReadinessDashboard,
  computeReadinessDimensions,
  getGapExplanations,
  getOpportunityReadiness,
  createInterviewSession,
  submitAnswer,
  listInterviewHistory,
  getInterviewSession,
  getQuestionBank,
  multiAgentCareerAnalysis,
  getCareerActionPlan,
  getApplicationReadinessCheck,
  getCareerSimulation,
  getCareerProgressTimeline,
  careerCoachChat,
  getReadinessReport,
  assertSessionAccess,
  evaluateAnswerText,
  detectWeakTopics,
}
