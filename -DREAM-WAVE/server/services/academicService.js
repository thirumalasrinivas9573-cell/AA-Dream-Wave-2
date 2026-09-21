const crypto = require('crypto')
const mongoose = require('mongoose')
const AcademicProfile = require('../models/AcademicProfile')
const AcademicSubject = require('../models/AcademicSubject')
const AcademicNote = require('../models/AcademicNote')
const AcademicAssignment = require('../models/AcademicAssignment')
const AcademicExam = require('../models/AcademicExam')
const Task = require('../models/Task')
const knowledgeGraphService = require('./knowledgeGraphService')

function isEnabled() {
  return process.env.ACADEMIC_V3_ENABLED !== 'false'
}

function validId(value) {
  return mongoose.isValidObjectId(value)
}

async function getOwnedSubject(studentId, subjectId) {
  if (!validId(subjectId)) {
    throw Object.assign(new Error('Invalid subject ID.'), { statusCode: 400, code: 'INVALID_ID' })
  }
  const subject = await AcademicSubject.findOne({ _id: subjectId, studentId })
  if (!subject) throw Object.assign(new Error('Subject not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  return subject
}

async function getOrCreateProfile(studentId) {
  let profile = await AcademicProfile.findOne({ studentId })
  if (!profile) {
    profile = await AcademicProfile.create({ studentId, periods: [] })
  }
  return profile
}

async function getActivePeriod(profile) {
  return profile.periods.find((p) => p.isActive) || profile.periods[profile.periods.length - 1] || null
}

async function syncSubjectGraph(studentId, subject) {
  if (!knowledgeGraphService.isEnabled()) return
  await knowledgeGraphService.upsertEdge(studentId, {
    sourceType: 'student',
    sourceId: String(studentId),
    targetType: 'subject',
    targetId: String(subject._id),
    relationType: 'STUDIES_SUBJECT',
    origin: 'EXPLICIT',
    label: subject.name,
  }).catch(() => null)
  for (const unit of subject.units || []) {
    await knowledgeGraphService.upsertEdge(studentId, {
      sourceType: 'subject',
      sourceId: String(subject._id),
      targetType: 'unit',
      targetId: String(unit._id),
      relationType: 'SUBJECT_HAS_UNIT',
      origin: 'SYSTEM_DERIVED',
      label: unit.title,
    }).catch(() => null)
    for (const topic of unit.topics || []) {
      await knowledgeGraphService.upsertEdge(studentId, {
        sourceType: 'unit',
        sourceId: String(unit._id),
        targetType: 'topic',
        targetId: String(topic._id),
        relationType: 'UNIT_HAS_TOPIC',
        origin: 'SYSTEM_DERIVED',
        label: topic.title,
      }).catch(() => null)
    }
  }
}

async function getOverview(studentId) {
  const [profile, subjects, assignments, exams, noteCount] = await Promise.all([
    getOrCreateProfile(studentId),
    AcademicSubject.find({ studentId, status: 'active' }).sort('-updatedAt').limit(20).lean(),
    AcademicAssignment.find({ studentId, status: { $nin: ['completed', 'archived'] } }).sort('dueDate').limit(10).lean(),
    AcademicExam.find({ studentId, scheduledAt: { $gte: new Date(Date.now() - 86400000) } }).sort('scheduledAt').limit(5).lean(),
    AcademicNote.countDocuments({ studentId }),
  ])

  const activePeriod = await getActivePeriod(profile)
  const now = Date.now()
  const upcomingExam = exams.find((e) => new Date(e.scheduledAt).getTime() >= now) || null
  const dueAssignment = assignments.find((a) => a.dueDate && new Date(a.dueDate).getTime() >= now) || assignments[0] || null

  return {
    enabled: isEnabled(),
    profile: {
      program: profile.program,
      branch: profile.branch,
      academicSystem: profile.academicSystem,
      currentYear: profile.currentYear,
      preferences: profile.preferences,
      activePeriod,
      periodCount: profile.periods.length,
    },
    stats: {
      subjectCount: subjects.length,
      noteCount,
      assignmentCount: assignments.length,
      examCount: exams.length,
    },
    subjects: subjects.map((s) => ({
      id: String(s._id),
      name: s.name,
      code: s.code,
      unitCount: (s.units || []).length,
      topicCount: (s.units || []).reduce((sum, u) => sum + (u.topics || []).length, 0),
      updatedAt: s.updatedAt,
    })),
    upcomingExam: upcomingExam ? {
      id: String(upcomingExam._id),
      name: upcomingExam.name,
      subjectId: String(upcomingExam.subjectId),
      scheduledAt: upcomingExam.scheduledAt,
      daysRemaining: Math.max(0, Math.ceil((new Date(upcomingExam.scheduledAt).getTime() - now) / 86400000)),
    } : null,
    dueAssignment: dueAssignment ? {
      id: String(dueAssignment._id),
      title: dueAssignment.title,
      subjectId: String(dueAssignment.subjectId),
      dueDate: dueAssignment.dueDate,
    } : null,
    setupRequired: !activePeriod || !subjects.length,
  }
}

async function updateProfile(studentId, body) {
  const allowed = ['program', 'branch', 'academicSystem', 'currentYear', 'preferences']
  const update = {}
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }
  return AcademicProfile.findOneAndUpdate(
    { studentId },
    { $set: update },
    { upsert: true, new: true, runValidators: true },
  )
}

async function addPeriod(studentId, body) {
  const profile = await getOrCreateProfile(studentId)
  if (body.setActive) {
    profile.periods.forEach((p) => { p.isActive = false })
  }
  profile.periods.push({
    label: String(body.label || '').trim() || undefined,
    system: body.system || profile.academicSystem || 'semester',
    year: body.year,
    semester: body.semester,
    term: body.term,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
    isActive: body.setActive !== false,
  })
  await profile.save()
  return profile
}

async function listSubjects(studentId, { status = 'active', limit = 50 } = {}) {
  const filter = { studentId }
  if (status) filter.status = status
  return AcademicSubject.find(filter).sort('-updatedAt').limit(limit).lean()
}

async function createSubject(studentId, body) {
  const name = String(body.name || '').trim()
  if (!name) throw Object.assign(new Error('Subject name is required.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  const profile = await getOrCreateProfile(studentId)
  const activePeriod = await getActivePeriod(profile)
  const subject = await AcademicSubject.create({
    studentId,
    periodId: body.periodId || activePeriod?._id,
    name,
    code: String(body.code || '').trim(),
    credits: body.credits,
    description: String(body.description || '').trim(),
    units: Array.isArray(body.units) ? body.units : [],
  })
  await syncSubjectGraph(studentId, subject)
  return subject
}

async function updateSubject(studentId, subjectId, body) {
  const subject = await getOwnedSubject(studentId, subjectId)
  const allowed = ['name', 'code', 'credits', 'description', 'status', 'periodId']
  for (const key of allowed) {
    if (body[key] !== undefined) subject[key] = body[key]
  }
  await subject.save()
  await syncSubjectGraph(studentId, subject)
  return subject
}

async function getSubjectDetail(studentId, subjectId) {
  const subject = await getOwnedSubject(studentId, subjectId)
  const [notes, assignments, exams, conceptCount] = await Promise.all([
    AcademicNote.find({ studentId, subjectId }).sort('-updatedAt').limit(20).lean(),
    AcademicAssignment.find({ studentId, subjectId, status: { $ne: 'archived' } }).sort('dueDate').limit(20).lean(),
    AcademicExam.find({ studentId, subjectId }).sort('scheduledAt').limit(10).lean(),
    require('../models/AcademicConcept').countDocuments({ studentId, subjectId }),
  ])
  const topics = (subject.units || []).flatMap((u) => (u.topics || []).map((t) => ({ ...t.toObject?.() || t, unitId: u._id, unitTitle: u.title })))
  const completedTopics = topics.filter((t) => t.status === 'COMPLETED').length
  const needsRevision = topics.filter((t) => t.status === 'NEEDS_REVISION').length
  const nextExam = exams.find((e) => new Date(e.scheduledAt) >= new Date()) || null

  return {
    subject: subject.toObject(),
    summary: {
      syllabusTopics: topics.length,
      completedTopics,
      needsRevisionTopics: needsRevision,
      conceptCount,
      assignmentCount: assignments.length,
      examCount: exams.length,
      nextExam: nextExam ? {
        id: String(nextExam._id),
        name: nextExam.name,
        scheduledAt: nextExam.scheduledAt,
        daysRemaining: Math.max(0, Math.ceil((new Date(nextExam.scheduledAt).getTime() - Date.now()) / 86400000)),
      } : null,
    },
    notes,
    assignments,
    exams,
  }
}

async function createNote(studentId, body) {
  await getOwnedSubject(studentId, body.subjectId)
  return AcademicNote.create({
    studentId,
    subjectId: body.subjectId,
    unitId: body.unitId,
    topicId: body.topicId,
    conceptId: body.conceptId,
    type: body.type || 'personal',
    title: String(body.title || '').trim(),
    content: String(body.content || '').trim(),
    lectureDate: body.lectureDate,
    resourceUrl: body.resourceUrl,
  })
}

async function listNotes(studentId, { subjectId, q, limit = 30, page = 1 } = {}) {
  const filter = { studentId }
  if (subjectId) filter.subjectId = subjectId
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ title: rx }, { content: rx }]
  }
  const skip = (Math.max(1, page) - 1) * limit
  const [items, total] = await Promise.all([
    AcademicNote.find(filter).sort('-updatedAt').skip(skip).limit(limit).lean(),
    AcademicNote.countDocuments(filter),
  ])
  return { items, total, page, limit }
}

