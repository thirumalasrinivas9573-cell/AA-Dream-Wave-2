/**
 * Lasya V5 Prompt 6 — Project Intelligence + Portfolio + Skill-to-Project Engine
 * Composes adaptiveLearning, careerCopilot, talentIntelligence, knowledgeDiscovery, Task — no duplicates.
 */
const crypto = require('crypto')
const PortfolioProject = require('../models/PortfolioProject')
const Task = require('../models/Task')
const {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  DIFFICULTY_LEVELS,
  MILESTONE_DEFAULTS,
  PROJECT_TEMPLATES,
  INJECTION_PATTERNS,
  EVIDENCE_STRENGTH,
} = require('../constants/projectIntelligence')
const adaptiveLearning = require('./adaptiveLearningService')
const careerCopilot = require('./careerCopilotService')
const talentIntelligence = require('./talentIntelligenceService')
const knowledgeDiscovery = require('./knowledgeDiscoveryService')
const { getCareerData } = require('../data/careerDataset')

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function sanitizeText(text = '') {
  let str = String(text || '').trim().slice(0, 8000)
  for (const p of INJECTION_PATTERNS) {
    if (p.test(str)) str = str.replace(p, '[filtered]').trim()
  }
  return str
}

async function assertProjectAccess(projectId, userId, minRole = 'viewer') {
  const project = await PortfolioProject.findById(projectId)
  if (!project) {
    const err = new Error('Project not found')
    err.statusCode = 404
    throw err
  }
  const uidStr = userId.toString()
  const isOwner = project.ownerUserId.toString() === uidStr
  const isMember = project.teamMembers?.some((m) => m.userId?.toString() === uidStr)
  if (!isOwner && !isMember) {
    const err = new Error('Not authorized for this project')
    err.statusCode = 403
    throw err
  }
  return project
}

function inferDifficulty(gapAnalysis, skill) {
  const mastery = gapAnalysis?.strengths?.find((s) => s.skill?.toLowerCase().includes(skill.toLowerCase()))
  if (mastery) return 'INTERMEDIATE'
  const gap = gapAnalysis?.gaps?.find((g) => g.skill?.toLowerCase().includes(skill.toLowerCase()))
  if (gap?.status === 'NOT_STARTED') return 'BEGINNER'
  if (gap?.priority === 'HIGH') return 'INTERMEDIATE'
  return 'INTERMEDIATE'
}

function buildProjectRecommendation(skill, context = {}) {
  const templates = {
    'rest api': {
      title: 'Production REST API',
      objective: 'Build a production-style REST API with authentication, validation, database integration and automated testing',
      skills: ['REST APIs', 'Authentication', 'Database', 'Testing'],
      technologies: ['Node.js', 'Express', 'MongoDB'],
      features: ['User auth', 'CRUD endpoints', 'Input validation', 'Unit tests', 'API documentation'],
    },
    python: {
      title: 'Python Data Pipeline',
      objective: 'Build a data processing pipeline demonstrating Python fundamentals and testing',
      skills: ['Python', 'Data wrangling', 'Testing'],
      technologies: ['Python', 'pytest'],
      features: ['Data ingestion', 'Transformation', 'Export', 'Tests'],
    },
    'machine learning': {
      title: 'ML Prediction Service',
      objective: 'Train and serve a simple ML model with evaluation metrics and documentation',
      skills: ['Python', 'Machine Learning', 'APIs'],
      technologies: ['Python', 'scikit-learn', 'FastAPI'],
      features: ['Dataset prep', 'Model training', 'Evaluation', 'Inference API'],
    },
    sql: {
      title: 'Database-Backed Application',
      objective: 'Design schema, write queries, and build an app layer demonstrating SQL skills',
      skills: ['SQL', 'Database design', 'Backend'],
      technologies: ['PostgreSQL or MongoDB', 'Node.js or Python'],
      features: ['Schema design', 'CRUD queries', 'Migrations', 'Seed data'],
    },
  }
  const key = Object.keys(templates).find((k) => skill.toLowerCase().includes(k) || k.includes(skill.toLowerCase()))
  const base = key ? templates[key] : {
    title: `${skill} Portfolio Project`,
    objective: `Build a project demonstrating ${skill} with clear evidence and documentation`,
    skills: [skill],
    technologies: ['Choose stack aligned to your learning path'],
    features: ['Core feature', 'Tests or demo', 'Documentation'],
  }
  return {
    ...base,
    skill,
    why: context.opportunityTitle
      ? `${skill} is required or preferred for "${context.opportunityTitle}"`
      : context.careerGoal
        ? `${skill} supports your career goal: ${context.careerGoal}`
        : `Identified skill gap: ${skill}`,
    skillsDemonstrated: base.skills,
    expectedEvidence: ['Working implementation', 'Tests or demo', 'README documentation'],
    relatedOpportunities: context.opportunities || [],
    disclaimer: 'Suggested project — not built until you implement it.',
  }
}

