const mentorContextEngine = require('./mentorContextEngine')
const knowledgeGraphService = require('./knowledgeGraphService')

const INTENTS = [
  'GENERAL_MENTOR', 'GOAL_HELP', 'ROADMAP_HELP', 'STUDY_HELP', 'TASK_HELP', 'PLANNER_HELP',
  'LIBRARY_HELP', 'CAREER_HELP', 'PROJECT_HELP', 'PROFILE_HELP', 'SEARCH_HELP', 'ACADEMIC_HELP',
  'RESEARCH_HELP', 'PROGRESS_REVIEW', 'MEMORY_SEARCH', 'MEMORY_REVIEW', 'FORGET_MEMORY', 'REMEMBER_EXPLICIT',
]

const INTENT_KEYWORDS = {
  MEMORY_SEARCH: /\bwhat do you remember about (my )?(career|learning|projects?|preferences?)\b/i,
  MEMORY_REVIEW: /\b(what do you remember( about me)?|what (have you|do you) (saved|remember)|memory review|show (my )?memories)\b/i,
  FORGET_MEMORY: /\b(forget (that|this|it)|don'?t remember|remove (that )?memory|delete (that )?memory)\b/i,
  REMEMBER_EXPLICIT: /\b(remember (that|this|i)|please remember|save (this|that) (as )?(a )?memory|keep in mind that|remember my goal)\b/i,
  GOAL_HELP: /\b(goal|objective|milestone)\b/i,
  ROADMAP_HELP: /\b(roadmap|stage|learning path|next step)\b/i,
  STUDY_HELP: /\b(study|learn|practice|topic|concept|what should i learn|skill gap|learning plan)\b/i,
  ACADEMIC_HELP: /\b(syllabus|semester|subject|exam|assignment|unit|revise|revision|midterm|internal)\b/i,
  TASK_HELP: /\b(task|todo|deadline|due|complete)\b/i,
  PLANNER_HELP: /\b(planner|schedule|plan my day|focus|today'?s plan|what should i (do|work on) (today|now)|today'?s priority|falling behind|what am i missing)\b/i,
  PROGRESS_REVIEW: /\b(progress review|how am i doing|review my progress|weekly review|learning progress)\b/i,
  LIBRARY_HELP: /\b(book|read|library|resource|continue reading)\b/i,
  CAREER_HELP: /\b(career|job|internship|interview|apply|role|resume)\b/i,
  PROJECT_HELP: /\b(project|portfolio|build|github)\b/i,
  PROFILE_HELP: /\b(profile|credential|certificate)\b/i,
  SEARCH_HELP: /\b(search|find|discover|look for)\b/i,
  RESEARCH_HELP: /\b(research|source|citation|synthesize|hypothesis|literature review|evidence)\b/i,
}

const LAYER_SOURCES = {
  identity: ['profile'],
  goal: ['goals', 'tasks', 'roadmaps'],
  learning: ['library', 'roadmaps', 'skills', 'academics', 'research'],
  career: ['career', 'skills'],
  activity: ['tasks', 'planner'],
  temporal: ['planner', 'tasks'],
  conversation: [],
  academic: ['academics'],
  research: ['research', 'library'],
  memory: ['memory'],
}

const INTENT_LAYERS = {
  GENERAL_MENTOR: ['identity', 'goal', 'activity', 'temporal', 'memory'],
  GOAL_HELP: ['identity', 'goal', 'learning', 'memory'],
  ROADMAP_HELP: ['goal', 'learning', 'memory'],
  STUDY_HELP: ['learning', 'goal', 'temporal', 'academic', 'memory'],
  ACADEMIC_HELP: ['academic', 'learning', 'temporal'],
  RESEARCH_HELP: ['research', 'learning', 'goal', 'memory'],
  TASK_HELP: ['activity', 'goal', 'temporal', 'memory'],
  PLANNER_HELP: ['temporal', 'activity', 'goal', 'memory'],
  PROGRESS_REVIEW: ['goal', 'activity', 'learning', 'temporal', 'memory'],
  LIBRARY_HELP: ['learning', 'goal'],
  CAREER_HELP: ['career', 'goal', 'learning', 'memory'],
  PROJECT_HELP: ['goal', 'learning', 'career', 'memory'],
  PROFILE_HELP: ['identity', 'memory'],
  SEARCH_HELP: ['goal', 'learning', 'career'],
  MEMORY_SEARCH: ['memory', 'identity'],
  MEMORY_REVIEW: ['memory', 'identity'],
  FORGET_MEMORY: ['memory'],
  REMEMBER_EXPLICIT: ['memory'],
}

const DEFAULT_BUDGET = 4200

const MENTOR_MODE_INTENT = {
  goal: 'GOAL_HELP',
  study: 'STUDY_HELP',
  learning: 'STUDY_HELP',
  career: 'CAREER_HELP',
  project: 'PROJECT_HELP',
  research: 'RESEARCH_HELP',
}

function routeIntent(message = '', { mentorMode = 'general', action = '', forcedIntent = '' } = {}) {
  if (forcedIntent && (INTENTS.includes(forcedIntent) || INTENT_LAYERS[forcedIntent])) {
    return forcedIntent
  }
  if (action === 'plan-day') return 'PLANNER_HELP'
  if (action === 'review-progress') return 'PROGRESS_REVIEW'
  if (action === 'help-goal') return 'GOAL_HELP'
  if (action === 'help-career') return 'CAREER_HELP'
  if (action === 'recommend-books') return 'LIBRARY_HELP'
  if (action === 'recommend-next' || action === 'learning-next' || action === 'skill-gap' || action === 'learning-plan') {
    return 'STUDY_HELP'
  }
  if (action === 'next-action' || action === 'gap-review' || action === 'progress-risk' || action === 'urgent-tasks' || action === 'deadlines') {
    return 'PLANNER_HELP'
  }
  // Keyword match before mentorMode so natural language wins over sticky UI mode
  for (const [intent, pattern] of Object.entries(INTENT_KEYWORDS)) {
    if (pattern.test(message)) return intent
  }
  if (MENTOR_MODE_INTENT[mentorMode]) return MENTOR_MODE_INTENT[mentorMode]
  return 'GENERAL_MENTOR'
}

function layersForIntent(intent) {
  return INTENT_LAYERS[intent] || INTENT_LAYERS.GENERAL_MENTOR
}

function sourcesForLayers(layers) {
  const sources = new Set()
  for (const layer of layers) {
    for (const source of LAYER_SOURCES[layer] || []) sources.add(source)
  }
  return [...sources]
}

async function buildStudentContext(userId, options = {}) {
  const {
    message = '',
    mentorMode = 'general',
    action = '',
    budget = DEFAULT_BUDGET,
    includeGraph = true,
    forcedIntent = '',
  } = options

  const intent = routeIntent(message, { mentorMode, action, forcedIntent })
  const layers = layersForIntent(intent)
  const sources = sourcesForLayers(layers)

  const mentorSources = mentorContextEngine.resolveSources
    ? mentorContextEngine.resolveSources(message, mentorMode, action)
    : sources

  // Intent-selected sources win for efficiency; keep profile when identity layer is active.
  const filteredSources = [...new Set([
    ...sources,
    ...(layers.includes('identity') ? ['profile'] : []),
    // Allow keyword-detected mentor sources that overlap intent layers
    ...mentorSources.filter((source) => sources.includes(source) || source === 'profile'),
  ])]

  const mentorContext = await mentorContextEngine.buildMentorContext(userId, {
    message,
    mentorMode,
    action,
    sourcesOverride: filteredSources.length ? filteredSources : sources,
    priorityMode: intent === 'GENERAL_MENTOR' ? 'minimal' : 'standard',
  })

  let graphSummary = null
  let relationshipLines = []
  if (includeGraph && knowledgeGraphService.isEnabled()) {
    await knowledgeGraphService.syncFromCanonical(userId).catch(() => null)
    graphSummary = await knowledgeGraphService.getGraphSummary(userId).catch(() => null)
    const activeGoal = mentorContext.loaded?.goals?.find((g) => g.status === 'active') || mentorContext.loaded?.goals?.[0]
    if (activeGoal) {
      const related = await knowledgeGraphService.getRelatedContext(userId, {
        entityType: 'goal', entityId: activeGoal._id, limit: 6,
      }).catch(() => [])
      relationshipLines = related.map((r) => `- ${r.relation}: ${r.to}${r.label ? ` (${r.label})` : ''}`)
    }
  }

  let text = mentorContext.contextText || ''
  if (layers.includes('learning') || intent === 'STUDY_HELP' || intent === 'ROADMAP_HELP' || intent === 'PROGRESS_REVIEW') {
    try {
      const learningIntelligenceService = require('./learningIntelligenceService')
      const block = await learningIntelligenceService.buildLearningContextBlock(userId, {
        message,
        action,
      })
      text = `${text}\n\n${block.text}`
      mentorContext.loaded = mentorContext.loaded || {}
      mentorContext.loaded.learningIntelligence = {
        intent: block.intent,
        nextAction: block.intelligence.nextAction,
        skillGaps: block.intelligence.skillGaps,
        adaptive: block.intelligence.adaptive,
      }
    } catch {
      // Learning intelligence enrichment is optional
    }
  }
  if (layers.includes('temporal') || layers.includes('activity') || intent === 'PLANNER_HELP' || intent === 'PROGRESS_REVIEW') {
    try {
      const personalDailyIntelligenceService = require('./personalDailyIntelligenceService')
      const block = await personalDailyIntelligenceService.buildPersonalContextBlock(userId, {
        message,
        action,
      })
      text = `${text}\n\n${block.text}`
      mentorContext.loaded = mentorContext.loaded || {}
      mentorContext.loaded.dailyLife = {
        intent: block.intent,
        nextAction: block.intelligence.nextAction,
        critical: block.intelligence.critical,
        risks: block.intelligence.risks,
      }
    } catch {
      // Daily life enrichment is optional
    }
  }
  if (layers.includes('academic') || intent === 'ACADEMIC_HELP' || intent === 'STUDY_HELP') {
    try {
      const academicService = require('./academicService')
      const conceptMasteryService = require('./conceptMasteryService')
      if (academicService.isEnabled()) {
        const overview = await academicService.getOverview(userId)
        const revision = await conceptMasteryService.getRevisionQueue(userId, { limit: 5 })
        const academicLines = []
        if (overview.profile?.program) academicLines.push(`Program: ${overview.profile.program}${overview.profile.branch ? ` (${overview.profile.branch})` : ''}`)
        if (overview.subjects?.length) academicLines.push(`Active subjects: ${overview.subjects.map((s) => s.name).join(', ')}`)
        if (overview.upcomingExam) academicLines.push(`Next exam: ${overview.upcomingExam.name} in ${overview.upcomingExam.daysRemaining} day(s)`)
        if (overview.dueAssignment) academicLines.push(`Assignment due: ${overview.dueAssignment.title}`)
        if (revision.length) academicLines.push(`Revision queue: ${revision.map((r) => r.name).join(', ')}`)
        if (academicLines.length) {
          text = `${text}\n\nACADEMIC CONTEXT (private, student-provided)\n${academicLines.join('\n')}`
          mentorContext.loaded = mentorContext.loaded || {}
          mentorContext.loaded.academics = {
            program: overview.profile?.program,
            subjects: overview.subjects,
            upcomingExam: overview.upcomingExam,
          }
        }
      }
    } catch {
      // Academic context failure must not break mentor
    }
  }
  if (layers.includes('research') || intent === 'RESEARCH_HELP') {
    try {
      const researchService = require('./researchService')
      if (researchService.isEnabled()) {
        const overview = await researchService.getOverview(userId)
        const projects = await researchService.listProjects(userId, { limit: 5 })
        const lines = []
        if (overview.active) lines.push(`Active research projects: ${overview.active}`)
        projects.slice(0, 3).forEach((p) => {
          lines.push(`- ${p.title}${p.question ? `: ${p.question}` : ''} (${p.status}, ${p.counts?.sources || 0} sources)`)
        })
        // Enrich with intelligence for the most recent project when research-focused
        if (projects[0]?.id) {
          try {
            const researchIntelligenceService = require('./researchIntelligenceService')
            const block = await researchIntelligenceService.buildResearchContextBlock(userId, projects[0].id, {
              message,
              action,
            })
            lines.push(block.text)
            mentorContext.loaded = mentorContext.loaded || {}
            mentorContext.loaded.researchIntelligence = {
              intent: block.intent,
              projectId: projects[0].id,
              gaps: block.intelligence.gaps?.slice(0, 3),
              nextActions: block.intelligence.nextActions,
            }
          } catch {
            // Intelligence enrichment is optional
          }
        }
        if (lines.length) {
          text = `${text}\n\nRESEARCH CONTEXT (private)\n${lines.join('\n')}`
          mentorContext.loaded = mentorContext.loaded || {}
          mentorContext.loaded.research = { overview, projects: projects.slice(0, 3) }
        }
      }
    } catch {
      // Research context failure must not break mentor
    }
  }
  // Long-term memory (Prompt 10 / V4 P7) — budgeted, ranked, never full dump
  let memoryTransparency = null
  let memoryIndicator = null
  if (layers.includes('memory') || intent === 'MEMORY_REVIEW' || intent === 'MEMORY_SEARCH' || intent === 'REMEMBER_EXPLICIT' || intent === 'FORGET_MEMORY') {
    try {
      const memoryService = require('./memoryService')
      if (intent === 'MEMORY_REVIEW' || intent === 'MEMORY_SEARCH' || intent === 'REMEMBER_EXPLICIT' || intent === 'FORGET_MEMORY') {
        const handled = await memoryService.handleMemoryUtterance(userId, message)
        mentorContext.loaded = mentorContext.loaded || {}
        mentorContext.loaded.memoryAction = handled
        if (handled?.intent === 'MEMORY_REVIEW' || handled?.intent === 'MEMORY_SEARCH') {
          text = `${text}\n\nMEMORY REVIEW (only cite these)\n${handled.summary}`
        } else if (handled?.intent === 'REMEMBER_EXPLICIT' && handled.memory) {
          text = `${text}\n\nMEMORY SAVED\nStored: ${handled.memory.content} (${handled.memory.type})`
        } else if (handled?.intent === 'REMEMBER_EXPLICIT' && handled.pendingConfirmation) {
          text = `${text}\n\nMEMORY CONFIRMATION\n${handled.prompt}`
        } else if (handled?.intent === 'FORGET_MEMORY') {
          if (handled.pendingConfirmation) {
            text = `${text}\n\nFORGET CONFIRMATION REQUIRED\n${handled.prompt}\nMatches: ${(handled.matches || []).map((m) => m.content).join('; ')}`
          } else if (handled.deleted) {
            text = `${text}\n\nMEMORY FORGOTTEN\nRemoved saved memory as requested.`
          } else if (handled.message) {
            text = `${text}\n\nMEMORY\n${handled.message}`
          }
        }
      } else {
        const [block, adaptive] = await Promise.all([
          memoryService.buildMemoryContextBlock(userId, {
            message,
            intent,
            budget: Math.min(900, Math.floor(budget * 0.22)),
          }),
          memoryService.buildAdaptiveMentorProfile(userId).catch(() => null),
        ])
        if (block.text) {
          text = `${text}\n\n${block.text}`
          memoryTransparency = block.transparency
          memoryIndicator = block.indicator
          mentorContext.loaded = mentorContext.loaded || {}
          mentorContext.loaded.memories = block.memories
          mentorContext.loaded.memoryTransparency = block.transparency
          mentorContext.loaded.memoryIndicator = block.indicator
        }
        if (adaptive?.enabled) {
          const adaptLines = []
          if (adaptive.styleHints?.length) adaptLines.push(`Communication preferences: ${adaptive.styleHints.join('; ')}`)
          if (adaptive.career?.length) adaptLines.push(`Career context (memory): ${adaptive.career.join('; ')}`)
          if (adaptive.learning?.length) adaptLines.push(`Learning preferences (memory): ${adaptive.learning.join('; ')}`)
          if (adaptLines.length) {
            text = `${text}\n\nADAPTIVE MENTOR HINTS (DATA only — current request wins)\n${adaptLines.join('\n')}\n${adaptive.note}`
          }
          mentorContext.loaded = mentorContext.loaded || {}
          mentorContext.loaded.adaptiveMentor = adaptive
        }
      }
    } catch {
      // Memory enrichment is optional
    }
  }
  if (relationshipLines.length) {
    text = `${text}\n\nRELATIONSHIPS\n${relationshipLines.join('\n')}`
  }
  const trimmed = text.length > budget ? `${text.slice(0, budget)}…` : text

  return {
    intent,
    layers,
    provenance: filteredSources.map((source) => ({
      source,
      layer: Object.entries(LAYER_SOURCES).find(([, vals]) => vals.includes(source))?.[0] || 'general',
    })),
    budget,
    budgetUsed: trimmed.length,
    text: trimmed,
    graph: graphSummary,
    loaded: mentorContext.loaded || {},
    dataConfidence: mentorContext.dataConfidence,
    memoryTransparency,
    memoryIndicator,
    generatedAt: new Date().toISOString(),
  }
}

async function buildContextSummary(userId) {
  const intent = 'GENERAL_MENTOR'
  const layers = layersForIntent(intent)
  const context = await buildStudentContext(userId, { intent, budget: 2400, includeGraph: true })
  return {
    intent: context.intent,
    layers: context.layers,
    graph: context.graph,
    preview: context.text.slice(0, 600),
    generatedAt: context.generatedAt,
  }
}

module.exports = {
  INTENTS,
  routeIntent,
  buildStudentContext,
  buildContextSummary,
  layersForIntent,
}