async function createAssignment(studentId, body) {
  await getOwnedSubject(studentId, body.subjectId)
  const assignment = await AcademicAssignment.create({
    studentId,
    subjectId: body.subjectId,
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    priority: body.priority || 'Medium',
    topicIds: body.topicIds || [],
    conceptIds: body.conceptIds || [],
    source: body.source || 'student',
  })

  if (body.createTask !== false) {
    const task = await Task.create({
      userId: studentId,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      priority: assignment.priority,
      status: 'todo',
      type: 'learn',
      source: 'manual',
      category: 'Academic',
      metadata: { academicAssignmentId: assignment._id, subjectId: assignment.subjectId },
    })
    assignment.taskId = task._id
    await assignment.save()
  }
  return assignment
}

async function listAssignments(studentId, { subjectId, limit = 30 } = {}) {
  const filter = { studentId, status: { $ne: 'archived' } }
  if (subjectId) filter.subjectId = subjectId
  return AcademicAssignment.find(filter).sort('dueDate').limit(limit).lean()
}

async function createExam(studentId, body) {
  await getOwnedSubject(studentId, body.subjectId)
  if (!body.scheduledAt) {
    throw Object.assign(new Error('Exam date is required.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  }
  return AcademicExam.create({
    studentId,
    subjectId: body.subjectId,
    name: String(body.name || '').trim() || 'Exam',
    examType: body.examType || 'custom',
    scheduledAt: new Date(body.scheduledAt),
    coveredUnitIds: body.coveredUnitIds || [],
    coveredTopicIds: body.coveredTopicIds || [],
    source: body.source || 'student',
  })
}

async function listExams(studentId, { subjectId, upcoming = true, limit = 20 } = {}) {
  const filter = { studentId }
  if (subjectId) filter.subjectId = subjectId
  if (upcoming) filter.scheduledAt = { $gte: new Date(Date.now() - 7 * 86400000) }
  return AcademicExam.find(filter).sort('scheduledAt').limit(limit).lean()
}

function hashContent(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex')
}

module.exports = {
  isEnabled,
  getOrCreateProfile,
  getOverview,
  updateProfile,
  addPeriod,
  listSubjects,
  createSubject,
  updateSubject,
  getSubjectDetail,
  getOwnedSubject,
  createNote,
  listNotes,
  createAssignment,
  listAssignments,
  createExam,
  listExams,
  hashContent,
  syncSubjectGraph,
}
