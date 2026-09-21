const mongoose = require('mongoose')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const {
  matchRequiredSkills,
  buildRuleBasedCandidateSummary,
  buildSafeCandidateProfile,
  jobToEligibilityRules,
} = require('./recruitmentIntelligenceService')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function mapCandidateMatchCategory(skillMatch, eligibilityResult) {
  if (eligibilityResult === 'NOT_ELIGIBLE') return 'NOT_ELIGIBLE'
  const coverage = skillMatch.coveragePercent || 0
  if (coverage >= 75) return 'STRONG_MATCH'
  if (coverage >= 55) return 'GOOD_MATCH'
  if (coverage >= 35) return 'PARTIAL_MATCH'
  if (coverage >= 15) return 'LOW_MATCH'
  return 'INSUFFICIENT_DATA'
}

async function getRoleRequirements(companyId, roleType, roleId) {
  if (roleType === 'job') {
    const job = await RecruitmentJob.findOne({ _id: oid(roleId), companyId: oid(companyId) }).lean()
    if (!job) {
      const err = new Error('Job not found')
      err.statusCode = 404
      throw err
    }
    return { role: job, requiredSkills: job.requiredSkills || [], title: job.title, type: 'job' }
  }
  if (roleType === 'internship') {
    const internship = await RecruitmentInternship.findOne({ _id: oid(roleId), companyId: oid(companyId) }).lean()
    if (!internship) {
      const err = new Error('Internship not found')
      err.statusCode = 404
      throw err
    }
    return {
      role: internship,
      requiredSkills: internship.requiredSkills || [],
      title: internship.title,
      type: 'internship',
    }
  }
  const err = new Error('Invalid role type')
  err.statusCode = 400
  throw err
}

async function matchApplicationsToRole(companyId, roleType, roleId, filters = {}) {
  const { requiredSkills, title, type } = await getRoleRequirements(companyId, roleType, roleId)
  const matchQuery = { companyId: oid(companyId), stage: { $nin: ['rejected', 'withdrawn'] } }
  if (roleType === 'job') matchQuery.jobId = oid(roleId)
  if (roleType === 'internship') matchQuery.internshipId = oid(roleId)

  const limit = Math.min(parseInt(filters.limit, 10) || 25, 50)
  const applications = await RecruitmentApplication.find(matchQuery).sort({ updatedAt: -1 }).limit(limit).lean()

  const candidates = applications.map((app) => {
    const snapshot = app.candidateSnapshot || {}
    const pseudoStudent = {
      sharedSkills: snapshot.skills || [],
      verifiedSkills: [],
      sharedProjects: (snapshot.projects || []).map((p) =>
        typeof p === 'string'
          ? { title: p, technologies: [], visibility: 'shared' }
          : { title: p.title || p, technologies: p.technologies || [], visibility: 'shared' },
      ),
      certifications: (snapshot.certificates || []).map((c) => ({ title: c, skillsCovered: [] })),
      department: '',
      course: (snapshot.education || [])[0] || '',
    }
    const skillMatch = matchRequiredSkills(requiredSkills, pseudoStudent)
    const category = mapCandidateMatchCategory(skillMatch, skillMatch.matchedCount > 0 ? 'ELIGIBLE' : 'NEEDS_REVIEW')

    return {
      applicationId: app._id.toString(),
      name: snapshot.name || 'Candidate',
      stage: app.stage,
      matchCategory: category,
      skillMatch: {
        matched: skillMatch.matchedCount,
        required: skillMatch.requiredCount,
        coveragePercent: skillMatch.coveragePercent,
      },
      explanation: {
        matched: skillMatch.checks.filter((c) => c.status === 'pass').map((c) => c.skill),
        missing: skillMatch.checks.filter((c) => c.status !== 'pass').map((c) => c.skill),
        source: 'Application snapshot + job requirements',
      },
      disclaimer: 'Ranking uses authorized application snapshot only. Human review required.',
    }
  })

  candidates.sort((a, b) => (b.skillMatch.coveragePercent || 0) - (a.skillMatch.coveragePercent || 0))

  return {
    role: { id: roleId, type, title },
    requiredSkills,
    candidates,
    totals: { count: candidates.length, strong: candidates.filter((c) => c.matchCategory === 'STRONG_MATCH').length },
    disclaimer: 'AI assists ranking. Recruiters make final shortlist/hiring decisions.',
  }
}

async function analyzeRoleSkillGaps(companyId, roleType, roleId) {
  const { requiredSkills, title } = await getRoleRequirements(companyId, roleType, roleId)
  const result = await matchApplicationsToRole(companyId, roleType, roleId, { limit: 100 })

  const available = new Set()
  for (const c of result.candidates) {
    for (const s of c.explanation.matched) available.add(String(s).toLowerCase())
  }

  const gaps = requiredSkills.filter((s) => !available.has(String(s).toLowerCase()))

  return {
    role: { id: roleId, type: roleType, title },
    requiredSkills,
    availableSkills: [...available],
    gapSkills: gaps,
    candidatePoolSize: result.totals.count,
    explanation: {
      what: gaps.length ? `${gaps.length} required skill(s) have limited evidence in current pool` : 'Pool covers required skills',
      source: 'Aggregate application snapshots — individual students not exposed',
    },
  }
}

module.exports = {
  matchApplicationsToRole,
  analyzeRoleSkillGaps,
  getRoleRequirements,
}
