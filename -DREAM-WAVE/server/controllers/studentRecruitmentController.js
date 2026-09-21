const studentRecruitmentService = require('../services/studentRecruitmentService')

exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await studentRecruitmentService.getStudentCareerDashboard(req.user._id)
    res.json({ success: true, dashboard })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.browseOpportunities = async (req, res) => {
  try {
    const result = await studentRecruitmentService.browseOpportunities(req.user._id, req.query)
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getEligibility = async (req, res) => {
  try {
    const eligibility = await studentRecruitmentService.getOpportunityEligibility(
      req.user._id,
      req.params.sourceType,
      req.params.opportunityId,
    )
    res.json({ success: true, eligibility })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.apply = async (req, res) => {
  try {
    const application = await studentRecruitmentService.applyToOpportunity(
      req.user._id,
      req.params.sourceType,
      req.params.opportunityId,
      req.body,
    )
    res.status(201).json({ success: true, application })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.listApplications = async (req, res) => {
  try {
    const result = await studentRecruitmentService.listMyApplications(req.user._id, req.query)
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.getApplication = async (req, res) => {
  try {
    const detail = await studentRecruitmentService.getMyApplication(req.user._id, req.params.id)
    res.json({ success: true, ...detail })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}

exports.withdrawApplication = async (req, res) => {
  try {
    const application = await studentRecruitmentService.withdrawMyApplication(req.user._id, req.params.id)
    res.json({ success: true, application })
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
}
