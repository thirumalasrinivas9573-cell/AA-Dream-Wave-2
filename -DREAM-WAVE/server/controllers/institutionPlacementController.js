const institutionPlacementService = require('../services/institutionPlacementService')
const campusDriveService = require('../services/institutionCampusDriveService')
const {
  OPPORTUNITY_TYPES,
  OPPORTUNITY_STATUSES,
  ELIGIBILITY_DISPLAY_STATUSES,
  DRIVE_ACTIONS,
  DEFAULT_DRIVE_WORKFLOW,
  PLACEMENT_TRACKING_STATUSES,
  PLACEMENT_NOTIFICATION_TEMPLATES,
  PLACEMENT_REPORT_TYPES,
} = require('../constants/institutionPlacements')
const { getPlacementAnalytics } = require('../services/institutionPlacementAnalyticsService')
const {
  generatePlacementReport,
  exportPlacementReport,
} = require('../services/institutionPlacementReportService')
const { sendApiError } = require('../utils/institutionApiErrors')

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
    opportunityTypes: OPPORTUNITY_TYPES,
    opportunityStatuses: OPPORTUNITY_STATUSES,
    eligibilityStatuses: ELIGIBILITY_DISPLAY_STATUSES,
    driveActions: DRIVE_ACTIONS,
    defaultWorkflow: DEFAULT_DRIVE_WORKFLOW,
    placementTrackingStatuses: PLACEMENT_TRACKING_STATUSES,
    placementTrackingStatuses: PLACEMENT_TRACKING_STATUSES,
    notificationTemplates: PLACEMENT_NOTIFICATION_TEMPLATES,
    reportTypes: PLACEMENT_REPORT_TYPES,
  })
}

exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await getPlacementAnalytics(institutionId(req), req.query)
    res.json({ success: true, analytics })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getReportTypes = (_req, res) => {
  res.json({ success: true, reportTypes: PLACEMENT_REPORT_TYPES })
}

