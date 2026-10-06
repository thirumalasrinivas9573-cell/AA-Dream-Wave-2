/**
 * Shared normalizer for goal and context payloads.
 * Sanitizes, validates, truncates attributes, and hardens against prompt injection.
 */

function sanitizeText(value, maxLength = 1000) {
  if (value === null || value === undefined) return ''
  // Strip any sequence of 3 or more '=' to prevent prompt delimiter breakout / injection
  const sanitized = String(value).replace(/={3,}/g, '').trim()
  return sanitized.slice(0, maxLength)
}

function normalizeGoal(goalOrTitle, context = {}) {
  let rawTitle = ''
  let rawCategory = 'General'
  let rawDescription = ''
  let rawDifficulty = 'Beginner'
  let rawWeeklyHours = 0
  let rawDeadline = null

  if (typeof goalOrTitle === 'object' && goalOrTitle !== null) {
    rawTitle = goalOrTitle.title || ''
    rawCategory = goalOrTitle.category || 'General'
    rawDescription = goalOrTitle.description || context?.goalDescription || context?.description || ''
    rawDifficulty = goalOrTitle.difficulty || goalOrTitle.level || context?.currentLevel || context?.difficulty || 'Beginner'
    rawWeeklyHours = goalOrTitle.weeklyStudyHours || goalOrTitle.weeklyHours || context?.weeklyStudyHours || 0
    rawDeadline = goalOrTitle.deadline || context?.deadline || null
  } else if (typeof goalOrTitle === 'string') {
    rawTitle = goalOrTitle
    rawCategory = typeof context === 'string' ? context : (context?.category || 'General')
    rawDescription = context?.goalDescription || context?.description || ''
    rawDifficulty = context?.currentLevel || context?.difficulty || 'Beginner'
    rawWeeklyHours = context?.weeklyStudyHours || 0
    rawDeadline = context?.deadline || null
  }

  // Guard deadline: if missing or not a valid date, use "Flexible"
  let formattedDeadline = 'Flexible'
  if (rawDeadline) {
    try {
      const d = new Date(rawDeadline)
      if (!isNaN(d.getTime())) {
        formattedDeadline = d.toISOString().split('T')[0]
      }
    } catch {
      formattedDeadline = 'Flexible'
    }
  }

  // Sensible max lengths to prevent prompt injection or token bloat
  const MAX_TITLE_LENGTH = 150
  const MAX_DESC_LENGTH = 1000
  const MAX_CATEGORY_LENGTH = 80

  const title = sanitizeText(rawTitle || 'Learning Goal', MAX_TITLE_LENGTH) || 'Learning Goal'
  const category = sanitizeText(rawCategory || 'General', MAX_CATEGORY_LENGTH) || 'General'
  const description = sanitizeText(rawDescription || '', MAX_DESC_LENGTH)
  const difficulty = sanitizeText(rawDifficulty || 'Beginner', 40) || 'Beginner'
  const weeklyStudyHours = Math.max(0, Math.min(168, Number(rawWeeklyHours) || 0))

  return {
    title,
    category,
    description,
    difficulty,
    weeklyStudyHours,
    deadline: formattedDeadline,
  }
}

function normalizeContext(rawContext = {}) {
  const education = sanitizeText(rawContext?.education || '', 150)
  const currentRole = sanitizeText(rawContext?.currentRole || '', 150)
  const targetRole = sanitizeText(rawContext?.targetRole || '', 150)
  const learningStyle = sanitizeText(rawContext?.learningStyle || '', 100)

  const rawSkills = Array.isArray(rawContext?.profileSkills)
    ? rawContext.profileSkills
    : Array.isArray(rawContext?.confirmedSkills)
      ? rawContext.confirmedSkills
      : Array.isArray(rawContext?.skills)
        ? rawContext.skills
        : []

  const baselineSkills = rawSkills
    .map((s) => (typeof s === 'string' ? sanitizeText(s, 50) : sanitizeText(s?.name || s?.title || '', 50)))
    .filter(Boolean)
    .slice(0, 20)

  return {
    education: education || 'Not specified',
    currentRole: currentRole || 'Student',
    targetRole: targetRole || '',
    baselineSkills,
    learningStyle: learningStyle || 'practical',
  }
}

module.exports = {
  sanitizeText,
  normalizeGoal,
  normalizeContext,
}
