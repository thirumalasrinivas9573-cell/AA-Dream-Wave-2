/**
 * Learning Intelligence + Adaptive Roadmap Engine (Thirumala V3 Prompt 7).
 *
 * Extends Goal → Roadmap → Task → Library — does NOT create RoadmapV3 / Skill collections.
 * Recommendations are suggestions only; never silently rewrite roadmaps or invent mastery.
 */
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const LibraryBook = require('../models/LibraryBook')
const StudentProfile = require('../models/StudentProfile')
const CareerProfile = require('../models/CareerProfile')
const progressEngine = require('./progressEngine')

const LEARNING_INTENTS = [
  'LEARNING_NEXT',
  'LEARNING_PLAN',
  'TOPIC_EXPLANATION',
  'RESOURCE_RECOMMENDATION',
  'SKILL_GAP',
  'ROADMAP_REVIEW',
  'PROGRESS_REVIEW',
  'REVISION_PLAN',
  'PROJECT_LEARNING',
  'EXAM_PREPARATION',
]

const INTENT_KEYWORDS = {
  LEARNING_NEXT: /\b(what should i learn|learn next|next (topic|skill|to learn)|what to study)\b/i,
  SKILL_GAP: /\b(skill gap|missing skill|what skill|skills? (am i|i'?m) missing)\b/i,
  RESOURCE_RECOMMENDATION: /\b(which (book|resource|course)|recommend (a )?(book|resource|course)|what should i read)\b/i,
  LEARNING_PLAN: /\b(learning plan|study plan|plan my learning)\b/i,
  REVISION_PLAN: /\b(revise|revision|review (this|the) topic|spaced review)\b/i,
  ROADMAP_REVIEW: /\b(roadmap review|adapt (my )?roadmap|roadmap stuck)\b/i,
  PROGRESS_REVIEW: /\b(learning progress|how am i progressing|progress review)\b/i,
  PROJECT_LEARNING: /\b(project (need|require|learning)|learn for (my )?project)\b/i,
  EXAM_PREPARATION: /\b(exam|midterm|finals?|test prep)\b/i,
  TOPIC_EXPLANATION: /\b(explain|what is|help me understand|teach me)\b/i,
}

const SKILL_STATES = ['NOT_STARTED', 'LEARNING', 'PRACTICING', 'PROJECT_EVIDENCE', 'VERIFIED']

function normalizeSkill(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function skillKey(value) {
  return normalizeSkill(value).replace(/[^a-z0-9+#.]/g, '')
}

function routeLearningIntent(message = '', action = '') {
  if (action === 'learning-next' || action === 'recommend-next') return 'LEARNING_NEXT'
  if (action === 'skill-gap') return 'SKILL_GAP'
  if (action === 'recommend-resources' || action === 'recommend-books') return 'RESOURCE_RECOMMENDATION'
  if (action === 'learning-plan' || action === 'study-plan') return 'LEARNING_PLAN'
  if (action === 'revision-plan') return 'REVISION_PLAN'
  if (action === 'roadmap-review') return 'ROADMAP_REVIEW'
  if (action === 'progress-review' || action === 'review-progress') return 'PROGRESS_REVIEW'
  if (action === 'project-learning') return 'PROJECT_LEARNING'
  if (action === 'exam-prep') return 'EXAM_PREPARATION'
  for (const [intent, pattern] of Object.entries(INTENT_KEYWORDS)) {
    if (pattern.test(message)) return intent
  }
  return 'LEARNING_NEXT'
}

function uniqueSkills(list = []) {
  const seen = new Set()
  const out = []
  for (const raw of list) {
    const name = typeof raw === 'string' ? raw.trim() : String(raw?.name || '').trim()
    if (!name || name.length > 100) continue
    const key = skillKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function extractRequiredSkills({ goal, roadmap, career } = {}) {
  const fromGoal = [
    ...(goal?.requiredSkills || []),
    ...(Array.isArray(goal?.skills) ? goal.skills : []),
  ]
  const fromRoadmapStages = (roadmap?.learningStages || []).flatMap((stage) => stage.skills || [])
  const fromRoadmapData = [
    ...(roadmap?.data?.skills || []),
    ...((roadmap?.data?.nextSteps || []).flatMap((step) => step.skills || [])),
  ]
  const fromCareer = (career?.requiredSkills || []).map((s) => (typeof s === 'string' ? s : s?.name))
  return uniqueSkills([...fromGoal, ...fromRoadmapStages, ...fromRoadmapData, ...fromCareer])
}

function extractTopics(roadmap) {
  const topics = []
  for (const stage of roadmap?.learningStages || []) {
    if (stage.title) topics.push({ title: stage.title, status: stage.status || 'available', skills: stage.skills || [], source: 'stage' })
    for (const topic of stage.topics || []) {
      topics.push({
        title: typeof topic === 'string' ? topic : topic.title,
        status: typeof topic === 'object' ? topic.status : stage.status,
        skills: stage.skills || [],
        source: 'stage_topic',
      })
    }
  }
  for (const step of roadmap?.data?.nextSteps || []) {
    topics.push({
      title: step.title || step.step || 'Roadmap step',
      status: step.completed ? 'completed' : 'available',
      skills: step.skills || [],
      source: 'next_step',
    })
  }
  return topics.filter((t) => t.title)
}

function classifySkillState({ name, profileSkill, tasks, projects, roadmap }) {
  const key = skillKey(name)
  if (profileSkill?.verified) return 'VERIFIED'

  const projectHit = (projects || []).some((p) => {
    if (p.status === 'archived') return false
    return (p.technologies || []).some((tech) => skillKey(tech) === key || skillKey(tech).includes(key) || key.includes(skillKey(tech)))
  })
  if (projectHit) return 'PROJECT_EVIDENCE'

  const practiceTasks = (tasks || []).filter((t) => {
    const blob = `${t.title || ''} ${t.description || ''} ${(t.tags || []).join(' ')}`.toLowerCase()
    return blob.includes(normalizeSkill(name)) && ['practice', 'quiz', 'revise'].includes(t.type)
  })
  if (practiceTasks.some((t) => t.completed || t.status === 'completed')) return 'PRACTICING'
  if (practiceTasks.length) return 'PRACTICING'

  const learnTasks = (tasks || []).filter((t) => {
    const blob = `${t.title || ''} ${t.description || ''}`.toLowerCase()
    return blob.includes(normalizeSkill(name))
  })
  if (learnTasks.length || (profileSkill && (profileSkill.proficiency || 0) > 0)) return 'LEARNING'

  const stageHit = (roadmap?.learningStages || []).some((stage) => {
    const inSkills = (stage.skills || []).some((s) => skillKey(s) === key)
    return inSkills && ['in-progress', 'available', 'completed'].includes(stage.status)
  })
  if (stageHit) return 'LEARNING'

  return 'NOT_STARTED'
}

function buildSkillGapAnalysis(snapshot) {
  const required = extractRequiredSkills(snapshot)
  const profileByKey = new Map(
    (snapshot.profileSkills || []).map((s) => [skillKey(s.name), s]),
  )

  const items = required.map((name) => {
    const profileSkill = profileByKey.get(skillKey(name))
    const state = classifySkillState({
      name,
      profileSkill,
      tasks: snapshot.tasks,
      projects: snapshot.projects,
      roadmap: snapshot.roadmap,
    })
    const evidence = []
    if (profileSkill) {
      evidence.push({
        type: 'profile_skill',
        label: `Profile skill · proficiency ${profileSkill.proficiency ?? 0}%${profileSkill.verified ? ' · verified' : ''}`,
      })
    }
    const relatedProjects = (snapshot.projects || []).filter((p) =>
      (p.technologies || []).some((tech) => skillKey(tech) === skillKey(name) || skillKey(tech).includes(skillKey(name))),
    )
    relatedProjects.slice(0, 2).forEach((p) => {
      evidence.push({ type: 'project', label: `Project: ${p.title}`, status: p.status })
    })
    const relatedTasks = (snapshot.tasks || []).filter((t) =>
      `${t.title || ''} ${t.description || ''}`.toLowerCase().includes(normalizeSkill(name)),
    )
    if (relatedTasks.length) {
      evidence.push({
        type: 'task',
        label: `${relatedTasks.filter((t) => t.completed || t.status === 'completed').length}/${relatedTasks.length} related tasks completed`,
      })
    }

    return {
      skill: name,
      state,
      gap: state === 'NOT_STARTED' || state === 'LEARNING',
      evidence,
      recommendedNextStep: state === 'NOT_STARTED'
        ? `Start learning fundamentals for ${name}.`
        : state === 'LEARNING'
          ? `Practice ${name} with a focused task or small project application.`
          : state === 'PRACTICING'
            ? `Apply ${name} in a project milestone for stronger evidence.`
            : state === 'PROJECT_EVIDENCE'
              ? `Optional: add verified credential evidence for ${name} if available.`
              : `${name} has verified evidence on your profile.`,
      label: state === 'NOT_STARTED' ? 'Missing' : state === 'VERIFIED' ? 'Verified' : state.replace(/_/g, ' '),
    }
  })

  const gaps = items.filter((item) => item.state === 'NOT_STARTED' || item.state === 'LEARNING')
  return {
    goalTitle: snapshot.goal?.title || null,
    requiredCount: required.length,
    items,
    gaps,
    summary: required.length
      ? `${gaps.length} skill gap(s) among ${required.length} required skill(s) for this goal.`
      : 'No required skills are recorded on this goal, roadmap stages, or career profile yet.',
    origin: 'DERIVED_FROM_USER_DATA',
  }
}

function buildAdaptiveRecommendations(snapshot, skillGaps) {
  const recommendations = []
  const stages = snapshot.roadmap?.learningStages || []
  const incompleteFoundation = stages.find((stage) =>
    stage.status !== 'completed' && (stage.order === 1 || /fundamental|basics?|intro/i.test(stage.title || '')),
  )
  const advancedOpen = stages.find((stage) =>
    stage.status === 'in-progress' && /advanced|deep|deploy|architect/i.test(stage.title || ''),
  )

  if (incompleteFoundation && advancedOpen) {
    recommendations.push({
      type: 'ADAPTIVE_ROADMAP',
      label: 'AI SUGGESTION',
      title: `Strengthen: ${incompleteFoundation.title}`,
      reason: `An earlier stage (“${incompleteFoundation.title}”) is incomplete while “${advancedOpen.title}” is in progress. Consider reinforcing fundamentals before advancing.`,
      action: { label: 'Open roadmap', url: `/student/roadmap?goalId=${snapshot.goal?._id || ''}` },
      appliesAutomatically: false,
    })
  }

  const topGap = skillGaps.gaps?.[0]
  if (topGap) {
    recommendations.push({
      type: 'SKILL_GAP',
      label: 'AI SUGGESTION',
      title: `Address skill gap: ${topGap.skill}`,
      reason: topGap.recommendedNextStep,
      action: { label: 'Open goals', url: `/student/goals?goalId=${snapshot.goal?._id || ''}` },
      appliesAutomatically: false,
    })
  }

  const stalledTasks = (snapshot.tasks || []).filter((t) => {
    if (t.completed || t.status === 'completed') return false
    if (!t.updatedAt) return false
    return Date.now() - new Date(t.updatedAt).getTime() > 14 * 86400000
  })
  if (stalledTasks[0]) {
    recommendations.push({
      type: 'STALLED_TASK',
      label: 'OBSERVATION',
      title: `Resume: ${stalledTasks[0].title}`,
      reason: 'This learning task has had no recent updates (14+ days). Inactivity alone is not failure — review whether it still fits your goal.',
      action: { label: 'Open task', url: `/student/tasks?taskId=${stalledTasks[0]._id}` },
      appliesAutomatically: false,
    })
  }

  return {
    items: recommendations.slice(0, 5),
    note: 'Recommendations are suggestions only. Roadmaps are never rewritten automatically.',
  }
}

function buildNextBestLearningAction(snapshot, skillGaps, adaptive) {
  const goal = snapshot.goal
  if (!goal) {
    return {
      type: 'SETUP',
      title: 'Create a learning goal',
      study: null,
      why: 'No active goal is available. Learning next-steps are grounded in your goals and roadmap.',
      url: '/student/goals',
      priority: 'high',
      origin: 'SYSTEM',
    }
  }

  const overdue = (snapshot.tasks || []).find((t) =>
    !t.completed && t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date(),
  )
  if (overdue) {
    return {
      type: 'TASK',
      title: overdue.title,
      study: overdue.title,
      why: `This task is overdue and linked to your goal “${goal.title}”.`,
      url: `/student/tasks?taskId=${overdue._id}`,
      priority: 'high',
      origin: 'USER_DATA',
      signals: ['overdue_task', 'goal'],
    }
  }

  const openLearnTask = (snapshot.tasks || []).find((t) =>
    !t.completed && t.status !== 'completed' && (t.type === 'learn' || t.type === 'practice'),
  )
  if (openLearnTask) {
    return {
      type: 'TASK',
      title: openLearnTask.title,
      study: openLearnTask.title,
      why: `Open ${openLearnTask.type} task supporting “${goal.title}”.`,
      url: `/student/tasks?taskId=${openLearnTask._id}`,
      priority: openLearnTask.priority || 'Medium',
      origin: 'USER_DATA',
      signals: ['open_task', 'goal'],
    }
  }

  const topics = extractTopics(snapshot.roadmap)
  const incompleteTopic = topics.find((t) => t.status !== 'completed' && t.status !== 'locked')
  if (incompleteTopic) {
    const gapHint = skillGaps.gaps?.[0]
    return {
      type: 'TOPIC',
      title: incompleteTopic.title,
      study: incompleteTopic.title,
      why: gapHint
        ? `Roadmap topic is incomplete and skill gap analysis highlights “${gapHint.skill}”.`
        : `Next incomplete roadmap topic for “${goal.title}”.`,
      url: `/student/roadmap?goalId=${goal._id}`,
      priority: 'medium',
      origin: 'USER_DATA',
      signals: ['roadmap_topic', gapHint ? 'skill_gap' : null].filter(Boolean),
    }
  }

  if (skillGaps.gaps?.[0]) {
    const gap = skillGaps.gaps[0]
    return {
      type: 'SKILL',
      title: gap.skill,
      study: gap.skill,
      why: gap.recommendedNextStep,
      url: `/student/goals?goalId=${goal._id}`,
      priority: 'medium',
      origin: 'DERIVED_FROM_USER_DATA',
      signals: ['skill_gap'],
    }
  }

  if (snapshot.reading?.[0]?.bookId) {
    const book = snapshot.reading[0]
    return {
      type: 'RESOURCE',
      title: `Continue reading: ${book.bookId.title}`,
      study: book.bookId.title,
      why: `You are ${Math.round(book.percent || 0)}% through this resource.`,
      url: `/library/books/${book.bookId._id}`,
      priority: 'medium',
      origin: 'USER_DATA',
      signals: ['library_progress'],
    }
  }

  if (adaptive.items?.[0]) {
    return {
      type: adaptive.items[0].type,
      title: adaptive.items[0].title,
      study: adaptive.items[0].title,
      why: adaptive.items[0].reason,
      url: adaptive.items[0].action?.url || `/student/goals?goalId=${goal._id}`,
      priority: 'low',
      origin: 'AI_SUGGESTION',
      signals: ['adaptive'],
    }
  }

  return {
    type: 'GOAL',
    title: goal.title,
    study: null,
    why: 'Define milestones, generate a roadmap, or add required skills to unlock concrete next learning actions.',
    url: `/student/goals?goalId=${goal._id}`,
    priority: 'low',
    origin: 'SYSTEM',
    signals: ['setup'],
  }
}

function buildProgressReview(snapshot, skillGaps) {
  const tasks = snapshot.tasks || []
  const completed = tasks.filter((t) => t.completed || t.status === 'completed')
  const inProgress = tasks.filter((t) => t.status === 'in-progress' || (!t.completed && t.status === 'todo'))
  const blocked = (snapshot.goal?.milestones || []).filter((m) => m.status === 'blocked')
  const topics = extractTopics(snapshot.roadmap)
  const needsRevision = topics.filter((t) => /revision|revise|review/i.test(t.title) || t.status === 'needs_revision')

  return {
    completed: {
      tasks: completed.length,
      milestones: (snapshot.goal?.milestones || []).filter((m) => m.status === 'completed').length,
      roadmapStages: (snapshot.roadmap?.learningStages || []).filter((s) => s.status === 'completed').length,
      items: completed.slice(0, 5).map((t) => ({ id: String(t._id), title: t.title })),
    },
    inProgress: {
      tasks: inProgress.filter((t) => !(t.completed || t.status === 'completed')).length,
      topics: topics.filter((t) => t.status === 'in-progress' || t.status === 'available').slice(0, 5),
    },
    blocked: blocked.map((m) => ({ title: m.title, status: m.status })),
    needsRevision: needsRevision.slice(0, 5),
    next: skillGaps.gaps.slice(0, 3).map((g) => g.skill),
    goalProgress: snapshot.goalProgress || null,
    note: 'Progress is based on real tasks, milestones, and roadmap stages — not invented mastery.',
  }
}

function buildRevisionSuggestions(snapshot) {
  const suggestions = []
  const reviseTasks = (snapshot.tasks || []).filter((t) => t.type === 'revise' && !(t.completed || t.status === 'completed'))
  reviseTasks.slice(0, 3).forEach((t) => {
    suggestions.push({
      title: t.title,
      reason: 'You already have an open revise task.',
      caution: false,
      url: `/student/tasks?taskId=${t._id}`,
    })
  })

  const unfinishedTopics = extractTopics(snapshot.roadmap).filter((t) => t.status !== 'completed').slice(0, 2)
  unfinishedTopics.forEach((t) => {
    suggestions.push({
      title: t.title,
      reason: 'Incomplete roadmap topic — consider a short revision pass before advancing.',
      caution: true,
      url: `/student/roadmap?goalId=${snapshot.goal?._id || ''}`,
    })
  })

  return {
    items: suggestions.slice(0, 5),
    note: 'Revision suggestions use cautious language. Inactivity alone is not treated as failure.',
  }
}

async function recommendResources(snapshot, { limit = 8 } = {}) {
  const resources = []

  for (const book of snapshot.goal?.resources?.books || []) {
    resources.push({
      type: book.bookId ? 'book' : 'link',
      title: book.title,
      url: book.bookId ? `/library/books/${book.bookId}` : (book.url || '/student/books'),
      reason: book.reason || 'Linked to your goal resources.',
      origin: 'GOAL_RESOURCE',
    })
  }

  for (const course of snapshot.goal?.resources?.courses || []) {
    resources.push({
      type: 'course',
      title: course.title,
      url: course.url || '/student/intelligence',
      reason: 'Listed on your goal course resources.',
      origin: 'GOAL_RESOURCE',
    })
  }

  for (const lr of snapshot.roadmap?.learningResources || []) {
    resources.push({
      type: lr.type || 'other',
      title: lr.title,
      url: lr.url || '/student/books',
      reason: 'Attached to your roadmap learning resources.',
      origin: 'ROADMAP_RESOURCE',
    })
  }

  const stageBookIds = (snapshot.roadmap?.learningStages || []).flatMap((s) => s.libraryBookIds || [])
  if (stageBookIds.length) {
    const books = await LibraryBook.find({ _id: { $in: stageBookIds }, status: 'active' })
      .select('title difficulty resourceType category')
      .limit(limit)
      .lean()
    books.forEach((b) => {
      resources.push({
        type: b.resourceType || 'book',
        title: b.title,
        url: `/library/books/${b._id}`,
        reason: 'Linked to a roadmap stage in your library.',
        difficulty: b.difficulty,
        origin: 'LIBRARY_LINK',
      })
    })
  }

  // Keyword match against active library for skill gaps — only real catalog hits
  const gapSkills = extractRequiredSkills(snapshot).slice(0, 3)
  if (gapSkills.length && resources.length < limit) {
    const or = gapSkills.flatMap((skill) => [
      { title: new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { tags: new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { subjects: new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ])
    const matches = await LibraryBook.find({ status: 'active', $or: or })
      .select('title difficulty resourceType')
      .limit(limit)
      .lean()
    matches.forEach((b) => {
      resources.push({
        type: b.resourceType || 'book',
        title: b.title,
        url: `/library/books/${b._id}`,
        reason: 'Title/subject overlap with a required skill from your goal or roadmap.',
        difficulty: b.difficulty,
        origin: 'LIBRARY_MATCH',
        claim: 'RELEVANT_MATCH',
      })
    })
  }

  for (const reading of snapshot.reading || []) {
    if (!reading.bookId) continue
    resources.push({
      type: 'book',
      title: reading.bookId.title,
      url: `/library/books/${reading.bookId._id}`,
      reason: `In progress · ${Math.round(reading.percent || 0)}%`,
      origin: 'READING_PROGRESS',
      readingStatus: reading.readingStatus,
    })
  }

  const seen = new Set()
  const deduped = []
  for (const item of resources) {
    const key = `${item.origin}:${item.title}:${item.url}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return {
    items: deduped.slice(0, limit),
    note: deduped.length
      ? 'Resources come from your goal links, roadmap, reading progress, or library title matches. None are claimed as “best”.'
      : 'No linked learning resources found yet. Explore the library or link books to your goal.',
  }
}

function buildProjectLearningNeeds(snapshot) {
  const projects = (snapshot.projects || []).filter((p) => p.status === 'in-progress' || p.status === 'planned')
  const needs = []
  for (const project of projects.slice(0, 5)) {
    const techs = project.technologies || []
    const missing = techs.filter((tech) => {
      const state = classifySkillState({
        name: tech,
        profileSkill: (snapshot.profileSkills || []).find((s) => skillKey(s.name) === skillKey(tech)),
        tasks: snapshot.tasks,
        projects: snapshot.projects,
        roadmap: snapshot.roadmap,
      })
      return state === 'NOT_STARTED' || state === 'LEARNING'
    })
    if (missing.length || techs.length) {
      needs.push({
        projectId: String(project._id),
        projectTitle: project.title,
        technologies: techs,
        learningNeeds: missing.length ? missing : [],
        recommendation: missing[0]
          ? {
            label: 'AI SUGGESTION',
            study: missing[0],
            why: `Project “${project.title}” lists ${missing[0]} and evidence for that skill is still thin.`,
          }
          : techs[0]
            ? {
              label: 'OBSERVATION',
              study: techs[0],
              why: `Continue applying ${techs[0]} on “${project.title}”.`,
            }
            : null,
      })
    }
  }
  return {
    items: needs,
    note: 'Project learning needs use portfolio project technologies — no duplicate project records.',
  }
}

async function buildResearchLearningGaps(userId) {
  try {
    const researchService = require('./researchService')
    if (!researchService.isEnabled?.()) return { items: [], note: 'Research module unavailable.' }
    const projects = await researchService.listProjects(userId, { limit: 3 })
    const items = []
    for (const project of projects.slice(0, 2)) {
      try {
        const researchIntelligenceService = require('./researchIntelligenceService')
        const intel = await researchIntelligenceService.buildIntelligence(userId, project.id)
        for (const gap of (intel.gaps || []).slice(0, 2)) {
          items.push({
            researchId: project.id,
            researchTitle: project.title,
            gap: gap.label || gap.detail || 'Potential research gap',
            label: 'POTENTIAL RESEARCH GAP',
            recommendation: {
              label: 'AI SUGGESTION',
              study: gap.label || null,
              why: `Research “${project.title}” may benefit from studying this area. Roadmap is not auto-modified.`,
            },
          })
        }
      } catch {
        // optional
      }
    }
    return {
      items,
      note: items.length
        ? 'Research → learning links are suggestions only.'
        : 'No research knowledge gaps detected from current projects.',
    }
  } catch {
    return { items: [], note: 'Research learning integration skipped.' }
  }
}

function buildLearningPlanSuggestion(snapshot, skillGaps) {
  const steps = []
  if (snapshot.goal) {
    steps.push({ order: 1, title: `Clarify goal: ${snapshot.goal.title}`, type: 'goal' })
  }
  skillGaps.gaps.slice(0, 4).forEach((gap, index) => {
    steps.push({
      order: steps.length + 1,
      title: `Learn: ${gap.skill}`,
      type: 'skill',
      reason: gap.recommendedNextStep,
    })
  })
  extractTopics(snapshot.roadmap)
    .filter((t) => t.status !== 'completed')
    .slice(0, 3)
    .forEach((topic) => {
      steps.push({
        order: steps.length + 1,
        title: `Topic: ${topic.title}`,
        type: 'topic',
      })
    })
  if (snapshot.goal?.resources?.projects?.[0]) {
    steps.push({
      order: steps.length + 1,
      title: `Apply: ${snapshot.goal.resources.projects[0].title}`,
      type: 'project',
    })
  }

  return {
    label: 'AI SUGGESTION',
    editable: true,
    overwritesRoadmap: false,
    goalId: snapshot.goal?._id ? String(snapshot.goal._id) : null,
    steps: steps.slice(0, 8),
    note: 'This plan is a suggestion. It does not overwrite your existing roadmap.',
  }
}

async function loadLearningSnapshot(userId, { goalId = null } = {}) {
  if (!userId) {
    const err = new Error('Authenticated user required')
    err.statusCode = 401
    err.code = 'AUTH_REQUIRED'
    throw err
  }

  const goalQuery = { userId, status: { $ne: 'archived' } }
  if (goalId) {
    goalQuery._id = goalId
  }

  const [goals, profile, career] = await Promise.all([
    Goal.find(goalQuery).sort('-updatedAt').limit(goalId ? 1 : 20).lean(),
    StudentProfile.findOne({ userId }).select('skills projects').lean(),
    CareerProfile.findOne({ userId }).select('requiredSkills targetCareer targetRoles').lean(),
  ])

  const goal = goalId
    ? goals[0] || null
    : goals.find((g) => g.status === 'active' && !g.completed) || goals[0] || null

  if (goalId && !goal) {
    const err = new Error('Goal not found.')
    err.statusCode = 404
    err.code = 'NOT_FOUND'
    throw err
  }

  const [tasks, roadmap, reading, goalProgress] = await Promise.all([
    goal
      ? Task.find({ userId, goalId: goal._id, status: { $ne: 'archived' } })
        .sort('-updatedAt')
        .limit(80)
        .lean()
      : Task.find({ userId, status: { $ne: 'archived' } }).sort('-updatedAt').limit(40).lean(),
    goal ? Roadmap.findOne({ userId, goalId: goal._id }).lean() : Roadmap.findOne({ userId, status: { $ne: 'archived' } }).sort('-updatedAt').lean(),
    LibraryProgress.find({ userId, readingStatus: { $in: ['saved', 'reading'] } })
      .populate({ path: 'bookId', match: { status: 'active' }, select: 'title difficulty resourceType' })
      .sort('-lastReadAt')
      .limit(5)
      .lean(),
    goal ? progressEngine.computeGoalProgress(goal._id, userId).catch(() => null) : null,
  ])

  return {
    goal,
    goals,
    roadmap,
    tasks,
    reading: reading.filter((r) => r.bookId),
    profileSkills: profile?.skills || [],
    projects: profile?.projects || [],
    career,
    goalProgress,
  }
}

async function getLearningIntelligence(userId, options = {}) {
  const snapshot = await loadLearningSnapshot(userId, options)
  const skillGaps = buildSkillGapAnalysis(snapshot)
  const adaptive = buildAdaptiveRecommendations(snapshot, skillGaps)
  const nextAction = buildNextBestLearningAction(snapshot, skillGaps, adaptive)
  const progressReview = buildProgressReview(snapshot, skillGaps)
  const revision = buildRevisionSuggestions(snapshot)
  const [resources, researchGaps] = await Promise.all([
    recommendResources(snapshot),
    buildResearchLearningGaps(userId),
  ])
  const projectLearning = buildProjectLearningNeeds(snapshot)
  const plan = buildLearningPlanSuggestion(snapshot, skillGaps)
  const topics = extractTopics(snapshot.roadmap)

  return {
    overview: {
      currentGoal: snapshot.goal
        ? {
          id: String(snapshot.goal._id),
          title: snapshot.goal.title,
          status: snapshot.goal.status,
          progress: snapshot.goal.progress || 0,
          difficulty: snapshot.goal.difficulty,
        }
        : null,
      currentSkill: skillGaps.gaps[0]?.skill || skillGaps.items.find((i) => i.state === 'LEARNING')?.skill || null,
      currentTopic: topics.find((t) => t.status === 'in-progress' || (t.status !== 'completed' && t.status !== 'locked'))?.title || null,
      roadmapStatus: snapshot.roadmap?.status || null,
      empty: !snapshot.goal,
    },
    skillGaps,
    nextAction,
    adaptive,
    progressReview,
    revision,
    resources,
    projectLearning,
    researchGaps,
    plan,
    topics: topics.slice(0, 12),
    intents: LEARNING_INTENTS,
    generatedAt: new Date().toISOString(),
  }
}

async function buildLearningContextBlock(userId, { message = '', action = '', goalId = null } = {}) {
  const intent = routeLearningIntent(message, action)
  const intel = await getLearningIntelligence(userId, { goalId })
  const lines = [
    'LEARNING INTELLIGENCE CONTEXT (private, owner-scoped)',
    `Learning intent: ${intent}`,
    intel.overview.currentGoal
      ? `Active goal: ${intel.overview.currentGoal.title} (${intel.overview.currentGoal.progress}%, ${intel.overview.currentGoal.status})`
      : 'Active goal: none',
    intel.overview.currentTopic ? `Current topic: ${intel.overview.currentTopic}` : 'Current topic: none recorded',
    intel.nextAction?.study
      ? `Next best learning action: Study “${intel.nextAction.study}” — ${intel.nextAction.why}`
      : `Next best learning action: ${intel.nextAction?.title || 'n/a'} — ${intel.nextAction?.why || ''}`,
    `Skill gaps: ${intel.skillGaps.gaps.map((g) => g.skill).slice(0, 5).join(', ') || 'none derived'}`,
    intel.adaptive.items[0] ? `Adaptive suggestion: ${intel.adaptive.items[0].title}` : null,
    intel.resources.items[0] ? `Resource candidate: ${intel.resources.items[0].title} (${intel.resources.items[0].origin})` : 'Resources: none linked',
    intel.projectLearning.items[0]?.recommendation
      ? `Project learning need: ${intel.projectLearning.items[0].recommendation.study}`
      : null,
    intel.researchGaps.items[0]
      ? `Research→learning: ${intel.researchGaps.items[0].gap} (${intel.researchGaps.items[0].label})`
      : null,
    'Rules: Do not invent resources, mastery, certificates, or completed learning. Label suggestions as AI SUGGESTION. Missing data must be stated as missing.',
    'Current user request overrides stored learning-style preferences.',
  ].filter(Boolean)

  try {
    const memoryService = require('./memoryService')
    const prefs = await memoryService.getRelevantMemories(userId, {
      message,
      intent: 'STUDY_HELP',
      limit: 3,
      types: ['PREFERENCE', 'LEARNING_CONTEXT', 'WORKFLOW_PREFERENCE'],
    })
    if (prefs.length) {
      lines.splice(lines.length - 2, 0, `Saved learning preferences: ${prefs.map((m) => m.content).join('; ')}`)
    }
  } catch {
    // optional
  }

  return {
    intent,
    text: lines.join('\n'),
    intelligence: {
      nextAction: intel.nextAction,
      skillGaps: intel.skillGaps.gaps.slice(0, 5),
      adaptive: intel.adaptive.items.slice(0, 3),
    },
  }
}

module.exports = {
  LEARNING_INTENTS,
  SKILL_STATES,
  routeLearningIntent,
  extractRequiredSkills,
  extractTopics,
  classifySkillState,
  buildSkillGapAnalysis,
  buildNextBestLearningAction,
  buildAdaptiveRecommendations,
  buildProgressReview,
  buildRevisionSuggestions,
  buildLearningPlanSuggestion,
  buildProjectLearningNeeds,
  recommendResources,
  loadLearningSnapshot,
  getLearningIntelligence,
  buildLearningContextBlock,
  buildResearchLearningGaps,
}
