const institutionStudentService = require('../services/institutionStudentService')
const institutionTalentService = require('../services/institutionTalentService')
const { getAuditLog } = require('../services/institutionAuditService')
const { serializeAuditEntry } = require('../dtos/institutionStudentDtos')
const { sendApiError } = require('../utils/institutionApiErrors')
const {
  STUDENT_STATUSES,
  PLACEMENT_STATUSES,
  PLACEMENT_LIFECYCLE,
  PLACEMENT_STATUS_SOURCES,
  SCHOLARSHIP_STATUSES,
  PROFILE_STATUSES,
  CERTIFICATE_VERIFICATION,
  ACHIEVEMENT_TYPES,
  DOCUMENT_TYPES,
  IMPORT_MODES,
  COHORT_TYPES,
} = require('../constants/institutionStudents')

function institutionId(req) {
  if (!req.institution?._id) {
    const err = new Error('Institution profile required')
    err.statusCode = 403
    throw err
  }
  return req.institution._id
}

exports.getMeta = (_req, res) => {
  res.json({
    success: true,
    statuses: STUDENT_STATUSES,
    placementStatuses: PLACEMENT_STATUSES,
    placementLifecycle: PLACEMENT_LIFECYCLE,
    placementStatusSources: PLACEMENT_STATUS_SOURCES,
    scholarshipStatuses: SCHOLARSHIP_STATUSES,
    profileStatuses: PROFILE_STATUSES,
    certificateVerification: CERTIFICATE_VERIFICATION,
    achievementTypes: ACHIEVEMENT_TYPES,
    documentTypes: DOCUMENT_TYPES,
    importModes: IMPORT_MODES,
    cohortTypes: COHORT_TYPES,
  })
}

exports.getStats = async (req, res) => {
  try {
    const stats = await institutionStudentService.getStats(institutionId(req))
    res.json({ success: true, stats })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getActivity = async (req, res) => {
  try {
    const activity = await institutionStudentService.getActivityTimeline(
      institutionId(req),
      req.query,
    )
    res.json({ success: true, activity })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getFilterOptions = async (req, res) => {
  try {
    const options = await institutionStudentService.getFilterOptions(institutionId(req))
    res.json({ success: true, options })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listStudents = async (req, res) => {
  try {
    const result = await institutionStudentService.listStudents(institutionId(req), req.query)
    res.json({ success: true, students: result.items, pagination: result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getStudent = async (req, res) => {
  try {
    const student = await institutionStudentService.getStudentDetail(
      institutionId(req),
      req.params.id,
    )
    res.json({ success: true, student })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createStudent = async (req, res) => {
  try {
    const student = await institutionStudentService.createStudent(
      institutionId(req),
      req.user._id,
      req.body,
      req.user.name,
    )
    res.status(201).json({ success: true, student })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateStudent = async (req, res) => {
  try {
    const student = await institutionStudentService.updateStudent(
      institutionId(req),
      req.params.id,
      req.body,
      { userId: req.user._id, name: req.user.name },
    )
    res.json({ success: true, student })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.addNote = async (req, res) => {
  try {
    const note = await institutionStudentService.addNote(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.user.name,
      req.body.content,
      req.body.type || 'internal',
    )
    res.status(201).json({ success: true, note })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.verifySkill = async (req, res) => {
  try {
    const student = await institutionStudentService.verifySkill(
      institutionId(req),
      req.params.id,
      req.body.skill,
    )
    res.json({ success: true, student })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.importStudents = async (req, res) => {
  try {
    const results = await institutionStudentService.importStudents(
      institutionId(req),
      req.user._id,
      req.body.rows || [],
    )
    res.json({ success: true, results })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.promoteSemester = async (req, res) => {
  try {
    const student = await institutionStudentService.promoteSemester(
      institutionId(req),
      req.params.id,
    )
    res.json({ success: true, student })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.discoverTalent = async (req, res) => {
  try {
    const result = await institutionTalentService.discoverTalent(institutionId(req), req.query)
    res.json({ success: true, students: result.items, pagination: result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.smartSearch = async (req, res) => {
  try {
    const result = await institutionTalentService.smartSearch(
      institutionId(req),
      req.body.query || '',
      req.body,
    )
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.previewImport = async (req, res) => {
  try {
    const preview = await institutionTalentService.previewImport(
      institutionId(req),
      req.body.rows || [],
      req.body.mode || 'CREATE_ONLY',
    )
    res.json({ success: true, preview })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.confirmImport = async (req, res) => {
  try {
    const result = await institutionTalentService.confirmImport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.body.rows || [],
      req.body.mode || 'CREATE_ONLY',
    )
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.bulkAction = async (req, res) => {
  try {
    const results = await institutionTalentService.bulkAction(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.body,
    )
    res.json({ success: true, results })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listCohorts = async (req, res) => {
  try {
    const cohorts = await institutionTalentService.listCohorts(institutionId(req))
    res.json({ success: true, cohorts })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createCohort = async (req, res) => {
  try {
    const cohort = await institutionTalentService.createCohort(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, cohort })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getCohortMembers = async (req, res) => {
  try {
    const members = await institutionTalentService.resolveCohortMembers(
      institutionId(req),
      req.params.cohortId,
    )
    res.json({ success: true, members })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.listSavedFilters = async (req, res) => {
  try {
    const filters = await institutionTalentService.listSavedFilters(institutionId(req))
    res.json({ success: true, filters })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.createSavedFilter = async (req, res) => {
  try {
    const filter = await institutionTalentService.createSavedFilter(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, filter })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getPlacementSummary = async (req, res) => {
  try {
    const summary = await institutionTalentService.getPlacementSummary(
      institutionId(req),
      req.params.id,
    )
    res.json({ success: true, summary })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getDocument = async (req, res) => {
  try {
    const doc = await institutionTalentService.getAuthorizedDocument(
      institutionId(req),
      req.params.id,
      parseInt(req.params.docIndex, 10),
    )
    res.json({ success: true, document: doc })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.verifyAchievement = async (req, res) => {
  try {
    const achievement = await institutionTalentService.verifyAchievement(
      institutionId(req),
      req.params.id,
      parseInt(req.params.index, 10),
      req.user._id,
      req.user.name,
    )
    res.json({ success: true, achievement })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.verifyCertificate = async (req, res) => {
  try {
    const certificate = await institutionTalentService.verifyCertificate(
      institutionId(req),
      req.params.id,
      parseInt(req.params.index, 10),
      req.user._id,
      req.user.name,
    )
    res.json({ success: true, certificate })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.updatePlacement = async (req, res) => {
  try {
    const doc = await institutionTalentService.updatePlacementLifecycle(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.user.name,
      req.body,
    )
    res.json({ success: true, placement: doc.placement })
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message })
  }
}

exports.getAuditLog = async (req, res) => {
  try {
    const result = await getAuditLog(institutionId(req), req.params.id, req.query)
    res.json({
      success: true,
      audit: result.items.map(serializeAuditEntry),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pageCount: result.pageCount,
      },
    })
  } catch (e) {
    sendApiError(res, e)
  }
}
