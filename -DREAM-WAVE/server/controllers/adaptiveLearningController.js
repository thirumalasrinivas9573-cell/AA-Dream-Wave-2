const adaptiveLearning = require('../services/adaptiveLearningService')

function handleError(res, err) {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server error',
  })
}

exports.getProfile = async (req, res) => {
  try {
    const profile = await adaptiveLearning.getOrCreateProfile(req.user._id)
    res.json({ success: true, profile })
  } catch (err) {
    handleError(res, err)
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const profile = await adaptiveLearning.updateProfile(req.user._id, req.body)
    res.json({ success: true, profile })
  } catch (err) {
    handleError(res, err)
  }
}

exports.dashboard = async (req, res) => {
  try {
    const dashboard = await adaptiveLearning.getDashboard(req.user._id)
    res.json({ success: true, dashboard })
  } catch (err) {
    handleError(res, err)
  }
}

exports.roadmap = async (req, res) => {
  try {
    const roadmap = await adaptiveLearning.getLearningRoadmap(req.user._id)
    res.json({ success: true, roadmap })
  } catch (err) {
    handleError(res, err)
  }
}

exports.skillGaps = async (req, res) => {
  try {
    const analysis = await adaptiveLearning.getSkillGapAnalysis(req.user._id, {
      targetRole: req.query.targetRole,
    })
    res.json({ success: true, analysis })
  } catch (err) {
    handleError(res, err)
  }
}

exports.prerequisites = async (req, res) => {
  try {
    const result = await adaptiveLearning.checkPrerequisites(req.user._id, req.query.skill)
    res.json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.resources = async (req, res) => {
  try {
    const resources = await adaptiveLearning.recommendResources(req.user._id, req.user.role, {
      skill: req.query.skill,
      topic: req.query.topic,
      limit: Number(req.query.limit) || 8,
    })
    res.json({ success: true, resources })
  } catch (err) {
    handleError(res, err)
  }
}

exports.generatePlan = async (req, res) => {
  try {
    const plan = await adaptiveLearning.generateStudyPlan(req.user._id, req.body)
    res.status(201).json({ success: true, plan })
  } catch (err) {
    handleError(res, err)
  }
}

exports.pausePlan = async (req, res) => {
  try {
    const result = await adaptiveLearning.pausePlan(req.user._id)
    res.json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.recordEvidence = async (req, res) => {
  try {
    const result = await adaptiveLearning.recordEvidence(req.user._id, req.body)
    res.status(201).json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.mastery = async (req, res) => {
  try {
    const detail = await adaptiveLearning.getMasteryDetail(req.user._id, req.params.skillName)
    res.json({ success: true, ...detail })
  } catch (err) {
    handleError(res, err)
  }
}

exports.startSession = async (req, res) => {
  try {
    const session = await adaptiveLearning.startStudySession(req.user._id, req.body)
    res.status(201).json({ success: true, session })
  } catch (err) {
    handleError(res, err)
  }
}

exports.updateSession = async (req, res) => {
  try {
    const session = await adaptiveLearning.updateSession(req.user._id, req.params.id, req.body)
    res.json({ success: true, session })
  } catch (err) {
    handleError(res, err)
  }
}

exports.getSession = async (req, res) => {
  try {
    const session = await adaptiveLearning.assertOwned(
      require('../models/StudySession'),
      req.params.id,
      req.user._id,
      'Study session',
    )
    res.json({ success: true, session: session.toObject() })
  } catch (err) {
    handleError(res, err)
  }
}

exports.practice = async (req, res) => {
  try {
    const questions = adaptiveLearning.generatePracticeQuestions(
      req.body.skillName,
      req.body.topic,
      Number(req.body.count) || 3,
      req.body.difficulty || 'MEDIUM',
    )
    res.json({ success: true, questions })
  } catch (err) {
    handleError(res, err)
  }
}

exports.submitAssessment = async (req, res) => {
  try {
    const result = await adaptiveLearning.submitAssessment(req.user._id, req.body)
    res.status(201).json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}

exports.coachChat = async (req, res) => {
  try {
    const result = await adaptiveLearning.studyCoachChat(req.user._id, req.body)
    res.json({ success: true, ...result })
  } catch (err) {
    handleError(res, err)
  }
}
