const syllabusService = require('./syllabusService')
const conceptMasteryService = require('./conceptMasteryService')
const academicService = require('./academicService')

function examCountdown(scheduledAt) {
  const target = new Date(scheduledAt).getTime()
  const now = Date.now()
  const ms = target - now
  if (Number.isNaN(target)) return null
  return {
    scheduledAt,
    msRemaining: Math.max(0, ms),
    daysRemaining: Math.max(0, Math.ceil(ms / 86400000)),
    hoursRemaining: Math.max(0, Math.ceil(ms / 3600000)),
    past: ms < 0,
  }
}

function coveredTopics(subject, exam) {
  const allTopics = (subject.units || []).flatMap((unit) =>
    (unit.topics || []).map((topic) => ({ ...topic.toObject?.() || topic, unitId: unit._id, unitTitle: unit.title })),
  )
  if (!exam.coveredTopicIds?.length && !exam.coveredUnitIds?.length) return allTopics
  if (exam.coveredTopicIds?.length) {
    const ids = new Set(exam.coveredTopicIds.map(String))
    return allTopics.filter((t) => ids.has(String(t._id)))
  }
  const unitIds = new Set(exam.coveredUnitIds.map(String))
  return allTopics.filter((t) => unitIds.has(String(t.unitId)))
}

async function buildExamPrepPlan(studentId, exam, subject, { dailyMinutes = 120 } = {}) {
  const countdown = examCountdown(exam.scheduledAt)
  if (!countdown || countdown.past) {
    return { countdown, plan: [], readiness: { message: 'Exam date has passed or is invalid.' } }
  }

  const topics = coveredTopics(subject, exam)
  const weakConcepts = await conceptMasteryService.getWeakConcepts(studentId, { subjectId: subject._id, limit: 20 })
  const weakTopicTitles = new Set(weakConcepts.map((c) => c.name.toLowerCase()))

  const prioritized = [...topics].sort((a, b) => {
    const aWeak = weakTopicTitles.has(a.title.toLowerCase()) || a.status === 'NEEDS_REVISION' ? 1 : 0
    const bWeak = weakTopicTitles.has(b.title.toLowerCase()) || b.status === 'NEEDS_REVISION' ? 1 : 0
    if (aWeak !== bWeak) return bWeak - aWeak
    const order = { NOT_STARTED: 2, LEARNING: 1, PRACTICING: 1, NEEDS_REVISION: 3, COMPLETED: 0 }
    return (order[b.status] || 0) - (order[a.status] || 0)
  })

  const days = Math.max(1, countdown.daysRemaining)
  const topicsPerDay = Math.max(1, Math.ceil(prioritized.length / days))
  const plan = []
  for (let d = 0; d < days; d += 1) {
    const dayTopics = prioritized.slice(d * topicsPerDay, (d + 1) * topicsPerDay)
    if (!dayTopics.length) break
    const date = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
    plan.push({
      day: d + 1,
      date,
      focus: dayTopics.map((t) => t.title).join(' + '),
      topics: dayTopics.map((t) => ({ unitTitle: t.unitTitle, topicTitle: t.title, status: t.status })),
      suggestedMinutes: Math.min(dailyMinutes, dayTopics.length * 30),
      actions: dayTopics.flatMap((t) => [
        `Study ${t.title}`,
        t.status === 'NEEDS_REVISION' ? `Revise ${t.title}` : null,
      ].filter(Boolean)),
    })
  }

  if (days >= 1) {
    plan.push({
      day: days,
      date: new Date(exam.scheduledAt).toISOString().slice(0, 10),
      focus: 'Revision + Practice',
      topics: [],
      suggestedMinutes: Math.min(dailyMinutes, 90),
      actions: ['Review weak concepts', 'Practice previous paper questions', 'Quick formula recall'],
    })
  }

  const progress = syllabusService.computeSyllabusProgress(subject)
  const readiness = {
    syllabusCoverage: progress,
    weakConceptCount: weakConcepts.length,
    topicsRemaining: syllabusService.remainingSyllabus(subject).length,
    indicators: [
      progress.completed > 0 ? `${progress.completed}/${progress.total} syllabus topics completed` : 'Syllabus progress not yet tracked',
      weakConcepts.length ? `${weakConcepts.length} concepts need attention` : 'No weak concepts flagged yet',
      countdown.daysRemaining <= 2 ? 'Exam is very soon — prioritize revision' : `${countdown.daysRemaining} days remaining`,
    ],
    disclaimer: 'Preparation indicators are based on your syllabus and practice — not official grades or guaranteed predictions.',
  }

  return { countdown, plan, readiness }
}

async function getExamDetail(studentId, examId) {
  const AcademicExam = require('../models/AcademicExam')
  const exam = await AcademicExam.findOne({ _id: examId, studentId })
  if (!exam) throw Object.assign(new Error('Exam not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  const subject = await academicService.getOwnedSubject(studentId, exam.subjectId)
  const profile = await academicService.getOrCreateProfile(studentId)
  const dailyMinutes = profile.preferences?.dailyStudyMinutes || 120
  const prep = await buildExamPrepPlan(studentId, exam, subject, { dailyMinutes })
  return { exam: exam.toObject(), subject: { id: String(subject._id), name: subject.name }, ...prep }
}

module.exports = {
  examCountdown,
  coveredTopics,
  buildExamPrepPlan,
  getExamDetail,
}
