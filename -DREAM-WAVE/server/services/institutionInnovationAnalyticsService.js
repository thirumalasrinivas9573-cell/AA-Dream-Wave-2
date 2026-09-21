const mongoose = require('mongoose')
const InstitutionResearchProject = require('../models/InstitutionResearchProject')
const InstitutionResearchPublication = require('../models/InstitutionResearchPublication')
const InstitutionInnovationIdea = require('../models/InstitutionInnovationIdea')
const InstitutionStartup = require('../models/InstitutionStartup')
const InstitutionIncubationRecord = require('../models/InstitutionIncubationRecord')
const InstitutionMentor = require('../models/InstitutionMentor')
const InstitutionMentorshipSession = require('../models/InstitutionMentorshipSession')
const InstitutionFundingRecord = require('../models/InstitutionFundingRecord')
const InstitutionInnovationEvent = require('../models/InstitutionInnovationEvent')
const InstitutionIncubationCollaboration = require('../models/InstitutionIncubationCollaboration')

function oid(id) {
  return new mongoose.Types.ObjectId(id)
}

function mapGroupCounts(groups = []) {
  return Object.fromEntries(groups.map((g) => [g._id || 'Unknown', g.count]))
}

function buildDateFilter(filters = {}) {
  if (!filters.dateFrom && !filters.dateTo) return {}
  const createdAt = {}
  if (filters.dateFrom) createdAt.$gte = new Date(filters.dateFrom)
  if (filters.dateTo) createdAt.$lte = new Date(filters.dateTo)
  return { createdAt }
}

async function getInnovationAnalytics(institutionId, filters = {}) {
  const cid = oid(institutionId)
  const dateFilter = buildDateFilter(filters)
  const projectMatch = { institutionId: cid, ...dateFilter }
  if (filters.domain) projectMatch.domain = filters.domain
  if (filters.status) projectMatch.status = filters.status

  const [
    projects,
    publications,
    ideas,
    startups,
    incubations,
    mentors,
    sessions,
    funding,
    events,
    collaborations,
    byDomain,
    byFundingType,
    byIncubationStage,
  ] = await Promise.all([
    InstitutionResearchProject.find(projectMatch).select('status domain members principalInvestigator').lean(),
    InstitutionResearchPublication.countDocuments({ institutionId: cid, ...dateFilter }),
    InstitutionInnovationIdea.find({ institutionId: cid, ...dateFilter }).select('reviewStatus ideaType').lean(),
    InstitutionStartup.countDocuments({ institutionId: cid, ...dateFilter }),
    InstitutionIncubationRecord.find({ institutionId: cid }).select('currentStage').lean(),
    InstitutionMentor.countDocuments({ institutionId: cid, status: 'active' }),
    InstitutionMentorshipSession.find({ institutionId: cid, ...dateFilter }).select('status').lean(),
    InstitutionFundingRecord.find({ institutionId: cid, ...dateFilter }).select('fundingType status amount').lean(),
    InstitutionInnovationEvent.find({ institutionId: cid, ...dateFilter }).select('registrations status eventType').lean(),
    InstitutionIncubationCollaboration.countDocuments({ institutionId: cid, ...dateFilter }),
    InstitutionResearchProject.aggregate([
      { $match: { institutionId: cid } },
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    InstitutionFundingRecord.aggregate([
      { $match: { institutionId: cid } },
      { $group: { _id: '$fundingType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    InstitutionIncubationRecord.aggregate([
      { $match: { institutionId: cid } },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ]),
  ])

  let facultyParticipation = 0
  let studentParticipation = 0
  const facultySet = new Set()
  const studentSet = new Set()

  for (const project of projects) {
    for (const member of project.members || []) {
      if (member.memberType === 'faculty') {
        facultySet.add(member.name)
      }
      if (member.memberType === 'student') {
        studentSet.add(member.name)
      }
    }
    if (project.principalInvestigator?.name) {
      facultySet.add(project.principalInvestigator.name)
    }
  }

  facultyParticipation = facultySet.size
  studentParticipation = studentSet.size

  const eventRegistrations = events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0)
  const completedSessions = sessions.filter((s) => s.status === 'completed').length
  const totalFundingAmount = funding
    .filter((f) => ['approved', 'disbursed'].includes(f.status))
    .reduce((sum, f) => sum + (f.amount || 0), 0)

  const fundingDistribution = Object.fromEntries(
    byFundingType.map((f) => [f._id || 'unknown', { count: f.count, amount: f.total || 0 }]),
  )

  return {
    totalResearchProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    completedProjects: projects.filter((p) => p.status === 'completed').length,
    totalPublications: publications,
    researchDomains: mapGroupCounts(byDomain),
    facultyParticipation,
    studentParticipation,
    startupRegistrations: startups,
    incubationProgress: mapGroupCounts(byIncubationStage),
    fundingDistribution,
    totalFundingAmount,
    innovationIdeasSubmitted: ideas.length,
    ideasByType: ideas.reduce((acc, i) => {
      acc[i.ideaType] = (acc[i.ideaType] || 0) + 1
      return acc
    }, {}),
    eventParticipation: eventRegistrations,
    totalEvents: events.length,
    publishedEvents: events.filter((e) => ['published', 'ongoing', 'completed'].includes(e.status)).length,
    mentorEngagement: {
      activeMentors: mentors,
      totalSessions: sessions.length,
      completedSessions,
    },
    collaborationItems: collaborations,
    hasData:
      projects.length > 0 ||
      publications > 0 ||
      ideas.length > 0 ||
      startups > 0 ||
      mentors > 0,
  }
}

module.exports = {
  getInnovationAnalytics,
  mapGroupCounts,
}
