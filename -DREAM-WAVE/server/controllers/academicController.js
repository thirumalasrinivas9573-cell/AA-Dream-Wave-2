const mongoose = require('mongoose')
const academicService = require('../services/academicService')
const syllabusService = require('../services/syllabusService')
const conceptMasteryService = require('../services/conceptMasteryService')
const examPrepService = require('../services/examPrepService')
const questionPaperService = require('../services/questionPaperService')
const academicStudyPlanService = require('../services/academicStudyPlanService')
const decisionSupportService = require('../services/decisionSupportService')

const fail = (res, status, message, code = 'ACADEMIC_ERROR') =>
  res.status(status).json({ success: false, code, message })

function guardEnabled(req, res, next) {
  if (!academicService.isEnabled()) {
    return fail(res, 503, 'Academic Intelligence is temporarily unavailable.', 'ACADEMIC_DISABLED')
  }
  return next()
}

exports.overview = async (req, res) => {
  try {
    const data = await academicService.getOverview(req.user._id)
    return res.json({ success: true, data })
  } catch (error) {
    console.error('[academics.overview]', error.message)
    return fail(res, error.statusCode || 500, error.message || 'Failed to load academic overview.')
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const profile = await academicService.updateProfile(req.user._id, req.body)
    return res.json({ success: true, profile })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to update academic profile.')
  }
}

exports.addPeriod = async (req, res) => {
  try {
    const profile = await academicService.addPeriod(req.user._id, req.body)
    return res.json({ success: true, profile })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to add academic period.')
  }
}

exports.listSubjects = async (req, res) => {
  try {
    const subjects = await academicService.listSubjects(req.user._id, req.query)
    return res.json({ success: true, subjects })
  } catch (error) {
    return fail(res, 500, 'Failed to list subjects.')
  }
}

exports.createSubject = async (req, res) => {
  try {
    const subject = await academicService.createSubject(req.user._id, req.body)
    return res.status(201).json({ success: true, subject })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to create subject.')
  }
}

exports.getSubject = async (req, res) => {
  try {
    const data = await academicService.getSubjectDetail(req.user._id, req.params.id)
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to load subject.')
  }
}

exports.updateSubject = async (req, res) => {
  try {
    const subject = await academicService.updateSubject(req.user._id, req.params.id, req.body)
    return res.json({ success: true, subject })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to update subject.')
  }
}

exports.applySyllabus = async (req, res) => {
  try {
    const subject = await syllabusService.applySyllabus(req.user._id, req.params.id, req.body)
    const progress = syllabusService.computeSyllabusProgress(subject)
    return res.json({ success: true, subject, progress })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to apply syllabus.')
  }
}

exports.proposeSyllabus = async (req, res) => {
  try {
    const proposal = await syllabusService.proposeExtraction(req.user._id, req.params.id, req.body.rawText)
    return res.json({ success: true, proposal })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to propose syllabus extraction.')
  }
}

exports.updateTopicStatus = async (req, res) => {
  try {
    const result = await syllabusService.updateTopicStatus(req.user._id, req.params.id, req.body)
    return res.json({ success: true, result })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to update topic status.')
  }
}

exports.listNotes = async (req, res) => {
  try {
    const data = await academicService.listNotes(req.user._id, req.query)
    return res.json({ success: true, ...data })
  } catch (error) {
    return fail(res, 500, 'Failed to list notes.')
  }
}

exports.createNote = async (req, res) => {
  try {
    const note = await academicService.createNote(req.user._id, req.body)
    return res.status(201).json({ success: true, note })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to create note.')
  }
}

exports.listAssignments = async (req, res) => {
  try {
    const assignments = await academicService.listAssignments(req.user._id, req.query)
    return res.json({ success: true, assignments })
  } catch (error) {
    return fail(res, 500, 'Failed to list assignments.')
  }
}

exports.createAssignment = async (req, res) => {
  try {
    const assignment = await academicService.createAssignment(req.user._id, req.body)
    return res.status(201).json({ success: true, assignment })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to create assignment.')
  }
}

exports.listExams = async (req, res) => {
  try {
    const exams = await academicService.listExams(req.user._id, req.query)
    return res.json({ success: true, exams })
  } catch (error) {
    return fail(res, 500, 'Failed to list exams.')
  }
}

exports.createExam = async (req, res) => {
  try {
    const exam = await academicService.createExam(req.user._id, req.body)
    return res.status(201).json({ success: true, exam })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to create exam.')
  }
}

exports.getExamPrep = async (req, res) => {
  try {
    const data = await examPrepService.getExamDetail(req.user._id, req.params.id)
    return res.json({ success: true, data })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to build exam preparation plan.')
  }
}