async function getSkillToProjectRecommendations(userId, { targetRole, limit = 5 } = {}) {
  const profile = await adaptiveLearning.getOrCreateProfile(userId)
  const role = targetRole || profile.targetRole
  const gapAnalysis = await adaptiveLearning.getSkillGapAnalysis(userId, { targetRole: role })
  const talentRecs = await talentIntelligence.getProjectRecommendations(userId).catch(() => ({ recommendations: [] }))
  const careerCtx = await careerCopilot.loadCareerContext(userId).catch(() => null)

  const topGaps = gapAnalysis.gaps.slice(0, limit)
  const recommendations = topGaps.map((g) => {
    const rec = buildProjectRecommendation(g.skill, {
      careerGoal: role,
      opportunityTitle: gapAnalysis.opportunityContext?.what,
      opportunities: [],
    })
    return {
      ...rec,
      difficulty: inferDifficulty(gapAnalysis, g.skill),
      priority: g.priority,
      learningPath: g.learnNext ? [`LEARN ${g.skill}`, 'PRACTICE', 'BUILD PROJECT'] : ['BUILD PROJECT'],
    }
  })

  if (!recommendations.length && talentRecs.recommendations?.length) {
    for (const r of talentRecs.recommendations.slice(0, limit)) {
      recommendations.push(buildProjectRecommendation(r.skill, { careerGoal: role }))
    }
  }

  return {
    targetRole: role,
    recommendations,
    existingProjects: await PortfolioProject.find({ ownerUserId: userId }).select('title status skills').lean(),
    careerContext: careerCtx?.targetRole || role,
    disclaimer: 'Recommendations are suggestions — AI does not claim projects are already built.',
  }
}

function defaultMilestones() {
  return MILESTONE_DEFAULTS.map((title, i) => ({
    milestoneId: uid('ms'),
    order: i + 1,
    title,
    status: 'NOT_STARTED',
    dependsOn: i > 0 ? [String(i)] : [],
    taskIds: [],
  }))
}

function computeProgress(project) {
  if (!project.milestones?.length) return 0
  const completed = project.milestones.filter((m) => m.status === 'COMPLETED').length
  return Math.round((completed / project.milestones.length) * 100)
}

function detectHealth(project) {
  const blockers = []
  if (project.blockers?.length) blockers.push(...project.blockers)
  const incompleteDeps = project.milestones.filter((m) => {
    if (m.status === 'COMPLETED') return false
    return m.dependsOn?.length && project.milestones.some((dep) => dep.order < m.order && dep.status !== 'COMPLETED')
  })
  if (incompleteDeps.length) {
    blockers.push(`Milestone "${incompleteDeps[0].title}" blocked by incomplete dependencies`)
  }
  if (project.status === 'COMPLETED' || project.status === 'PUBLISHED') return { health: 'COMPLETED', blockers }
  if (blockers.length) return { health: 'BLOCKED', blockers }
  const stale = project.updatedAt && (Date.now() - new Date(project.updatedAt).getTime()) > 30 * 86400000
  if (stale && project.status === 'IN_PROGRESS') return { health: 'AT_RISK', blockers: ['No recent project activity'] }
  return { health: 'ON_TRACK', blockers }
}

