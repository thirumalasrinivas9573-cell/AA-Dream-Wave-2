const { robustAiCall } = require('./openaiService')
const { validateRoadmapPayload } = require('./roadmapValidator')

function cleanList(values = [], limit = 8) {
  return [...new Set((values || []).map((item) => String(item || '').trim()).filter(Boolean))].slice(0, limit)
}

function pickSkillNames(context = {}) {
  return cleanList([
    ...(context.confirmedSkills || []),
    ...(context.profileSkills || []),
    ...(context.learningStrengths || []),
  ], 10)
}

function buildFallbackRoadmap(goal = {}, context = {}) {
  const goalTitle = goal.title || 'your goal'
  const skills = pickSkillNames(context)
  const focusAreas = cleanList([...(context.focusAreas || []), ...(context.interests || [])], 6)
  const weeklyHours = Number(goal.weeklyStudyHours || context.weeklyStudyHours || 0)
  const currentLevel = context.currentLevel || goal.difficulty || 'Unspecified'
  const firstSkill = skills[0] || focusAreas[0] || 'core foundations'
  const secondSkill = skills[1] || 'practical application'
  const paceLabel = weeklyHours >= 10 ? 'accelerated' : weeklyHours >= 4 ? 'steady' : 'light'

  return {
    currentStage: `SYSTEM-GENERATED FALLBACK: ${goalTitle} is currently planned at ${currentLevel.toLowerCase()} level with ${paceLabel} study capacity.`,
    overview: `This roadmap was generated without live AI support. It uses confirmed goal data, stored profile signals, and recent learning history where available. Treat skill-gap suggestions and sequencing as system guidance that should be reviewed and refined as you complete work.`,
    nextSteps: [
      { step: 1, title: 'Confirm target outcome', description: `Clarify what success means for ${goalTitle}, including target role, deadline, and expected deliverables. Lock a measurable outcome before expanding the plan.`, duration: '2-3 days' },
      { step: 2, title: `Audit current baseline in ${firstSkill}`, description: `Review your confirmed skills, recent progress, and evidence gaps around ${firstSkill}. Mark what is already proven versus what still needs practice.`, duration: '1 week' },
      { step: 3, title: `Build structured practice around ${secondSkill}`, description: `Create repeatable weekly study blocks, choose one verified learning resource, and pair it with a small hands-on task so progress is visible.`, duration: '2-4 weeks' },
      { step: 4, title: 'Connect learning to projects', description: `Translate the roadmap into portfolio or coursework deliverables tied directly to ${goalTitle}. Preserve completed work instead of restarting unrelated sections.`, duration: '2-4 weeks' },
      { step: 5, title: 'Review, assess, and adapt', description: `At the end of each cycle, update progress, keep completed milestones, and recalculate only the skills or stages that are still blocked.`, duration: 'Ongoing' },
    ],
    skills: skills.length ? skills.map((name, index) => ({
      name,
      level: index < 2 ? 'Intermediate' : 'Beginner',
      priority: index < 3 ? 'High' : 'Medium',
      order: index + 1,
      resources: `Use one verified course, official docs, and one applied task to strengthen ${name}.`,
    })) : [
      { name: 'Goal-specific foundations', level: 'Beginner', priority: 'High', order: 1, resources: 'Start with official documentation or a trusted beginner course.' },
      { name: 'Deliberate practice', level: 'Beginner', priority: 'High', order: 2, resources: 'Use small exercises and one practical project to verify progress.' },
    ],
    courses: focusAreas.map((area, index) => ({
      name: `${area} fundamentals`,
      platform: 'Verified course or official docs',
      cost: 'Varies',
      duration: `${index + 2}-${index + 4} weeks`,
      why: `Supports the roadmap focus area: ${area}.`,
    })),
    timeline: [
      { period: 'Weeks 1-2', focus: 'Scope and baseline', goal: 'Confirm target, current level, and first learning block.' },
      { period: 'Weeks 3-6', focus: firstSkill, goal: `Build reliable understanding and practice in ${firstSkill}.` },
      { period: 'Weeks 7-10', focus: secondSkill, goal: `Convert learning in ${secondSkill} into a project or assessment artifact.` },
      { period: 'Weeks 11-12', focus: 'Review and recalibration', goal: 'Preserve completed progress and adapt remaining steps.' },
    ],
    milestones: [
      { title: 'Baseline documented', timeframe: 'Week 1', description: 'Goal, current level, and resource plan are confirmed.' },
      { title: 'First validated skill block', timeframe: 'Week 6', description: `At least one core skill area, such as ${firstSkill}, is demonstrated through work.` },
      { title: 'Applied outcome shipped', timeframe: 'Week 12', description: 'A project, assessment, or portfolio artifact proves forward progress.' },
    ],
    books: [],
    projects: goal.resources?.projects || [],
    tips: [
      'Confirmed user data should stay separate from AI inference when you update the roadmap.',
      'Do not reset completed stages unless the goal itself has materially changed.',
      'Prefer one verified resource and one applied outcome per skill block.',
    ],
  }
}

