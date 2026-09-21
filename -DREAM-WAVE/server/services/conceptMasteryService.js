const AcademicConcept = require('../models/AcademicConcept')
const knowledgeGraphService = require('./knowledgeGraphService')

const MASTERY_LEVELS = AcademicConcept.MASTERY_LEVELS

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180)
}

async function ensureConcept(studentId, { subjectId, unitId, topicId, name, prerequisiteIds = [] }) {
  const slug = slugify(name)
  let concept = await AcademicConcept.findOne({ studentId, subjectId, slug })
  if (!concept) {
    concept = await AcademicConcept.create({
      studentId,
      subjectId,
      unitId,
      topicId,
      name: String(name).trim(),
      slug,
      prerequisiteIds,
    })
    if (knowledgeGraphService.isEnabled()) {
      await knowledgeGraphService.upsertEdge(studentId, {
        sourceType: 'topic',
        sourceId: String(topicId),
        targetType: 'concept',
        targetId: String(concept._id),
        relationType: 'TOPIC_MAPS_CONCEPT',
        origin: 'SYSTEM_DERIVED',
        label: concept.name,
      }).catch(() => null)
      for (const prereqId of prerequisiteIds) {
        await knowledgeGraphService.upsertEdge(studentId, {
          sourceType: 'concept',
          sourceId: String(prereqId),
          targetType: 'concept',
          targetId: String(concept._id),
          relationType: 'PREREQUISITE_OF',
          origin: 'EXPLICIT',
        }).catch(() => null)
      }
    }
  }
  return concept
}

async function recordPractice(studentId, conceptId, { correct = false } = {}) {
  const concept = await AcademicConcept.findOne({ _id: conceptId, studentId })
  if (!concept) throw Object.assign(new Error('Concept not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  concept.mastery.practiceCount = (concept.mastery.practiceCount || 0) + 1
  if (!correct) concept.mastery.errorCount = (concept.mastery.errorCount || 0) + 1
  concept.mastery.lastReviewedAt = new Date()

  const errors = concept.mastery.errorCount || 0
  const practices = concept.mastery.practiceCount || 0
  if (practices >= 3 && errors === 0) concept.mastery.level = 'mastered'
  else if (practices >= 2 && errors <= 1) concept.mastery.level = 'practicing'
  else if (errors >= 2) concept.mastery.level = 'needs_revision'
  else concept.mastery.level = 'learning'

  const revisionDays = concept.mastery.level === 'mastered' ? 14 : concept.mastery.level === 'needs_revision' ? 1 : 3
  concept.mastery.revisionDueAt = new Date(Date.now() + revisionDays * 86400000)
  await concept.save()
  return concept
}

async function getRevisionQueue(studentId, { subjectId, limit = 20 } = {}) {
  const filter = {
    studentId,
    'mastery.level': { $in: ['needs_revision', 'learning', 'practicing'] },
  }
  if (subjectId) filter.subjectId = subjectId
  const concepts = await AcademicConcept.find(filter).sort({ 'mastery.revisionDueAt': 1 }).limit(limit).lean()
  const now = Date.now()
  return concepts.map((c) => ({
    id: String(c._id),
    name: c.name,
    subjectId: String(c.subjectId),
    level: c.mastery.level,
    revisionDueAt: c.mastery.revisionDueAt,
    overdue: c.mastery.revisionDueAt && new Date(c.mastery.revisionDueAt).getTime() <= now,
    practiceCount: c.mastery.practiceCount,
    errorCount: c.mastery.errorCount,
  }))
}

async function listConcepts(studentId, subjectId) {
  return AcademicConcept.find({ studentId, subjectId }).sort('name').lean()
}

async function getWeakConcepts(studentId, { subjectId, limit = 10 } = {}) {
  const filter = { studentId, 'mastery.level': { $in: ['needs_revision', 'learning'] } }
  if (subjectId) filter.subjectId = subjectId
  return AcademicConcept.find(filter).sort('-mastery.errorCount').limit(limit).lean()
}

function buildRapidRevision(concepts, minutes = 30) {
  const slots = Math.max(1, Math.floor(minutes / 10))
  return {
    durationMinutes: minutes,
    items: concepts.slice(0, slots).map((c) => ({
      conceptId: String(c._id || c.id),
      name: c.name,
      level: c.mastery?.level || c.level,
      actions: ['Review definition', 'Recall key points', 'Attempt 2 practice questions'],
    })),
    disclaimer: 'Revision plan based on your concept mastery state — not predicted exam content.',
  }
}

module.exports = {
  MASTERY_LEVELS,
  ensureConcept,
  recordPractice,
  getRevisionQueue,
  listConcepts,
  getWeakConcepts,
  buildRapidRevision,
}