async function buildProjectFromIdea(userId, idea, options = {}) {
  const safeIdea = sanitizeText(idea)
  if (!safeIdea) {
    const err = new Error('Project idea required')
    err.statusCode = 400
    throw err
  }

  const profile = await adaptiveLearning.getOrCreateProfile(userId)
  const gapAnalysis = await adaptiveLearning.getSkillGapAnalysis(userId, { targetRole: profile.targetRole })
  const isAI = /ai|chatbot|llm|rag|machine learning|ml/i.test(safeIdea)
  const isWeb = /api|web|app|full.?stack|rest/i.test(safeIdea)

  const skills = gapAnalysis.gaps.slice(0, 4).map((g) => g.skill)
  if (isAI && !skills.includes('Python')) skills.unshift('Python', 'APIs', 'LLM integration')
  if (isWeb && !skills.some((s) => /api|rest/i.test(s))) skills.push('REST APIs')

  const architecture = {
    frontend: isWeb || isAI ? 'React or Next.js (if UI required)' : 'N/A or minimal UI',
    backend: isAI ? 'Python FastAPI or Node.js Express' : 'Node.js Express or Python FastAPI',
    database: 'MongoDB or PostgreSQL',
    authentication: isWeb ? 'JWT or session-based auth' : 'Optional for MVP',
    ai: isAI ? 'OpenAI API or local model integration' : 'N/A',
    apis: 'REST endpoints with validation',
    deployment: 'Docker + cloud platform (user deploys)',
  }

  const project = await PortfolioProject.create({
    ownerUserId: userId,
    title: safeIdea.slice(0, 120),
    description: safeIdea,
    problemStatement: `Problem: Users need a solution for "${safeIdea}"`,
    objective: `Build a demonstrable ${safeIdea} with tests and documentation`,
    scope: options.scope || 'MVP with core features, tests, and README',
    status: 'PLANNING',
    difficulty: options.difficulty || DIFFICULTY_LEVELS[1],
    projectType: options.projectType || 'PORTFOLIO_PROJECT',
    skills: [...new Set(skills)],
    technologies: isAI ? ['Python', 'FastAPI', 'MongoDB'] : ['Node.js', 'Express', 'MongoDB'],
    features: ['Core user flow', 'API layer', 'Data persistence', 'Basic tests', 'README'],
    requirements: {
      functional: ['User can interact with core feature', 'Data persists correctly', 'Errors handled gracefully'],
      nonFunctional: ['Readable code structure', 'Basic security (input validation)'],
      constraints: ['Use authorized resources only', 'No fabricated deployment claims'],
      successCriteria: ['Demo works locally', 'Tests pass when user runs them', 'Documentation complete'],
    },
    architecture,
    milestones: defaultMilestones(),
    careerGoal: profile.targetRole,
    careerRelevance: profile.targetRole ? `Demonstrates skills relevant to ${profile.targetRole}` : '',
    aiGenerated: { plan: true, architecture: true, readme: false, codeSamples: false },
    timeline: [{ event: 'PROJECT_PLANNED', description: `AI project plan generated for: ${safeIdea.slice(0, 80)}` }],
  })

  project.progress = computeProgress(project)
  const { health, blockers } = detectHealth(project)
  project.health = health
  project.blockers = blockers
  await project.save()
  return project.toObject()
}

async function createProject(userId, payload) {
  const project = await PortfolioProject.create({
    ownerUserId: userId,
    title: sanitizeText(payload.title) || 'Untitled Project',
    description: sanitizeText(payload.description),
    projectType: PROJECT_TYPES.includes(payload.projectType) ? payload.projectType : 'PORTFOLIO_PROJECT',
    status: 'IDEA',
    skills: payload.skills || [],
    technologies: payload.technologies || [],
    milestones: defaultMilestones(),
    timeline: [{ event: 'PROJECT_CREATED', description: 'Project created by user' }],
  })
  return project.toObject()
}

async function listProjects(userId, { status, limit = 20 } = {}) {
  const filter = { ownerUserId: userId }
  if (status && PROJECT_STATUSES.includes(status)) filter.status = status
  const items = await PortfolioProject.find(filter).sort({ updatedAt: -1 }).limit(limit).lean()
  return items
}

async function getProject(projectId, userId) {
  const project = await assertProjectAccess(projectId, userId)
  return project.toObject()
}