function dedupeRoadmapPayload(payload = {}) {
  const dedupeStrings = (items = [], keyFn = (item) => item) => {
    const seen = new Set()
    return items.filter((item) => {
      const key = String(keyFn(item) || '').trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  return {
    ...payload,
    nextSteps: dedupeStrings(payload.nextSteps || [], (item) => item.title || item.step).map((item, index) => ({ ...item, step: index + 1 })),
    milestones: dedupeStrings(payload.milestones || [], (item) => typeof item === 'string' ? item : item.title),
    skills: dedupeStrings(payload.skills || [], (item) => typeof item === 'string' ? item : item.name || item.title),
    courses: dedupeStrings(payload.courses || [], (item) => item.name || item.title),
    books: dedupeStrings(payload.books || [], (item) => item.title || item.name),
    projects: dedupeStrings(payload.projects || [], (item) => item.title || item.name),
    timeline: dedupeStrings(payload.timeline || [], (item) => item.period || item.focus || item.goal),
  }
}

async function generateRoadmap(goalTitle, category, userContext = {}) {
  const systemPrompt = `You build transparent, personalized learning roadmaps.

Rules:
- Use only the supplied goal and user context.
- Distinguish confirmed user data from inference.
- If data is missing, say it is inferred or propose a verification step.
- Respect prerequisites and avoid duplicated skills, topics, milestones, projects, and resources.
- Do not fabricate colleges, exams, salaries, or citations.
- Return only valid JSON.`

  const userPrompt = `Create a roadmap for this goal.

Goal title: ${goalTitle}
Category: ${category}

Confirmed context:
${JSON.stringify(userContext, null, 2)}

Return JSON with:
{
  "currentStage": string,
  "overview": string,
  "nextSteps": [{ "step": number, "title": string, "description": string, "duration": string, "completed": false }],
  "skills": [string],
  "milestones": [string],
  "learningStages": [{ "title": string, "description": string, "order": number, "status": "available", "progress": 0, "skills": [string] }],
  "books": [{ "title": string, "author": string }],
  "courses": [{ "title": string, "url": string }],
  "projects": [{ "title": string, "description": string }],
  "timeline": [{ "period": string, "focus": string, "goal": string }],
  "tips": [string],
  "transparency": {
    "confirmedUserData": [string],
    "databaseSignals": [string],
    "aiInferences": [string],
    "needsUserConfirmation": [string]
  }
}

Requirements:
- nextSteps: 5-8 ordered items
- learningStages: 3-6 ordered items
- keep descriptions concise and specific
- every stage must build on prior prerequisites when relevant`

  const fallback = buildFallbackRoadmap({ title: goalTitle, category }, userContext)
  const result = await robustAiCall([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 'gpt-4o-mini', fallback)

  const deduped = dedupeRoadmapPayload(result)
  const validated = validateRoadmapPayload(deduped)
  if (!validated.valid) {
    console.warn('[aiRoadmapService] AI roadmap failed validation:', validated.errors.join('; '))
    return fallback
  }

  return {
    ...deduped,
    ...validated.data,
    learningStages: validated.data.learningStages.length
      ? validated.data.learningStages
      : validated.data.nextSteps.map((step, index) => ({
        title: step.title,
        description: step.description,
        order: index + 1,
        status: index === 0 ? 'available' : 'locked',
        progress: 0,
        skills: [],
      })),
  }
}

module.exports = {
  generateRoadmap,
  FALLBACK_ROADMAP: buildFallbackRoadmap({ title: 'your goal' }, {}),
  buildFallbackRoadmap,
}
