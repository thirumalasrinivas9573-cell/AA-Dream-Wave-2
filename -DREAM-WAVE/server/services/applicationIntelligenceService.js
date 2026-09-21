/**
 * Lasya V5 Prompt 9 — Application Copilot + Workspace + Candidate Profile Intelligence
 * Composes opportunityIntelligence, careerReadiness, projectIntelligence, adaptiveLearning,
 * studentRecruitment — no duplicate engines.
 */
const crypto = require('crypto')
const ApplicationWorkspace = require('../models/ApplicationWorkspace')
const UserProfile = require('../models/UserProfile')
const InstitutionStudent = require('../models/InstitutionStudent')
const InterviewSession = require('../models/InterviewSession')
const {
  APPLICATION_HEALTH,
  READINESS_STATES,
  INJECTION_PATTERNS,
  FUNNEL_STAGES,
  WORKFLOW_STAGES,
} = require('../constants/applicationIntelligence')
const opportunityIntelligence = require('./opportunityIntelligenceService')
const careerReadiness = require('./careerReadinessService')
const projectIntelligence = require('./projectIntelligenceService')
const adaptiveLearning = require('./adaptiveLearningService')
const studentRecruitment = require('./studentRecruitmentService')
const talentMarketplace = require('./talentMarketplaceService')
const { classifyDeadline } = require('./opportunityQualityService')

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`
}

function sanitizeText(text = '') {
  let str = String(text || '').trim().slice(0, 12000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str
}

async function assertWorkspaceAccess(workspaceId, userId) {
  const ws = await ApplicationWorkspace.findById(workspaceId)
  if (!ws) {
    const err = new Error('Application workspace not found')
    err.statusCode = 404
    throw err
  }
  if (ws.userId.toString() !== userId.toString()) {
    const err = new Error('Not authorized for this application workspace')
    err.statusCode = 403
    throw err
  }
  return ws
}

async function getOrCreateWorkspace(userId, source, sourceId) {
  let ws = await ApplicationWorkspace.findOne({
    userId,
    opportunitySource: source,
    opportunityId: sourceId,
  })

  const detail = await opportunityIntelligence.getOpportunityDetail(userId, source, sourceId).catch(() => null)

  if (!ws) {
    ws = await ApplicationWorkspace.create({
      userId,
      opportunitySource: source,
      opportunityId: sourceId,
      opportunityTitle: detail?.opportunity?.title || 'UNKNOWN',
      organization: detail?.opportunity?.organization || 'UNKNOWN',
      status: 'SAVED',
      matchState: detail?.match?.state || 'UNKNOWN',
      deadline: detail?.opportunity?.deadline && detail.opportunity.deadline !== 'UNKNOWN'
        ? new Date(detail.opportunity.deadline)
        : null,
      checklist: buildChecklistFromDetail(detail),
      timeline: [{ event: 'SAVED', description: 'Application workspace created', at: new Date() }],
    })
  }

  return { workspace: ws, detail }
}

function buildChecklistFromDetail(detail) {
  if (!detail?.application?.checklist) {
    return [
      { item: 'Review opportunity requirements', required: true, status: 'PENDING', category: 'REQUIRED' },
      { item: 'Prepare resume', required: true, status: 'PENDING', category: 'REQUIRED' },
      { item: 'Review portfolio evidence', required: false, status: 'PENDING', category: 'OPTIONAL' },
    ]
  }
  return detail.application.checklist.map((c) => ({
    item: c.item,
    required: c.required === true,
    status: c.status === 'READY' || c.status === 'MET' ? 'COMPLETE' : 'PENDING',
    category: c.required ? 'REQUIRED' : c.status === 'OPTIONAL' ? 'OPTIONAL' : 'UNKNOWN',
  }))
}

async function buildCandidateProfile(userId) {
  const [profile, student, portfolio, gaps, sessions] = await Promise.all([
    UserProfile.findOne({ userId }).lean(),
    InstitutionStudent.findOne({ linkedUserId: userId, status: 'active' }).lean(),
    projectIntelligence.getPortfolio(userId).catch(() => ({ projects: [] })),
    adaptiveLearning.getSkillGapAnalysis(userId).catch(() => ({ gaps: [], strengths: [] })),
    InterviewSession.find({ userId, status: 'COMPLETED' }).countDocuments(),
  ])

  const skills = [
    ...(profile?.skills || []),
    ...(student?.sharedSkills || []),
    ...(student?.verifiedSkills || []),
  ]
  const uniqueSkills = [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))]

  const projects = (portfolio.projects || []).map((p) => ({
    projectId: p.projectId,
    title: p.title,
    skills: p.skills,
    evidence: p.evidence,
    status: p.status,
    repository: p.repository,
    demo: p.demo,
  }))

  const completeness = computeProfileCompleteness(profile, student, projects)
  const consistency = detectProfileConsistency(profile, student)

  return {
    targetRole: profile?.targetRole || 'UNKNOWN',
    skills: uniqueSkills,
    education: student ? [{ course: student.course, department: student.department, batch: student.batch, cgpa: student.cgpa }] : [],
    experience: (student?.sharedExperience || []).map((e) => (typeof e === 'string' ? e : e.title || '')),
    projects,
    certificates: student?.certificates || [],
    achievements: student?.achievements || [],
    portfolioSummary: portfolio.portfolioGaps?.[0] || null,
    skillGaps: gaps.gaps?.slice(0, 5).map((g) => g.skill) || [],
    skillStrengths: gaps.strengths?.slice(0, 5).map((s) => s.skill) || [],
    interviewSessionsCompleted: sessions,
    completeness,
    consistency,
    disclaimer: 'Profile assembled from authorized data only — no fabricated facts.',
  }
}

function computeProfileCompleteness(profile, student, projects) {
  const missing = []
  if (!profile?.targetRole) missing.push('target role')
  if (!(profile?.skills?.length || student?.sharedSkills?.length)) missing.push('skills')
  if (!student?.course) missing.push('education')
  if (!projects.length) missing.push('portfolio projects')
  if (!student?.sharedProjects?.length && !projects.length) missing.push('project evidence')

  if (!missing.length) return { level: 'COMPLETE', missing: [], score: 100 }
  if (missing.length <= 2) return { level: 'PARTIAL', missing, score: 70 - missing.length * 10 }
  return { level: 'MISSING', missing, score: 30 }
}

function detectProfileConsistency(profile, student) {
  const flags = []
  const declaredSkills = profile?.skills || []
  const studentSkills = student?.sharedSkills || []
  if (declaredSkills.length && studentSkills.length) {
    const overlap = declaredSkills.filter((s) =>
      studentSkills.some((ss) => String(ss).toLowerCase().includes(String(s).toLowerCase())),
    )
    if (overlap.length < Math.min(declaredSkills.length, studentSkills.length) * 0.3) {
      flags.push('CONSISTENCY REVIEW REQUIRED: Profile skills differ from institution student record')
    }
  }
  return { consistent: !flags.length, flags }
}

async function computeApplicationHealth(userId, workspace, detail) {
  const profile = await buildCandidateProfile(userId)
  if (profile.completeness.level === 'MISSING') {
    return { health: 'BLOCKED_BY_MISSING_USER_INFORMATION', reasons: profile.completeness.missing }
  }
  const readiness = detail?.application?.readinessState || 'NEEDS_IMPROVEMENT'
  if (readiness === 'READY_TO_CONSIDER') {
    return { health: 'READY', reasons: ['Readiness signals meet preparation threshold'] }
  }
  if (profile.consistency.flags.length) {
    return { health: 'NEEDS_ATTENTION', reasons: profile.consistency.flags }
  }
  return { health: 'NEEDS_ATTENTION', reasons: ['Review checklist and gaps before applying'] }
}

async function getWorkspace(userId, workspaceId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const detail = await opportunityIntelligence.getOpportunityDetail(
    userId,
    ws.opportunitySource,
    String(ws.opportunityId),
  ).catch(() => null)

  const [profile, strategy, readiness, interviewPrep] = await Promise.all([
    buildCandidateProfile(userId),
    opportunityIntelligence.getApplicationStrategy(userId, ws.opportunitySource, String(ws.opportunityId)).catch(() => null),
    careerReadiness.getApplicationReadinessCheck(userId, {
      source: ws.opportunitySource,
      sourceId: String(ws.opportunityId),
    }).catch(() => null),
    careerReadiness.getReadinessDashboard(userId).catch(() => null),
  ])

  const health = await computeApplicationHealth(userId, ws, detail)
  ws.health = health.health
  await ws.save()

  const deadline = ws.deadline ? classifyDeadline(ws.deadline) : { state: 'UNKNOWN', daysRemaining: null }

  return {
    workspace: formatWorkspace(ws),
    opportunity: detail?.opportunity || {
      title: ws.opportunityTitle,
      organization: ws.organization,
      source: ws.opportunitySource,
    },
    match: detail?.match || { state: ws.matchState },
    readiness: {
      state: readiness?.state || 'INSUFFICIENT_DATA',
      checklist: readiness?.checklist || [],
      safeToApply: readiness?.safeToApply ?? false,
    },
    candidateProfile: profile,
    strategy,
    documents: ws.documents,
    selectedProjects: ws.selectedProjects.length
      ? ws.selectedProjects
      : await recommendProjects(userId, strategy),
    coverLetter: ws.documents.find((d) => d.type === 'COVER_LETTER' && d.versionStatus === 'DRAFT'),
    questions: ws.questionAnswers,
    checklist: ws.checklist,
    interviewPreparation: {
      topics: strategy?.interviewTopics || [],
      readiness: strategy?.interviewReadiness,
      practicePath: '/ai/career/interview',
    },
    timeline: ws.timeline,
    health: health.health,
    healthReasons: health.reasons,
    deadline: {
      date: ws.deadline,
      daysRemaining: deadline.daysRemaining,
      state: deadline.state === 'UNKNOWN' ? 'DEADLINE UNKNOWN' : deadline.state,
    },
    submission: ws.submission,
    workflow: WORKFLOW_STAGES,
    disclaimer: 'Application workspace — user controls final submission.',
  }
}

function formatWorkspace(ws) {
  const o = ws.toObject ? ws.toObject() : ws
  return {
    workspaceId: o._id,
    status: o.status,
    health: o.health,
    opportunitySource: o.opportunitySource,
    opportunityId: o.opportunityId,
    opportunityTitle: o.opportunityTitle,
    organization: o.organization,
    matchState: o.matchState,
    recruitmentApplicationId: o.recruitmentApplicationId,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

async function recommendProjects(userId, strategy) {
  const portfolio = await projectIntelligence.getPortfolio(userId).catch(() => ({ projects: [] }))
  const required = strategy?.topGaps || []
  return (portfolio.projects || []).slice(0, 3).map((p) => ({
    projectId: p.projectId,
    title: p.title,
    reason: 'Relevant portfolio evidence for this opportunity',
    skills: p.skills,
    evidence: p.evidence,
  }))
}

async function getDashboard(userId, { status, sort = 'deadline' } = {}) {
  const query = { userId }
  if (status) query.status = status

  let workspaces = await ApplicationWorkspace.find(query).sort({ updatedAt: -1 }).limit(50).lean()

  if (sort === 'deadline') {
    workspaces.sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline) - new Date(b.deadline)
    })
  }

  const profile = await buildCandidateProfile(userId)

  const funnel = {}
  for (const stage of FUNNEL_STAGES) {
    funnel[stage] = workspaces.filter((w) => mapFunnelStage(w.status) === stage).length
  }

  return {
    activeApplications: workspaces.map((w) => ({
      workspaceId: w._id,
      title: w.opportunityTitle,
      organization: w.organization,
      status: w.status,
      health: w.health,
      matchState: w.matchState,
      deadline: w.deadline,
      nextAction: nextActionForStatus(w.status),
    })),
    preparation: {
      profileCompleteness: profile.completeness,
      skillGaps: profile.skillGaps,
    },
    funnel,
    coachPrompt: 'What should I do next?',
    disclaimer: 'Dashboard uses authorized application data only.',
  }
}

function mapFunnelStage(status) {
  const map = {
    SAVED: 'SAVED',
    PREPARING: 'PREPARING',
    READY: 'READY',
    APPLIED: 'APPLIED',
    UNDER_REVIEW: 'APPLIED',
    INTERVIEW: 'INTERVIEW',
    OFFER: 'OFFER',
  }
  return map[status] || 'DISCOVERED'
}

function nextActionForStatus(status) {
  const actions = {
    SAVED: 'Start preparation',
    PREPARING: 'Complete checklist',
    READY: 'Review and submit when ready',
    APPLIED: 'Track application status',
    INTERVIEW: 'Practice interview',
    OFFER: 'Review offer details',
  }
  return actions[status] || 'Review workspace'
}

async function startWorkspace(userId, { source, sourceId }) {
  const { workspace, detail } = await getOrCreateWorkspace(userId, source, sourceId)
  if (workspace.status === 'SAVED') {
    workspace.status = 'PREPARING'
    workspace.timeline.push({ event: 'PREPARING', description: 'Preparation started', at: new Date() })
    await workspace.save()
  }
  return getWorkspace(userId, workspace._id)
}

async function createResumeVersion(userId, workspaceId, { label, content, baseDocumentId } = {}) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const profile = await buildCandidateProfile(userId)
  const originalContent = profile.skills.join(', ') + '\n' + profile.projects.map((p) => p.title).join('\n')
  const newContent = sanitizeText(content || originalContent)
  const diffSummary = baseDocumentId
    ? 'Customized version — compare with base before approving'
    : 'Initial version from profile data'

  const doc = {
    documentId: uid('resume'),
    type: 'RESUME',
    label: label || 'General Resume',
    content: newContent,
    versionStatus: 'DRAFT',
    baseDocumentId: baseDocumentId || null,
    diffSummary,
  }
  ws.documents.push(doc)
  ws.timeline.push({ event: 'RESUME_DRAFT', description: `Resume version: ${doc.label}`, at: new Date() })
  await ws.save()

  return {
    document: doc,
    diff: { original: originalContent.slice(0, 500), changes: diffSummary },
    disclaimer: 'Review diff before approving. Original profile data is not overwritten.',
  }
}

async function generateCoverLetter(userId, workspaceId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const draft = await opportunityIntelligence.generateCoverLetterDraft(
    userId,
    ws.opportunitySource,
    String(ws.opportunityId),
  )

  const doc = {
    documentId: uid('cl'),
    type: 'COVER_LETTER',
    label: 'Cover Letter Draft',
    content: draft.draft,
    versionStatus: 'DRAFT',
    diffSummary: 'AI-GENERATED DRAFT',
  }
  ws.documents.push(doc)
  ws.timeline.push({ event: 'COVER_LETTER_DRAFT', description: 'Cover letter draft generated', at: new Date() })
  await ws.save()

  return { ...draft, documentId: doc.documentId }
}

async function draftQuestionAnswer(userId, workspaceId, { questionId, question, answerDraft }) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const q = sanitizeText(question)
  const a = sanitizeText(answerDraft)
  if (!q || !a) {
    const err = new Error('Question and answer required')
    err.statusCode = 400
    throw err
  }

  const review = reviewAnswer(a, q)
  const entry = {
    questionId: questionId || uid('q'),
    question: q,
    answerDraft: a,
    review,
    status: 'AI DRAFT',
  }

  const idx = ws.questionAnswers.findIndex((x) => x.questionId === entry.questionId)
  if (idx >= 0) ws.questionAnswers[idx] = entry
  else ws.questionAnswers.push(entry)

  await ws.save()
  return { answer: entry, disclaimer: 'AI DRAFT — edit before submission.' }
}

function reviewAnswer(answer, question) {
  const words = answer.split(/\s+/).filter(Boolean)
  return {
    relevance: answer.toLowerCase().includes(question.toLowerCase().slice(0, 10)) ? 70 : 60,
    clarity: words.length >= 30 ? 75 : 45,
    notes: words.length < 30 ? ['Answer may be too brief'] : ['Structure looks adequate'],
  }
}

async function getApplicationPreview(userId, workspaceId) {
  const full = await getWorkspace(userId, workspaceId)
  const missing = full.checklist.filter((c) => c.required && c.status !== 'COMPLETE').map((c) => c.item)
  const inconsistencies = full.candidateProfile.consistency.flags

  return {
    preview: {
      opportunity: full.opportunity,
      candidate: {
        targetRole: full.candidateProfile.targetRole,
        skills: full.candidateProfile.skills.slice(0, 10),
        projects: full.selectedProjects,
      },
      resume: full.documents.filter((d) => d.type === 'RESUME'),
      coverLetter: full.documents.filter((d) => d.type === 'COVER_LETTER'),
      answers: full.questions,
      checklist: full.checklist,
    },
    finalReview: {
      missingInformation: missing,
      inconsistencies,
      missingDocuments: full.documents.length ? [] : ['Resume not attached'],
      deadline: full.deadline,
      destination: full.opportunity.organization,
      requiresConfirmation: true,
    },
    disclaimer: 'Preview only — submission requires explicit user confirmation.',
  }
}

async function submitApplication(userId, workspaceId, payload = {}) {
  if (!payload.confirmed) {
    const err = new Error('Explicit user confirmation required (confirmed: true)')
    err.statusCode = 400
    throw err
  }

  const ws = await assertWorkspaceAccess(workspaceId, userId)
  if (ws.recruitmentApplicationId) {
    const err = new Error('Application already submitted for this workspace')
    err.statusCode = 409
    throw err
  }

  const preview = await getApplicationPreview(userId, workspaceId)
  const resumeDoc = ws.documents.find((d) => d.type === 'RESUME' && d.versionStatus === 'APPROVED')
    || ws.documents.find((d) => d.type === 'RESUME')

  const applyPayload = {
    resumeUrl: payload.resumeUrl || resumeDoc?.url || '',
    resumeFileName: payload.resumeFileName || resumeDoc?.label || '',
    applicationAnswers: ws.questionAnswers.map((q) => ({
      question: q.question,
      answer: q.answerDraft,
    })),
  }

  let application = null
  let submissionStatus = 'USER_MARKED_APPLIED'

  const supportedSources = ['campus_opportunity', 'job', 'internship']
  if (supportedSources.includes(ws.opportunitySource)) {
    try {
      application = await studentRecruitment.applyToOpportunity(
        userId,
        ws.opportunitySource,
        String(ws.opportunityId),
        applyPayload,
      )
      submissionStatus = 'VERIFIED_SUBMISSION'
    } catch (err) {
      if (err.statusCode === 409) {
        submissionStatus = 'USER_MARKED_APPLIED'
      } else {
        throw err
      }
    }
  }

  ws.status = 'APPLIED'
  ws.submission = {
    submittedAt: new Date(),
    destination: ws.organization,
    confirmationReference: application?.id || null,
    status: submissionStatus,
  }
  if (application?.id) {
    ws.recruitmentApplicationId = application.id
  }
  ws.timeline.push({
    event: 'APPLIED',
    description: submissionStatus === 'VERIFIED_SUBMISSION'
      ? 'Application submitted through supported flow'
      : 'User marked as applied',
    at: new Date(),
  })
  await ws.save()

  return {
    submitted: true,
    submissionStatus,
    application,
    workspace: formatWorkspace(ws),
    disclaimer: submissionStatus === 'VERIFIED_SUBMISSION'
      ? 'Application recorded through recruitment system.'
      : 'Marked as applied by user — verify external submission separately.',
  }
}

async function generateFollowUpDraft(userId, workspaceId, { type = 'inquiry' } = {}) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const body = `[DRAFT — review before sending]

