const crypto = require('crypto')
const AcademicSubject = require('../models/AcademicSubject')
const academicService = require('./academicService')
const conceptMasteryService = require('./conceptMasteryService')

const TOPIC_STATUSES = AcademicSubject.TOPIC_STATUSES

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180)
}

function validateSyllabusStructure(units) {
  if (!Array.isArray(units)) {
    throw Object.assign(new Error('Units must be an array.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  }
  if (units.length > 30) {
    throw Object.assign(new Error('Too many units (max 30).'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  }
  return units.map((unit, ui) => {
    const title = String(unit.title || '').trim()
    if (!title) throw Object.assign(new Error(`Unit ${ui + 1} requires a title.`), { statusCode: 400, code: 'VALIDATION_ERROR' })
    const topics = Array.isArray(unit.topics) ? unit.topics : []
    if (topics.length > 50) {
      throw Object.assign(new Error(`Unit "${title}" has too many topics (max 50).`), { statusCode: 400, code: 'VALIDATION_ERROR' })
    }
    return {
      title,
      order: unit.order || ui + 1,
      topics: topics.map((topic, ti) => {
        const topicTitle = String(topic.title || '').trim()
        if (!topicTitle) throw Object.assign(new Error(`Topic ${ti + 1} in "${title}" requires a title.`), { statusCode: 400, code: 'VALIDATION_ERROR' })
        const status = TOPIC_STATUSES.includes(topic.status) ? topic.status : 'NOT_STARTED'
        return { title: topicTitle, order: topic.order || ti + 1, status, conceptIds: topic.conceptIds || [] }
      }),
    }
  })
}

function parseTextToProposal(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const units = []
  let currentUnit = null
  for (const line of lines) {
    const unitMatch = /^unit\s*(\d+)[:.\-\s]+(.+)/i.exec(line)
    const topicMatch = /^(\d+\.|[-•*])\s*(.+)/.exec(line)
    if (unitMatch) {
      currentUnit = { title: unitMatch[2].trim(), order: Number(unitMatch[1]), topics: [] }
      units.push(currentUnit)
      continue
    }
    if (topicMatch && currentUnit) {
      currentUnit.topics.push({ title: topicMatch[2].trim(), order: currentUnit.topics.length + 1, status: 'NOT_STARTED' })
    }
  }
  return {
    units,
    confidence: units.length ? 'medium' : 'low',
    disclaimer: 'AI-extracted structure requires student review. No marks, dates, or credits are inferred.',
  }
}

async function applySyllabus(studentId, subjectId, { units, source = 'manual', documentHash = null, createConcepts = true }) {
  const subject = await academicService.getOwnedSubject(studentId, subjectId)
  const validated = validateSyllabusStructure(units)
  subject.units = validated
  subject.syllabusSource = source
  if (documentHash) subject.syllabusDocumentHash = documentHash
  await subject.save()

  if (createConcepts) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) {
        const concept = await conceptMasteryService.ensureConcept(studentId, {
          subjectId: subject._id,
          unitId: unit._id,
          topicId: topic._id,
          name: topic.title,
        })
        topic.conceptIds = [concept._id]
      }
    }
    await subject.save()
  }

  await academicService.syncSubjectGraph(studentId, subject)
  return subject
}

async function proposeExtraction(studentId, subjectId, rawText) {
  await academicService.getOwnedSubject(studentId, subjectId)
  const hash = academicService.hashContent(rawText)
  const proposal = parseTextToProposal(rawText)
  return { hash, ...proposal, validated: validateSyllabusStructure(proposal.units) }
}

async function updateTopicStatus(studentId, subjectId, { unitId, topicId, status }) {
  const subject = await academicService.getOwnedSubject(studentId, subjectId)
  const unit = subject.units.id(unitId)
  if (!unit) throw Object.assign(new Error('Unit not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  const topic = unit.topics.id(topicId)
  if (!topic) throw Object.assign(new Error('Topic not found.'), { statusCode: 404, code: 'NOT_FOUND' })
  if (!TOPIC_STATUSES.includes(status)) {
    throw Object.assign(new Error('Invalid topic status.'), { statusCode: 400, code: 'VALIDATION_ERROR' })
  }
  topic.status = status
  await subject.save()
  return { unitId, topicId, status: topic.status }
}

function computeSyllabusProgress(subject) {
  const topics = (subject.units || []).flatMap((u) => u.topics || [])
  if (!topics.length) return { total: 0, completed: 0, learning: 0, needsRevision: 0, percent: 0 }
  const completed = topics.filter((t) => t.status === 'COMPLETED').length
  const learning = topics.filter((t) => ['LEARNING', 'PRACTICING'].includes(t.status)).length
  const needsRevision = topics.filter((t) => t.status === 'NEEDS_REVISION').length
  const meaningful = completed + learning + needsRevision
  return {
    total: topics.length,
    completed,
    learning,
    needsRevision,
    percent: topics.length ? Math.round((meaningful / topics.length) * 100) : 0,
  }
}

function remainingSyllabus(subject) {
  return (subject.units || []).flatMap((unit) =>
    (unit.topics || [])
      .filter((t) => t.status !== 'COMPLETED')
      .map((t) => ({ unitTitle: unit.title, topicTitle: t.title, status: t.status, unitId: unit._id, topicId: t._id })),
  )
}

module.exports = {
  validateSyllabusStructure,
  parseTextToProposal,
  applySyllabus,
  proposeExtraction,
  updateTopicStatus,
  computeSyllabusProgress,
  remainingSyllabus,
  slugify,
}