exports.previewReport = async (req, res) => {
  try {
    const report = await generatePlacementReport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query,
    )
    res.json({ success: true, report })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.exportReport = async (req, res) => {
  try {
    const exported = await exportPlacementReport(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.params.type,
      req.query,
      req.query.format || 'csv',
    )
    res.json({ success: true, export: exported })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getStats = async (req, res) => {
  try {
    const stats = await institutionPlacementService.getStats(institutionId(req))
    res.json({ success: true, stats })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const widgets = await campusDriveService.getDashboardWidgets(institutionId(req))
    res.json({ success: true, widgets })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getWorkspace = async (req, res) => {
  try {
    const workspace = await institutionPlacementService.getWorkspace(institutionId(req))
    res.json({ success: true, workspace })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listCompanies = async (req, res) => {
  try {
    const companies = await institutionPlacementService.listCompanies(institutionId(req), req.query)
    res.json({ success: true, companies })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getCompanyEngagement = async (req, res) => {
  try {
    const engagement = await campusDriveService.getCompanyEngagement(institutionId(req), req.params.companyId)
    res.json({ success: true, engagement })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listDrives = async (req, res) => {
  try {
    const drives = await campusDriveService.listDrives(institutionId(req), req.query)
    res.json({ success: true, drives })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.transitionDrive = async (req, res) => {
  try {
    const drive = await campusDriveService.transitionDrive(
      institutionId(req),
      req.params.id,
      req.body.action,
      req.user._id,
      req.user.name,
    )
    res.json({ success: true, drive })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateDriveWorkflow = async (req, res) => {
  try {
    const drive = await campusDriveService.updateDriveWorkflow(institutionId(req), req.params.id, req.body)
    res.json({ success: true, drive })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listOpportunities = async (req, res) => {
  try {
    const result = await institutionPlacementService.listOpportunities(institutionId(req), req.query)
    res.json({ success: true, opportunities: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createOpportunity = async (req, res) => {
  try {
    const opportunity = await institutionPlacementService.createOpportunity(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, opportunity })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateOpportunity = async (req, res) => {
  try {
    const opportunity = await institutionPlacementService.updateOpportunity(
      institutionId(req),
      req.params.id,
      req.body,
    )
    res.json({ success: true, opportunity })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listApplications = async (req, res) => {
  try {
    const result = await institutionPlacementService.listApplications(institutionId(req), req.query)
    res.json({ success: true, applications: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.submitApplication = async (req, res) => {
  try {
    const application = await institutionPlacementService.submitApplication(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, application })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.reviewApplication = async (req, res) => {
  try {
    const application = await institutionPlacementService.reviewApplication(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.user.name,
      req.body,
    )
    res.json({ success: true, application })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.withdrawApplication = async (req, res) => {
  try {
    await institutionPlacementService.withdrawApplication(
      institutionId(req),
      req.params.id,
      req.user._id,
    )
    res.json({ success: true })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.generateShortlist = async (req, res) => {
  try {
    const result = await campusDriveService.generateShortlist(
      institutionId(req),
      req.params.driveId,
      req.user._id,
      req.body,
    )
    res.json({ success: true, shortlist: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.approveShortlist = async (req, res) => {
  try {
    const result = await campusDriveService.approveShortlist(
      institutionId(req),
      req.params.driveId,
      req.user._id,
    )
    res.json({ success: true, shortlist: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.publishShortlist = async (req, res) => {
  try {
    const result = await campusDriveService.publishShortlist(
      institutionId(req),
      req.params.driveId,
      req.user._id,
    )
    res.json({ success: true, shortlist: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.rejectCandidates = async (req, res) => {
  try {
    const results = await campusDriveService.rejectCandidates(
      institutionId(req),
      req.body.applicationIds || [],
      req.user._id,
      req.body.reason,
    )
    res.json({ success: true, results })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getEligibility = async (req, res) => {
  try {
    const eligibility = await institutionPlacementService.getEligibility(
      institutionId(req),
      req.params.opportunityId,
      req.params.studentId,
      req.query.source,
    )
    res.json({ success: true, eligibility })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listEligibility = async (req, res) => {
  try {
    const rows = await institutionPlacementService.listEligibilityForOpportunity(
      institutionId(req),
      req.params.opportunityId,
      req.query,
    )
    res.json({ success: true, eligibility: rows })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listInterviews = async (req, res) => {
  try {
    const interviews = await institutionPlacementService.listInterviews(institutionId(req), req.query)
    res.json({ success: true, interviews })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createInterview = async (req, res) => {
  try {
    const interview = await campusDriveService.createInterview(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, interview })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.rescheduleInterview = async (req, res) => {
  try {
    const interview = await campusDriveService.rescheduleInterview(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.json({ success: true, interview })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.cancelInterview = async (req, res) => {
  try {
    const interview = await campusDriveService.cancelInterview(institutionId(req), req.params.id)
    res.json({ success: true, interview })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.recordInterviewOutcome = async (req, res) => {
  try {
    const interview = await campusDriveService.recordInterviewOutcome(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.json({ success: true, interview })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listOffers = async (req, res) => {
  try {
    const offers = await institutionPlacementService.listOffers(institutionId(req), req.query)
    res.json({ success: true, offers })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createOffer = async (req, res) => {
  try {
    const offer = await campusDriveService.createOffer(institutionId(req), req.user._id, req.body)
    res.status(201).json({ success: true, offer })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateOffer = async (req, res) => {
  try {
    const offer = await campusDriveService.updateOfferStatus(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.json({ success: true, offer })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listPools = async (req, res) => {
  try {
    const pools = await institutionPlacementService.listPools(institutionId(req))
    res.json({ success: true, pools })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.sendNotification = async (req, res) => {
  try {
    const result = await campusDriveService.sendPlacementNotification(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.json({ success: true, notification: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getStudentPlacementHistory = async (req, res) => {
  try {
    const history = await campusDriveService.getStudentPlacementHistory(
      institutionId(req),
      req.params.studentId,
    )
    res.json({ success: true, history })
  } catch (e) {
    sendApiError(res, e)
  }
}