async function updateProject(projectId, userId, patch) {
  const project = await assertProjectAccess(projectId, userId)
  const fields = ['title', 'description', 'status', 'difficulty', 'skills', 'technologies', 'problemStatement', 'objective', 'scope', 'features', 'careerRelevance']
  for (const f of fields) {
    if (patch[f] !== undefined) project[f] = Array.isArray(patch[f]) ? patch[f] : sanitizeText(patch[f])
  }
  if (patch.repositoryReference?.url) {
    project.repositoryReference = {
      url: patch.repositoryReference.url,
      authorized: true,
      label: patch.repositoryReference.label || 'User-linked repository',
    }
  }
  if (patch.status && PROJECT_STATUSES.includes(patch.status)) {
    project.timeline.push({ event: 'STATUS_CHANGED', description: `Status → ${patch.status}` })
    if (patch.status === 'COMPLETED') {
      project.health = 'COMPLETED'
    }
  }
  project.progress = computeProgress(project)
  const { health, blockers } = detectHealth(project)
  project.health = health
  project.blockers = blockers
  await project.save()
  return project.toObject()
}

async function generateMilestoneTasks(userId, projectId, milestoneId) {
  const project = await assertProjectAccess(projectId, userId)
  const milestone = project.milestones.find((m) => m.milestoneId === milestoneId)
  if (!milestone) {
    const err = new Error('Milestone not found')
    err.statusCode = 404
    throw err
  }
  const tasks = [
    { title: `${milestone.title}: Research & plan`, type: 'learn', priority: 'High' },
    { title: `${milestone.title}: Implement`, type: 'practice', priority: 'High' },
    { title: `${milestone.title}: Review & document`, type: 'revise', priority: 'Medium' },
  ]
  const created = []
  for (const t of tasks) {
    const task = await Task.create({
      userId,
      title: t.title,
      description: `Project: ${project.title} — ${milestone.title}`,
      type: t.type,
      priority: t.priority,
      category: project.category || 'Project',
    })
    milestone.taskIds.push(task._id)
    created.push(task)
  }
  await project.save()
  return { milestone, tasks: created.map((t) => t.toObject()) }
}

async function addEvidence(userId, projectId, payload) {
  const project = await assertProjectAccess(projectId, userId)
  const strength = EVIDENCE_STRENGTH.includes(payload.strength) ? payload.strength : 'IN_PROGRESS'
  const evidence = {
    evidenceId: uid('ev'),
    type: payload.type || 'ARTIFACT',
    strength,
    title: sanitizeText(payload.title || ''),
    url: payload.url || '',
    verified: payload.verified === true,
    skillsDemonstrated: payload.skillsDemonstrated || project.skills || [],
    metadata: payload.metadata || {},
  }
  project.evidence.push(evidence)
  project.timeline.push({ event: 'EVIDENCE_ADDED', description: evidence.title || evidence.type })

  if (strength === 'DEMONSTRATED' || strength === 'VERIFIED') {
    for (const skill of evidence.skillsDemonstrated) {
      await adaptiveLearning.recordEvidence(userId, {
        skillName: skill,
        evidenceType: 'PROJECT',
        title: `${project.title}: ${evidence.title}`,
        passed: strength === 'VERIFIED' ? true : null,
      })
    }
  }

  project.progress = computeProgress(project)
  await project.save()
  return { project: project.toObject(), evidence }
}

async function reviewProject(userId, projectId) {
  const project = await assertProjectAccess(projectId, userId)
  const issues = []
  const strengths = []

  if (!project.problemStatement) issues.push('Missing problem statement')
  else strengths.push('Problem statement defined')

  if (!project.architecture?.backend && !project.architecture?.frontend) issues.push('Architecture not documented')
  else strengths.push('Architecture documented')

  if (!project.evidence?.length) issues.push('No project evidence recorded')
  else strengths.push(`${project.evidence.length} evidence item(s)`)

  const demonstrated = project.evidence.filter((e) => ['DEMONSTRATED', 'VERIFIED'].includes(e.strength))
  if (!demonstrated.length) issues.push('No demonstrated or verified evidence yet')

  if (!project.documentation?.readme) issues.push('Missing README documentation')

  const skillsCoverage = project.skills?.length || 0
  if (skillsCoverage < 2) issues.push('Limited skill coverage documented')

  return {
    projectId: project._id,
    title: project.title,
    issues,
    strengths,
    skillsDemonstrated: project.skills,
    quality: {
      problemClarity: project.problemStatement ? 'OK' : 'WEAK',
      documentation: project.documentation?.readme ? 'OK' : 'WEAK',
      evidence: demonstrated.length ? 'OK' : 'WEAK',
      skillCoverage: skillsCoverage >= 2 ? 'OK' : 'WEAK',
    },
    disclaimer: 'Review based on recorded project data only — not a security audit.',
  }
}

