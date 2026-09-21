const researchService = require('../services/institutionResearchService')
const {
  RESEARCH_CATEGORIES,
  RESEARCH_DOMAINS,
  RESEARCH_PROJECT_STATUSES,
  RESEARCH_MEMBER_TYPES,
  RESEARCH_MEMBER_ROLES,
  PUBLICATION_TYPES,
  OUTCOME_TYPES,
  RESEARCH_OPPORTUNITY_TYPES,
  RESEARCH_OPPORTUNITY_STATUSES,
  OPPORTUNITY_APPLICATION_STATUSES,
  IDEA_TYPES,
  IDEA_REVIEW_STATUSES,
  INNOVATION_REPORT_TYPES,
} = require('../constants/institutionResearch')
const { getInnovationAnalytics } = require('../services/institutionInnovationAnalyticsService')
const {
  generateInnovationReport,
  exportInnovationReport,
} = require('../services/institutionInnovationReportService')
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
    categories: RESEARCH_CATEGORIES,
    domains: RESEARCH_DOMAINS,
    projectStatuses: RESEARCH_PROJECT_STATUSES,
    memberTypes: RESEARCH_MEMBER_TYPES,
    memberRoles: RESEARCH_MEMBER_ROLES,
    publicationTypes: PUBLICATION_TYPES,
    outcomeTypes: OUTCOME_TYPES,
    opportunityTypes: RESEARCH_OPPORTUNITY_TYPES,
    opportunityStatuses: RESEARCH_OPPORTUNITY_STATUSES,
    applicationStatuses: OPPORTUNITY_APPLICATION_STATUSES,
    ideaTypes: IDEA_TYPES,
    ideaReviewStatuses: IDEA_REVIEW_STATUSES,
    reportTypes: INNOVATION_REPORT_TYPES,
  })
}

exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await getInnovationAnalytics(institutionId(req), req.query)
    res.json({ success: true, analytics })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getReportTypes = (_req, res) => {
  res.json({ success: true, reportTypes: INNOVATION_REPORT_TYPES })
}

exports.previewReport = async (req, res) => {
  try {
    const report = await generateInnovationReport(
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
    const exported = await exportInnovationReport(
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
    const stats = await researchService.getResearchStats(institutionId(req))
    res.json({ success: true, stats })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getWorkspace = async (req, res) => {
  try {
    const workspace = await researchService.getResearchWorkspace(institutionId(req))
    res.json({ success: true, workspace })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listProjects = async (req, res) => {
  try {
    const result = await researchService.listProjects(institutionId(req), req.query, req.query)
    res.json({ success: true, projects: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.getProject = async (req, res) => {
  try {
    const project = await researchService.getProject(institutionId(req), req.params.id)
    res.json({ success: true, project })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createProject = async (req, res) => {
  try {
    const project = await researchService.createProject(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.body,
    )
    res.status(201).json({ success: true, project })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.updateProject = async (req, res) => {
  try {
    const project = await researchService.updateProject(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.user.name,
      req.body,
    )
    res.json({ success: true, project })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.transitionProject = async (req, res) => {
  try {
    const project = await researchService.transitionProjectStatus(
      institutionId(req),
      req.params.id,
      req.body.status,
      req.user._id,
      req.user.name,
    )
    res.json({ success: true, project })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.addProjectMember = async (req, res) => {
  try {
    const project = await researchService.addProjectMember(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.user.name,
      req.body,
    )
    res.json({ success: true, project })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.removeProjectMember = async (req, res) => {
  try {
    const project = await researchService.removeProjectMember(
      institutionId(req),
      req.params.id,
      req.params.memberId,
      req.user._id,
      req.user.name,
    )
    res.json({ success: true, project })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listPublications = async (req, res) => {
  try {
    const result = await researchService.listPublications(institutionId(req), req.query, req.query)
    res.json({ success: true, publications: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createPublication = async (req, res) => {
  try {
    const publication = await researchService.createPublication(
      institutionId(req),
      req.user._id,
      req.body,
    )
    res.status(201).json({ success: true, publication })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listOpportunities = async (req, res) => {
  try {
    const result = await researchService.listOpportunities(institutionId(req), req.query, req.query)
    res.json({ success: true, opportunities: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.createOpportunity = async (req, res) => {
  try {
    const opportunity = await researchService.createOpportunity(
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
    const opportunity = await researchService.updateOpportunity(
      institutionId(req),
      req.params.id,
      req.body,
    )
    res.json({ success: true, opportunity })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.transitionOpportunity = async (req, res) => {
  try {
    const opportunity = await researchService.transitionOpportunityStatus(
      institutionId(req),
      req.params.id,
      req.body.action,
    )
    res.json({ success: true, opportunity })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listApplications = async (req, res) => {
  try {
    const result = await researchService.listOpportunityApplications(
      institutionId(req),
      req.query,
      req.query,
    )
    res.json({ success: true, applications: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.reviewApplication = async (req, res) => {
  try {
    const application = await researchService.reviewOpportunityApplication(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.json({ success: true, application })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.listIdeas = async (req, res) => {
  try {
    const result = await researchService.listIdeas(institutionId(req), req.query, req.query)
    res.json({ success: true, ideas: result.items, pagination: result })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.submitIdea = async (req, res) => {
  try {
    const idea = await researchService.submitIdea(
      institutionId(req),
      req.user._id,
      req.user.name,
      req.institutionMember?.role || 'staff',
      req.body,
    )
    res.status(201).json({ success: true, idea })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.reviewIdea = async (req, res) => {
  try {
    const idea = await researchService.reviewIdea(
      institutionId(req),
      req.params.id,
      req.user._id,
      req.body,
    )
    res.json({ success: true, idea })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.browseOpportunities = async (req, res) => {
  try {
    const result = await researchService.listPublishedOpportunitiesForStudent(req.user._id, req.query)
    res.json({ success: true, opportunities: result.items, total: result.total })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.applyToOpportunity = async (req, res) => {
  try {
    const application = await researchService.applyToOpportunity(
      req.user._id,
      req.user.name,
      req.params.id,
      req.body,
    )
    res.status(201).json({ success: true, application })
  } catch (e) {
    sendApiError(res, e)
  }
}

exports.submitIdeaAsUser = async (req, res) => {
  try {
    const idea = await researchService.submitIdeaForLinkedUser(
      req.user._id,
      req.user.name,
      req.user.role,
      req.body,
    )
    res.status(201).json({ success: true, idea })
  } catch (e) {
    sendApiError(res, e)
  }
}