Subject: Follow-up on ${ws.opportunityTitle} application

Dear Hiring Team,

I am following up regarding my application for ${ws.opportunityTitle} at ${ws.organization}.

I remain interested in this opportunity and would appreciate any update on the application status when convenient.

Thank you for your consideration.

[Your name]`

  const draft = { type, subject: `Follow-up: ${ws.opportunityTitle}`, body: sanitizeText(body) }
  ws.followUpDrafts.push(draft)
  ws.timeline.push({ event: 'FOLLOW_UP_DRAFT', description: 'Follow-up draft created', at: new Date() })
  await ws.save()

  return { draft, disclaimer: 'DRAFT — user must review before sending. AI does not send emails automatically.' }
}

async function updateOutcome(userId, workspaceId, { outcome, notes } = {}) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const allowed = ['INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'CLOSED']
  if (!allowed.includes(outcome)) {
    const err = new Error('Invalid outcome')
    err.statusCode = 400
    throw err
  }
  ws.outcome = outcome
  ws.outcomeNotes = sanitizeText(notes || '')
  ws.status = outcome
  ws.timeline.push({ event: outcome, description: ws.outcomeNotes || outcome, at: new Date() })
  await ws.save()
  return { workspace: formatWorkspace(ws) }
}

async function atsAnalysis(userId, workspaceId) {
  const ws = await assertWorkspaceAccess(workspaceId, userId)
  const [resumeMatch, strategy] = await Promise.all([
    opportunityIntelligence.getResumeMatching(userId, ws.opportunitySource, String(ws.opportunityId)),
    opportunityIntelligence.getApplicationStrategy(userId, ws.opportunitySource, String(ws.opportunityId)),
  ])

  const required = [...(strategy?.topStrengths || []), ...(strategy?.topGaps || [])]
  const resumeDoc = ws.documents.find((d) => d.type === 'RESUME')
  const content = resumeDoc?.content || ''
  const keywordCoverage = required.filter((k) => content.toLowerCase().includes(String(k).toLowerCase())).length

  return {
    keywordCoverage: required.length ? Math.round((keywordCoverage / required.length) * 100) : null,
    matchedSkills: resumeMatch.matchedSkills,
    missingSkills: resumeMatch.missingSkills,
    underrepresentedSkills: resumeMatch.underrepresentedSkills,
    structure: content.includes('\n') ? 'Multi-section detected' : 'Single block — consider sections',
    disclaimer: 'ATS-style analysis is generic — not verified for any specific employer ATS.',
  }
}

async function multiAgentAnalysis(userId, { source, sourceId, workspaceId } = {}) {
  const agents = []
  let ws = null
  if (workspaceId) {
    ws = await assertWorkspaceAccess(workspaceId, userId)
    source = ws.opportunitySource
    sourceId = String(ws.opportunityId)
  }

  const [profile, strategy, oppAnalysis] = await Promise.all([
    buildCandidateProfile(userId),
    source && sourceId
      ? opportunityIntelligence.getApplicationStrategy(userId, source, sourceId)
      : null,
    source && sourceId
      ? opportunityIntelligence.multiAgentMatchAnalysis(userId, { source, sourceId })
      : null,
  ])

  agents.push({ agentId: 'APPLICATION_AGENT', output: ws ? `Workspace status: ${ws.status}` : 'No workspace' })
  agents.push({ agentId: 'CAREER_AGENT', output: `Target role: ${profile.targetRole}` })
  agents.push({ agentId: 'OPPORTUNITY_AGENT', output: oppAnalysis?.analysis?.matchSummary?.state || 'N/A' })
  agents.push({ agentId: 'SKILL_AGENT', output: `${profile.skillStrengths.length} demonstrated, ${profile.skillGaps.length} gaps` })
  agents.push({ agentId: 'PROJECT_AGENT', output: `${profile.projects.length} portfolio project(s)` })
  agents.push({ agentId: 'PORTFOLIO_AGENT', output: profile.portfolioSummary || 'Portfolio reviewed' })
  agents.push({ agentId: 'RESUME_AGENT', output: strategy ? `Top strengths: ${strategy.topStrengths?.join(', ')}` : 'Resume pending' })
  agents.push({ agentId: 'INTERVIEW_AGENT', output: `${profile.interviewSessionsCompleted} mock session(s)` })
  agents.push({ agentId: 'LEARNING_AGENT', output: profile.skillGaps.slice(0, 2).join(', ') || 'No gaps' })

  return {
    agents,
    preparationPlan: {
      strengths: strategy?.topStrengths || profile.skillStrengths,
      gaps: strategy?.topGaps || profile.skillGaps,
      actions: strategy?.topActions || [],
      recommendedProject: strategy?.recommendedProject,
      recommendedLearning: strategy?.recommendedLearning,
    },
    disclaimer: 'Preparation plan — user controls submission.',
  }
}

async function applicationCopilot(userId, { question, workspaceId, source, sourceId } = {}) {
  const q = sanitizeText(question)
  if (!q) {
    const err = new Error('Question required')
    err.statusCode = 400
    throw err
  }

  let ws = null
  if (workspaceId) ws = await assertWorkspaceAccess(workspaceId, userId)
  else if (source && sourceId) {
    const created = await getOrCreateWorkspace(userId, source, sourceId)
    ws = created.workspace
  }

  const profile = await buildCandidateProfile(userId)

  if (/can i apply|apply now|ready to apply/i.test(q)) {
    if (ws) {
      const preview = await getApplicationPreview(userId, ws._id)
      const gaps = preview.finalReview.missingInformation
      return {
        answer: gaps.length
          ? `You can still apply, but consider addressing: ${gaps.join(', ')}. Your profile shows evidence for ${profile.skillStrengths.slice(0, 3).join(', ') || 'some skills'}. ${gaps.includes('SQL') || profile.skillGaps.includes('SQL') ? 'SQL evidence is limited — consider completing SQL preparation.' : ''} Application requires your explicit confirmation — AI will not submit automatically.`
          : `Your preparation looks adequate based on available evidence. Review the application preview and confirm submission when ready.`,
        contentType: 'APPLICATION_COPILOT',
      }
    }
  }

  if (/highlight|emphasize|show/i.test(q)) {
    const projects = profile.projects.slice(0, 2).map((p) => p.title)
    return {
      answer: `Highlight: ${profile.skillStrengths.slice(0, 3).join(', ') || 'your core skills'}. Projects to emphasize: ${projects.join(', ') || 'add portfolio projects first'}.`,
      contentType: 'APPLICATION_COPILOT',
    }
  }

  if (/after rejection|rejected/i.test(q)) {
    return {
      answer: 'After rejection: review interview performance, update portfolio evidence for gap skills, and practice mock interviews. Do not assume the employer\'s exact reason unless provided.',
      contentType: 'APPLICATION_COPILOT',
    }
  }

  return {
    answer: 'Application Copilot: Ask about readiness to apply, what to highlight, projects to show, or post-rejection next steps. I use authorized profile data only.',
    contentType: 'APPLICATION_COPILOT',
  }
}

async function searchWorkspaces(userId, { status, q, sort = 'recent' } = {}) {
  const query = { userId }
  if (status) query.status = status
  if (q) {
    query.$or = [
      { opportunityTitle: new RegExp(q, 'i') },
      { organization: new RegExp(q, 'i') },
    ]
  }

  const sortOpt = sort === 'deadline' ? { deadline: 1 } : { updatedAt: -1 }
  const items = await ApplicationWorkspace.find(query).sort(sortOpt).limit(30).lean()
  return { workspaces: items.map((w) => formatWorkspace({ ...w, _id: w._id })), total: items.length }
}

async function getAnalytics(userId) {
  const workspaces = await ApplicationWorkspace.find({ userId }).lean()
  const funnel = {}
  for (const stage of FUNNEL_STAGES) funnel[stage] = 0
  for (const w of workspaces) funnel[mapFunnelStage(w.status)] = (funnel[mapFunnelStage(w.status)] || 0) + 1

  const outcomes = {
    interview: workspaces.filter((w) => w.status === 'INTERVIEW').length,
    offer: workspaces.filter((w) => w.status === 'OFFER').length,
    rejected: workspaces.filter((w) => w.status === 'REJECTED').length,
    withdrawn: workspaces.filter((w) => w.status === 'WITHDRAWN').length,
  }

  const insights = workspaces.length >= 5
    ? { note: 'Sufficient data for basic funnel view' }
    : { note: 'Limited data — funnel insights not statistically reliable' }

  return { funnel, outcomes, total: workspaces.length, insights, disclaimer: 'Analytics from actual workspace events only.' }
}

module.exports = {
  getDashboard,
  getWorkspace,
  getOrCreateWorkspace,
  startWorkspace,
  buildCandidateProfile,
  createResumeVersion,
  generateCoverLetter,
  draftQuestionAnswer,
  getApplicationPreview,
  submitApplication,
  generateFollowUpDraft,
  updateOutcome,
  atsAnalysis,
  multiAgentAnalysis,
  applicationCopilot,
  searchWorkspaces,
  getAnalytics,
  assertWorkspaceAccess,
}