async function generateDescriptions(userId, projectId) {
  const project = await assertProjectAccess(projectId, userId)
  const short = `${project.title}: ${project.problemStatement || project.objective}`.slice(0, 160)
  const long = [
    project.problemStatement,
    project.objective,
    `Technologies: ${(project.technologies || []).join(', ') || 'TBD'}`,
    `Skills: ${(project.skills || []).join(', ') || 'TBD'}`,
  ].filter(Boolean).join('\n')
  const resumeBullet = demonstratedSkills => {
    const skills = (project.skills || []).slice(0, 3).join(', ')
    return `Built ${project.title} demonstrating ${skills || 'technical skills'}${project.evidence?.length ? ' with documented evidence' : ''}`
  }
  return {
    short,
    long,
    resumeBullet: resumeBullet(),
    portfolio: long,
    technical: project.architecture ? JSON.stringify(project.architecture, null, 2) : '',
    disclaimer: 'Descriptions reflect actual project fields — edit before publishing.',
  }
}

async function generateReadme(userId, projectId) {
  const project = await assertProjectAccess(projectId, userId)
  const readme = `# ${project.title}

## Overview
${project.description || project.objective}

## Problem
${project.problemStatement || 'TBD'}

## Features
${(project.features || []).map((f) => `- ${f}`).join('\n') || '- TBD'}

## Architecture
- Frontend: ${project.architecture?.frontend || 'TBD'}
- Backend: ${project.architecture?.backend || 'TBD'}
- Database: ${project.architecture?.database || 'TBD'}

## Installation
\`\`\`bash
# User must add actual install steps after implementation
\`\`\`

## Testing
\`\`\`bash
# Run tests after implementation — do not claim passed unless executed
\`\`\`

## AI-Generated Scaffold
This README structure was AI-generated. Replace placeholders with actual project details.
`
  project.documentation = project.documentation || {}
  project.documentation.readme = readme
  project.aiGenerated.readme = true
  await project.save()
  return { readme, aiGenerated: true }
}

async function generateTestPlan(userId, projectId) {
  const project = await assertProjectAccess(projectId, userId)
  const plan = {
    unit: (project.features || []).map((f) => `Unit test: ${f}`),
    integration: ['API endpoint integration tests', 'Database integration tests'],
    api: ['Auth endpoints', 'CRUD validation', 'Error responses'],
    ui: project.architecture?.frontend ? ['Core user flow smoke test'] : [],
    security: ['Input validation', 'AuthZ checks', 'No secrets in repo'],
  }
  project.documentation = project.documentation || {}
  project.documentation.testPlan = JSON.stringify(plan, null, 2)
  await project.save()
  return { testPlan: plan, disclaimer: 'Generated test plan — execution required for pass evidence.' }
}

async function getOpportunityMatch(userId, projectId) {
  const project = await assertProjectAccess(projectId, userId)
  const { getStudentFeed } = require('./opportunityMatchingService')
  const feed = await getStudentFeed(userId, { limit: 10 }).catch(() => ({ strongMatches: [] }))

  const matches = []
  for (const opp of feed.strongMatches || feed.items || []) {
    const reqSkills = opp.requiredSkills || opp.skills || []
    const projectSkills = (project.skills || []).map((s) => s.toLowerCase())
    const matched = reqSkills.filter((s) => projectSkills.some((ps) => ps.includes(String(s).toLowerCase()) || String(s).toLowerCase().includes(ps)))
    if (matched.length) {
      matches.push({
        opportunityId: opp.id || opp._id,
        title: opp.title,
        matchedSkills: matched,
        projectSkills: project.skills,
        matchLevel: matched.length >= 2 ? 'STRONG' : 'PARTIAL',
        disclaimer: 'Skill overlap shown — does not guarantee selection.',
      })
    }
  }
  return { projectId: project._id, matches }
}