exports.uploadQuestionPaper = async (req, res) => {
  try {
    const paper = await questionPaperService.createFromText(req.user._id, {
      subjectId: req.params.id,
      ...req.body,
    })
    return res.status(201).json({ success: true, paper })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to process question paper.')
  }
}

exports.analyzePapers = async (req, res) => {
  try {
    const analysis = await questionPaperService.analyzeSubjectPapers(req.user._id, req.params.id)
    const subject = await academicService.getOwnedSubject(req.user._id, req.params.id)
    const papers = await require('../models/QuestionPaper').find({ studentId: req.user._id, subjectId: req.params.id }).lean()
    const coverage = questionPaperService.paperCoverage(subject, papers)
    return res.json({ success: true, analysis, coverage })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to analyze question papers.')
  }
}

exports.revisionQueue = async (req, res) => {
  try {
    const queue = await conceptMasteryService.getRevisionQueue(req.user._id, req.query)
    return res.json({ success: true, queue })
  } catch (error) {
    return fail(res, 500, 'Failed to load revision queue.')
  }
}

exports.recordPractice = async (req, res) => {
  try {
    const concept = await conceptMasteryService.recordPractice(req.user._id, req.params.conceptId, req.body)
    return res.json({ success: true, concept })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to record practice.')
  }
}

exports.rapidRevision = async (req, res) => {
  try {
    const minutes = Number(req.query.minutes) || 30
    const concepts = await conceptMasteryService.getWeakConcepts(req.user._id, { subjectId: req.query.subjectId, limit: 10 })
    const plan = conceptMasteryService.buildRapidRevision(concepts, minutes)
    return res.json({ success: true, plan })
  } catch (error) {
    return fail(res, 500, 'Failed to build rapid revision plan.')
  }
}

exports.dailyStudyPlan = async (req, res) => {
  try {
    const plan = await academicStudyPlanService.buildDailyPlan(req.user._id, req.query)
    return res.json({ success: true, plan })
  } catch (error) {
    return fail(res, 500, 'Failed to generate daily study plan.')
  }
}

exports.proposePlanner = async (req, res) => {
  try {
    const plan = await academicStudyPlanService.buildDailyPlan(req.user._id, req.body)
    const proposals = await academicStudyPlanService.proposePlannerItems(req.user._id, plan.items, { date: plan.date })
    return res.json({ success: true, plan, proposals, requiresConfirmation: true })
  } catch (error) {
    return fail(res, 500, 'Failed to propose planner items.')
  }
}

exports.confirmStudyPlan = async (req, res) => {
  try {
    const created = await academicStudyPlanService.confirmStudyPlan(req.user._id, req.body)
    return res.json({ success: true, created })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message || 'Failed to confirm study plan.')
  }
}

exports.nextAcademicAction = async (req, res) => {
  try {
    const overview = await academicService.getOverview(req.user._id)
    const revision = await conceptMasteryService.getRevisionQueue(req.user._id, { limit: 1 })
    let action = null
    if (overview.upcomingExam && overview.upcomingExam.daysRemaining <= 3) {
      action = {
        type: 'EXAM_PREP',
        title: `Prepare for ${overview.upcomingExam.name}`,
        reason: `Exam in ${overview.upcomingExam.daysRemaining} day(s). Prioritize syllabus revision and weak concepts.`,
        priority: 'critical',
        action: { label: 'Open exam prep', url: `/student/academics/subjects/${overview.upcomingExam.subjectId}` },
        fingerprint: decisionSupportService.fingerprint('EXAM_PREP', { id: overview.upcomingExam.id }),
      }
    } else if (revision[0]) {
      action = {
        type: 'REVISION',
        title: `Revise ${revision[0].name}`,
        reason: revision[0].overdue ? 'Revision is overdue based on your concept state.' : `Concept marked ${revision[0].level}.`,
        priority: 'high',
        action: { label: 'Open academics', url: '/student/academics' },
        fingerprint: decisionSupportService.fingerprint('REVISION', { id: revision[0].id }),
      }
    } else if (overview.dueAssignment) {
      action = {
        type: 'ASSIGNMENT',
        title: overview.dueAssignment.title,
        reason: overview.dueAssignment.dueDate ? `Due ${new Date(overview.dueAssignment.dueDate).toLocaleDateString()}.` : 'Pending academic assignment.',
        priority: 'high',
        action: { label: 'View assignment', url: `/student/academics/subjects/${overview.dueAssignment.subjectId}` },
        fingerprint: decisionSupportService.fingerprint('ASSIGNMENT', { id: overview.dueAssignment.id }),
      }
    }
    return res.json({ success: true, action, overview: { setupRequired: overview.setupRequired } })
  } catch (error) {
    return fail(res, 500, 'Failed to compute next academic action.')
  }
}

exports.guardEnabled = guardEnabled
