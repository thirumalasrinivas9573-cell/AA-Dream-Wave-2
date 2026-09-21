const MAX_STAGES = 24
const MAX_MILESTONES = 30
const MAX_TASKS_PER_STAGE = 12

function sanitizeString(value, max = 300) {
  return String(value || '').trim().slice(0, max)
}

function validateLearningStage(stage, index) {
  if (!stage || typeof stage !== 'object') return null
  const title = sanitizeString(stage.title, 160)
  if (!title) return null
  return {
    title,
    description: sanitizeString(stage.description, 1000),
    order: Number.isFinite(Number(stage.order)) ? Number(stage.order) : index + 1,
    status: ['locked', 'available', 'in-progress', 'completed'].includes(stage.status) ? stage.status : 'available',
    progress: Math.min(100, Math.max(0, Math.round(Number(stage.progress) || 0))),
    skills: Array.isArray(stage.skills) ? stage.skills.map((item) => sanitizeString(item, 100)).filter(Boolean).slice(0, 12) : [],
    targetDate: stage.targetDate ? new Date(stage.targetDate) : undefined,
  }
}

function validateNextStep(step) {
  if (!step || typeof step !== 'object') return null
  const title = sanitizeString(step.title || (step.step ? `Step ${step.step}` : ''), 200)
  if (!title) return null
  return {
    title,
    description: sanitizeString(step.description, 1000),
    completed: Boolean(step.completed),
    duration: sanitizeString(step.duration, 80),
  }
}

function validateRoadmapPayload(payload = {}) {
  const errors = []
  const output = {
    currentStage: sanitizeString(payload.currentStage, 120) || 'Foundation',
    overview: sanitizeString(payload.overview, 4000),
    nextSteps: [],
    skills: [],
    milestones: [],
    learningStages: [],
    books: [],
    courses: [],
    projects: [],
    timeline: [],
    tips: [],
  }

  if (Array.isArray(payload.nextSteps)) {
    output.nextSteps = payload.nextSteps.map(validateNextStep).filter(Boolean).slice(0, MAX_STAGES)
  }
  if (Array.isArray(payload.learningStages)) {
    output.learningStages = payload.learningStages
      .map((stage, index) => validateLearningStage(stage, index))
      .filter(Boolean)
      .slice(0, MAX_STAGES)
  }
  if (!output.nextSteps.length && !output.learningStages.length) {
    errors.push('Roadmap must include nextSteps or learningStages.')
  }

  if (Array.isArray(payload.milestones)) {
    output.milestones = payload.milestones
      .map((item) => sanitizeString(typeof item === 'string' ? item : item.title, 160))
      .filter(Boolean)
      .slice(0, MAX_MILESTONES)
  }
  if (Array.isArray(payload.skills)) {
    output.skills = payload.skills.map((item) => sanitizeString(item, 100)).filter(Boolean).slice(0, 20)
  }
  if (Array.isArray(payload.books)) {
    output.books = payload.books.slice(0, 12).map((item) => ({
      title: sanitizeString(item.title || item, 200),
      url: sanitizeString(item.url, 1000),
      author: sanitizeString(item.author, 120),
    })).filter((item) => item.title)
  }
  if (Array.isArray(payload.projects)) {
    output.projects = payload.projects.slice(0, 12).map((item) => ({
      title: sanitizeString(item.title || item, 200),
      description: sanitizeString(item.description, 1000),
    })).filter((item) => item.title)
  }
  if (Array.isArray(payload.timeline)) output.timeline = payload.timeline.slice(0, 24)
  if (Array.isArray(payload.tips)) output.tips = payload.tips.map((item) => sanitizeString(item, 300)).filter(Boolean).slice(0, 12)

  return { valid: errors.length === 0, errors, data: output }
}

function diffRoadmapAdaptation(current = {}, suggested = {}) {
  const currentSteps = (current.nextSteps || current.learningStages || []).map((item) => item.title || item.step)
  const suggestedSteps = (suggested.nextSteps || suggested.learningStages || []).map((item) => item.title || item.step)
  const added = suggestedSteps.filter((item) => !currentSteps.includes(item))
  const removed = currentSteps.filter((item) => !suggestedSteps.includes(item))
  return {
    milestonesAdded: (suggested.milestones || []).filter((item) => !(current.milestones || []).includes(item)),
    milestonesRemoved: (current.milestones || []).filter((item) => !(suggested.milestones || []).includes(item)),
    stagesAdded: added,
    stagesRemoved: removed,
    orderChanged: JSON.stringify(currentSteps) !== JSON.stringify(suggestedSteps),
  }
}

module.exports = {
  validateRoadmapPayload,
  validateLearningStage,
  diffRoadmapAdaptation,
  MAX_STAGES,
}