async function getPortfolio(userId) {
  const projects = await PortfolioProject.find({ ownerUserId: userId }).sort({ updatedAt: -1 }).lean()
  const profile = await adaptiveLearning.getOrCreateProfile(userId)
  const gapAnalysis = await adaptiveLearning.getSkillGapAnalysis(userId)

  const cards = projects.map((p) => ({
    projectId: p._id,
    title: p.title,
    problem: p.problemStatement,
    solution: p.objective,
    technology: p.technologies,
    skills: p.skills,
    status: p.status,
    evidence: (p.evidence || []).map((e) => ({ type: e.type, strength: e.strength, title: e.title })),
    repository: p.repositoryReference?.authorized ? p.repositoryReference.url : null,
    demo: p.demoReference?.url || null,
    progress: p.progress,
  }))

  const gaps = []
  if (!projects.length) gaps.push('No portfolio projects — create your first project')
  const weakEvidence = projects.filter((p) => !p.evidence?.some((e) => ['DEMONSTRATED', 'VERIFIED'].includes(e.strength)))
  if (weakEvidence.length) gaps.push(`${weakEvidence.length} project(s) lack demonstrated evidence`)
  const noDocs = projects.filter((p) => !p.documentation?.readme)
  if (noDocs.length) gaps.push(`${noDocs.length} project(s) missing documentation`)

  const strongest = projects
    .filter((p) => p.evidence?.some((e) => e.strength === 'VERIFIED' || e.strength === 'DEMONSTRATED'))
    .slice(0, 3)

  return {
    projects: cards,
    skillGaps: gapAnalysis.gaps.slice(0, 5),
    portfolioGaps: gaps,
    strongestEvidence: strongest.map((p) => p.title),
    weakestEvidence: weakEvidence.map((p) => p.title),
    recommendedImprovement: gaps[0] || 'Continue building evidence for existing projects',
    targetRole: profile.targetRole,
    scores: {
      documentation: projects.length ? Math.round(((projects.length - noDocs.length) / projects.length) * 100) : 0,
      evidence: projects.length ? Math.round(((projects.length - weakEvidence.length) / projects.length) * 100) : 0,
      skillCoverage: Math.min(100, (profile.skillMasteries?.length || 0) * 10),
      projectClarity: projects.filter((p) => p.problemStatement).length,
    },
  }
}

async function getDashboard(userId) {
  const projects = await PortfolioProject.find({ ownerUserId: userId }).sort({ updatedAt: -1 }).limit(5).lean()
  const active = projects.find((p) => ['IN_PROGRESS', 'PLANNING', 'TESTING'].includes(p.status)) || projects[0]
  const recs = await getSkillToProjectRecommendations(userId, { limit: 3 })
  const profile = await adaptiveLearning.getOrCreateProfile(userId)

  let currentMilestone = null
  let currentTasks = []
  if (active) {
    currentMilestone = active.milestones?.find((m) => m.status !== 'COMPLETED') || null
    if (currentMilestone?.taskIds?.length) {
      currentTasks = await Task.find({ _id: { $in: currentMilestone.taskIds } }).lean()
    }
  }

  return {
    activeProject: active ? {
      id: active._id,
      title: active.title,
      status: active.status,
      progress: active.progress,
      health: active.health,
      currentMilestone: currentMilestone?.title,
      skills: active.skills,
      evidence: (active.evidence || []).map((e) => e.type),
    } : null,
    projects: projects.map((p) => ({ id: p._id, title: p.title, status: p.status, progress: p.progress })),
    recommendations: recs.recommendations,
    careerGoal: profile.targetRole,
    coachPrompt: 'What should I build next?',
    currentTasks: currentTasks.map((t) => ({ id: t._id, title: t.title, completed: t.completed })),
  }
}

