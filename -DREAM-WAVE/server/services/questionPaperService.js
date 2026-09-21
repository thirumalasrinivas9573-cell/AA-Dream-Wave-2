const QuestionPaper = require('../models/QuestionPaper')
const academicService = require('./academicService')
const conceptMasteryService = require('./conceptMasteryService')

function parseQuestionsFromText(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const questions = []
  let currentSection = ''
  for (const line of lines) {
    const sectionMatch = /^section\s+[a-z0-9]+[:.\-\s]*(.*)$/i.exec(line)
    if (sectionMatch) {
      currentSection = sectionMatch[0]
      continue
    }
    const qMatch = /^(\d+)[.)]\s*(.+)/.exec(line)
    if (qMatch) {
      const text = qMatch[2]
      const marksMatch = /\((\d+)\s*marks?\)/i.exec(text)
      questions.push({
        text: text.replace(/\(\d+\s*marks?\)/i, '').trim(),
        marks: marksMatch ? Number(marksMatch[1]) : undefined,
        questionType: marksMatch && Number(marksMatch[1]) <= 2 ? 'mcq' : marksMatch && Number(marksMatch[1]) >= 10 ? 'long' : 'short',
        section: currentSection,
        topicHints: [],
        mappingConfidence: 'uncertain',
      })
    }
  }
  return questions
}

function mapQuestionsToConcepts(questions, concepts) {
  return questions.map((q) => {
    const lower = q.text.toLowerCase()
    const matches = concepts.filter((c) => lower.includes(c.name.toLowerCase()))
    if (!matches.length) return q
    return {
      ...q,
      conceptIds: matches.slice(0, 3).map((c) => c._id),
      topicHints: matches.map((c) => c.name),
      mappingConfidence: matches.length === 1 ? 'medium' : 'low',
    }
  })
}

async function createFromText(studentId, { subjectId, title, yearLabel, rawText, examId }) {
  await academicService.getOwnedSubject(studentId, subjectId)
  const hash = academicService.hashContent(rawText)
  const existing = await QuestionPaper.findOne({ studentId, subjectId, fileHash: hash })
  if (existing) return existing

  const concepts = await conceptMasteryService.listConcepts(studentId, subjectId)
  let questions = parseQuestionsFromText(rawText)
  questions = mapQuestionsToConcepts(questions, concepts)

  return QuestionPaper.create({
    studentId,
    subjectId,
    examId,
    title: title || 'Question Paper',
    yearLabel: yearLabel || '',
    rawText: String(rawText).slice(0, 200000),
    fileHash: hash,
    questions,
    extractionStatus: questions.length ? 'parsed' : 'failed',
  })
}

function analyzeFrequency(papers) {
  const topicFrequency = {}
  const conceptFrequency = {}
  const questionTypes = {}
  for (const paper of papers) {
    for (const q of paper.questions || []) {
      if (q.questionType) questionTypes[q.questionType] = (questionTypes[q.questionType] || 0) + 1
      for (const hint of q.topicHints || []) {
        topicFrequency[hint] = (topicFrequency[hint] || 0) + 1
      }
      for (const cid of q.conceptIds || []) {
        const key = String(cid)
        conceptFrequency[key] = (conceptFrequency[key] || 0) + 1
      }
    }
  }
  return {
    topicFrequency,
    conceptFrequency,
    questionTypes,
    disclaimer: 'Frequency reflects uploaded papers only — not guaranteed future exam content.',
  }
}

async function analyzeSubjectPapers(studentId, subjectId) {
  const papers = await QuestionPaper.find({ studentId, subjectId }).sort('-updatedAt').limit(10).lean()
  const analysis = analyzeFrequency(papers)
  if (papers[0]) {
    await QuestionPaper.updateMany(
      { studentId, subjectId },
      { $set: { 'analysis.topicFrequency': analysis.topicFrequency, 'analysis.conceptFrequency': analysis.conceptFrequency, 'analysis.generatedAt': new Date() } },
    )
  }
  return { paperCount: papers.length, ...analysis, papers: papers.map((p) => ({ id: String(p._id), title: p.title, yearLabel: p.yearLabel, questionCount: (p.questions || []).length })) }
}

function paperCoverage(subject, papers) {
  const syllabusTopics = (subject.units || []).flatMap((u) => (u.topics || []).map((t) => t.title.toLowerCase()))
  const observed = new Set()
  for (const paper of papers) {
    for (const q of paper.questions || []) {
      for (const hint of q.topicHints || []) observed.add(hint.toLowerCase())
      const lower = q.text.toLowerCase()
      for (const topic of syllabusTopics) {
        if (lower.includes(topic)) observed.add(topic)
      }
    }
  }
  const covered = syllabusTopics.filter((t) => observed.has(t))
  const notObserved = syllabusTopics.filter((t) => !observed.has(t))
  return {
    covered,
    notObserved,
    disclaimer: 'Topics not observed in uploaded papers may still appear on exams.',
  }
}

module.exports = {
  parseQuestionsFromText,
  mapQuestionsToConcepts,
  createFromText,
  analyzeFrequency,
  analyzeSubjectPapers,
  paperCoverage,
}
