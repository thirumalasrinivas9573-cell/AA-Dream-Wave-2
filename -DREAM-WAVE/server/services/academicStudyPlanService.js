const syllabusService = require('./syllabusService')
const conceptMasteryService = require('./conceptMasteryService')
const examPrepService = require('./examPrepService')
const academicService = require('./academicService')
const plannerService = require('./plannerService')
const scheduleEngine = require('./scheduleEngine')

async function buildDailyPlan(studentId, { date = scheduleEngine.dateKeyFromDate(), minutes = null } = {}) {
  const profile = await academicService.getOrCreateProfile(studentId)
  const budget = minutes || profile.preferences?.dailyStudyMinutes || 120
  const subjects = await academicService.listSubjects(studentId)
  const revision = await conceptMasteryService.getRevisionQueue(studentId, { limit: 5 })
  const assignments = await academicService.listAssignments(studentId, { limit: 5 })
  const exams = await academicService.listExams(studentId, { upcoming: true, limit: 3 })

  const items = []
  let remaining = budget

  const nextExam = exams.find((e) => new Date(e.scheduledAt) >= new Date())
  if (nextExam && remaining >= 25) {
    const subject = subjects.find((s) => String(s._id) === String(nextExam.subjectId))
    if (subject) {
      const prep = await examPrepService.buildExamPrepPlan(studentId, nextExam, subject, { dailyMinutes: budget })
      const todayPlan = prep.plan.find((p) => p.date === date) || prep.plan[0]
      if (todayPlan) {
        items.push({
          type: 'exam_prep',
          title: `Prepare: ${todayPlan.focus}`,
          minutes: Math.min(remaining, todayPlan.suggestedMinutes || 30),
          reason: `${nextExam.name} in ${prep.countdown.daysRemaining} days`,
          subjectId: String(nextExam.subjectId),
        })
        remaining -= items[items.length - 1].minutes
      }
    }
  }

  for (const rev of revision.slice(0, 2)) {
    if (remaining < 15) break
    items.push({
      type: 'revision',
      title: `Revise ${rev.name}`,
      minutes: Math.min(25, remaining),
      reason: rev.overdue ? 'Revision overdue' : `Concept level: ${rev.level}`,
      conceptId: rev.id,
      subjectId: rev.subjectId,
    })
    remaining -= items[items.length - 1].minutes
  }

  const dueAssignment = assignments.find((a) => a.dueDate && new Date(a.dueDate) >= new Date())
  if (dueAssignment && remaining >= 20) {
    items.push({
      type: 'assignment',
      title: `Work on: ${dueAssignment.title}`,
      minutes: Math.min(30, remaining),
      reason: dueAssignment.dueDate ? `Due ${new Date(dueAssignment.dueDate).toLocaleDateString()}` : 'Pending assignment',
      assignmentId: String(dueAssignment._id),
      subjectId: String(dueAssignment.subjectId),
    })
    remaining -= items[items.length - 1].minutes
  }

  for (const subject of subjects.slice(0, 2)) {
    if (remaining < 15) break
    const remainingTopics = syllabusService.remainingSyllabus(subject)
    const next = remainingTopics[0]
    if (next) {
      items.push({
        type: 'study',
        title: `Study ${next.topicTitle}`,
        minutes: Math.min(25, remaining),
        reason: `Unit: ${next.unitTitle}`,
        subjectId: String(subject._id),
        unitId: String(next.unitId),
        topicId: String(next.topicId),
      })
      remaining -= items[items.length - 1].minutes
    }
  }

  return {
    date,
    totalMinutes: budget,
    allocatedMinutes: budget - remaining,
    items,
    realismNote: items.length ? null : 'No academic items scheduled — add subjects, syllabus, or exams to generate a plan.',
  }
}

async function proposePlannerItems(studentId, planItems, { date = scheduleEngine.dateKeyFromDate() } = {}) {
  return planItems.map((item, index) => ({
    title: item.title,
    itemType: 'study',
    scheduledDate: date,
    startTime: `${9 + index}:00`,
    durationMinutes: item.minutes,
    metadata: {
      academicType: item.type,
      subjectId: item.subjectId,
      conceptId: item.conceptId,
      assignmentId: item.assignmentId,
      source: 'academic_study_plan',
    },
    reason: item.reason,
  }))
}

async function confirmStudyPlan(studentId, { date, items }) {
  if (!Array.isArray(items) || !items.length) {
    throw Object.assign(new Error('No plan items to confirm.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  }
  const created = []
  for (const item of items) {
    const meta = item.metadata ? JSON.stringify(item.metadata).slice(0, 480) : ''
    const doc = await plannerService.createScheduleItem(studentId, {
      title: item.title,
      itemType: item.itemType || 'study',
      scheduledDate: item.scheduledDate || date || scheduleEngine.dateKeyFromDate(),
      startTime: item.startTime,
      durationMinutes: item.durationMinutes || 25,
      notes: item.reason || meta || undefined,
      source: 'system',
    })
    created.push(doc)
  }
  return created
}

module.exports = {
  buildDailyPlan,
  proposePlannerItems,
  confirmStudyPlan,
}