async function projectCoachChat(userId, projectId, { question, resourceContext } = {}) {
  const project = await assertProjectAccess(projectId, userId)
  const q = sanitizeText(question)
  if (!q) {
    const err = new Error('Question required')
    err.statusCode = 400
    throw err
  }

  const milestone = project.milestones?.find((m) => m.status !== 'COMPLETED')
  let answer = ''

  if (/architecture|design|structure/i.test(q)) {
    answer = `Architecture for "${project.title}":\n${JSON.stringify(project.architecture, null, 2)}\n\n(AI-generated scaffold — verify before implementation.)`
  } else if (/next task|what should i|next step/i.test(q)) {
    answer = milestone
      ? `Current milestone: ${milestone.title}. Suggested: complete tasks for this milestone, then move to the next.`
      : 'All milestones complete — add evidence, run tests, and update documentation.'
  } else if (/debug|error|fix/i.test(q)) {
    answer = `Conceptual debugging for "${project.title}": Describe the error, expected behavior, and what changed recently. I can suggest checks — I cannot execute code on your machine.`
  } else if (/test/i.test(q)) {
    answer = `Test plan categories: unit, integration, API, security. Generate a test plan via POST /projects/:id/test-plan. Only mark tests passed after you run them.`
  } else if (resourceContext) {
    answer = `Answering about "${project.title}" using provided resource context only. If the answer is not in your authorized materials, I cannot fabricate it.`
  } else {
    answer = `Project Coach for "${project.title}" (${project.status}): Ask about architecture, next steps, tests, or documentation. I will not claim the project is deployed or completed without your evidence.`
  }

  project.timeline.push({ event: 'COACH_CHAT', description: q.slice(0, 80) })
  await project.save()

  return {
    answer,
    contentType: 'AI_PROJECT_COACH',
    projectId: project._id,
    milestone: milestone?.title,
    disclaimer: 'Coach provides guidance only — does not modify academic records or execute code.',
  }
}

async function getTemplates() {
  return Object.entries(PROJECT_TEMPLATES).map(([category, t]) => ({
    category,
    ...t,
    projectType: 'PORTFOLIO_PROJECT',
    milestones: MILESTONE_DEFAULTS,
    expectedEvidence: ['Implementation', 'Tests', 'README', 'Demo optional'],
  }))
}

async function multiAgentPlan(userId, { careerGoal } = {}) {
  const profile = await adaptiveLearning.getOrCreateProfile(userId)
  const role = careerGoal || profile.targetRole
  const gaps = await adaptiveLearning.getSkillGapAnalysis(userId, { targetRole: role })
  const recs = await getSkillToProjectRecommendations(userId, { targetRole: role, limit: 3 })
  const resources = await knowledgeDiscovery.globalSearch({
    userId,
    role: 'student',
    query: `${role} portfolio project best practices`,
    limit: 5,
  }).catch(() => ({ results: [] }))

  return {
    agents: [
      { agentId: 'CAREER_AGENT', output: `Target: ${role}` },
      { agentId: 'SKILL_AGENT', output: `${gaps.gaps.length} skill gap(s) identified` },
      { agentId: 'PROJECT_AGENT', output: `${recs.recommendations.length} project recommendation(s)` },
      { agentId: 'LEARNING_AGENT', output: gaps.gaps.slice(0, 2).map((g) => g.learnNext).join('; ') },
      { agentId: 'RESEARCH_AGENT', output: `${resources.results?.length || 0} resource(s) found` },
    ],
    plan: recs.recommendations,
    resources: (resources.results || []).slice(0, 3).map((r) => ({ title: r.title, href: r.href })),
    disclaimer: 'Multi-agent plan is advisory — user must build projects.',
  }
}

module.exports = {
  getSkillToProjectRecommendations,
  buildProjectFromIdea,
  createProject,
  listProjects,
  getProject,
  updateProject,
  generateMilestoneTasks,
  addEvidence,
  reviewProject,
  generateDescriptions,
  generateReadme,
  generateTestPlan,
  getOpportunityMatch,
  getPortfolio,
  getDashboard,
  projectCoachChat,
  getTemplates,
  multiAgentPlan,
  assertProjectAccess,
}
