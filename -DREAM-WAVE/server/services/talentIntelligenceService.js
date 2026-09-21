const mongoose = require('mongoose')
const InstitutionStudent = require('../models/InstitutionStudent')
const RecruitmentApplication = require('../models/RecruitmentApplication')
const RecruitmentInterview = require('../models/RecruitmentInterview')
const RecruitmentOffer = require('../models/RecruitmentOffer')
const ApplicationAssessment = require('../models/ApplicationAssessment')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const {
  collectSkillEvidence,
  matchRequiredSkills,
  buildEligibilityChecklist,
  buildSafeCandidateProfile,
  EVIDENCE_LEVELS,
} = require('./recruitmentIntelligenceService')
const { buildOpportunityContext } = require('./opportunityContextService')
const {
  getStudentFeed,
  getMatchExplanation,
  buildPreparationPlan,
  matchOpportunity,
  loadAllOpportunities,
} = require('./opportunityMatchingService')
const { MATCH_LEVELS } = require('../opportunityMatching')
const { getStudentCareerDashboard, listMyApplications } = require('./studentRecruitmentService')
const { getPlacementAnalytics } = require('./institutionPlacementAnalyticsService')
const { getRecruitmentAnalytics } = require('./recruitmentAnalyticsService')
const {
  getInstitutionSkillAnalytics,
  getCompanySkillAnalytics,
  buildFilters,
} = require('./businessIntelligenceService')
const { discoverTalent } = require('./institutionTalentService')
const { discoverTalent: discoverCompanyTalent } = require('./companyRecruitmentExtendedService')
const { listDiscoverablePrograms } = require('./institutionProgramService')
const { isProjectVisible, isCertificateVisible } = require('../utils/institutionStudentPrivacy')
const ProgramParticipant = require('../models/ProgramParticipant')

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function mapMatchCategory(matchLevel, eligibilityResult) {
  if (eligibilityResult === 'NOT_ELIGIBLE') return 'INELIGIBLE'
  switch (matchLevel) {
    case MATCH_LEVELS.STRONG_MATCH:
      return 'STRONG_MATCH'
    case MATCH_LEVELS.GOOD_MATCH:
      return 'GOOD_MATCH'
    case MATCH_LEVELS.POTENTIAL_MATCH:
      return 'PARTIAL_MATCH'
    case MATCH_LEVELS.NEEDS_REVIEW:
      return 'LOW_MATCH'
    case MATCH_LEVELS.NOT_ELIGIBLE:
      return 'INELIGIBLE'
    default:
      return 'INSUFFICIENT_DATA'
  }
}

function buildSkillEvidenceGraph(student) {
  const evidenceMap = collectSkillEvidence(student)
  const graph = []

  for (const [key, entry] of evidenceMap.entries()) {
    graph.push({
      skill: entry.skill || key,
      evidenceLevel: entry.level,
      sources: (entry.sources || []).map((s) => ({
        type: s.type,
        title: s.title || null,
      })),
    })
  }

  return graph.sort((a, b) => {
    const rank = Object.values(EVIDENCE_LEVELS)
    return rank.indexOf(b.evidenceLevel) - rank.indexOf(a.evidenceLevel)
  })
}

async function getStudentTalentProfile(userId) {
  const context = await buildOpportunityContext(userId)
  if (!context.hasInstitutionLink) {
    return {
      hasInstitutionLink: false,
      note: 'Link your institution student profile to unlock talent intelligence.',
    }
  }

  const student = context.student
  const profile = buildSafeCandidateProfile(student)
  const evidenceGraph = buildSkillEvidenceGraph(student)

  const programCount = await ProgramParticipant.countDocuments({
    institutionStudentId: student._id,
    status: { $in: ['approved', 'active', 'completed', 'registered'] },
  })

  return {
    hasInstitutionLink: true,
    generatedAt: new Date().toISOString(),
    profile: {
      name: profile.name,
      department: profile.department,
      course: profile.course,
      batch: profile.batch,
      cgpa: profile.cgpa,
    },
    skills: {
      verified: profile.skills.verified,
      shared: profile.skills.shared,
      programmingLanguages: profile.skills.programmingLanguages,
    },
    evidenceGraph,
    evidenceSummary: {
      verified: evidenceGraph.filter((e) => e.evidenceLevel === EVIDENCE_LEVELS.VERIFIED).length,
      project: evidenceGraph.filter((e) => e.evidenceLevel === EVIDENCE_LEVELS.PROJECT).length,
      certified: evidenceGraph.filter((e) => e.evidenceLevel === EVIDENCE_LEVELS.CERTIFIED).length,
      declared: evidenceGraph.filter((e) => e.evidenceLevel === EVIDENCE_LEVELS.DECLARED).length,
    },
    projects: profile.projects,
    certifications: profile.certifications,
    internships: profile.internships,
    programParticipation: programCount,
    careerGoal: context.careerGoal || '',
    interests: context.interests || [],
    researchTopics: context.researchTopics || [],
  }
}

function derivePlacementReadiness(context, feed, applications) {
  if (!context.hasInstitutionLink) {
    return {
      state: 'INSUFFICIENT_DATA',
      explanation: {
        what: 'Placement readiness unavailable',
        why: 'No institution student profile linked.',
        strengths: [],
        needsAttention: ['Complete institution profile linkage'],
        source: 'InstitutionStudent record',
      },
    }
  }

  const evidenceGraph = buildSkillEvidenceGraph(context.student)
  const verifiedCount = evidenceGraph.filter((e) =>
    [EVIDENCE_LEVELS.VERIFIED, EVIDENCE_LEVELS.CERTIFIED, EVIDENCE_LEVELS.PROJECT].includes(e.evidenceLevel),
  ).length
  const strongMatches = (feed.strongMatches || []).length
  const appliedCount = applications.length
  const strengths = []
  const needsAttention = []

  if (verifiedCount >= 3) strengths.push(`${verifiedCount} skills with project/certificate/verified evidence`)
  else if (verifiedCount >= 1) strengths.push(`${verifiedCount} skill(s) with strong evidence`)
  else needsAttention.push('Limited verified or project-backed skill evidence')

  if ((context.projects || []).length) strengths.push(`${context.projects.length} portfolio project(s)`)
  else needsAttention.push('Add portfolio project evidence')

  if (strongMatches) strengths.push(`${strongMatches} strong opportunity match(es) in feed`)
  if (appliedCount) strengths.push(`${appliedCount} application(s) submitted`)

  if (!appliedCount && strongMatches) needsAttention.push('Consider applying to matched opportunities')
  if (!context.careerGoal) needsAttention.push('Set a target career role for better recommendations')

  let state = 'PREPARING'
  if (verifiedCount >= 3 && strongMatches >= 1 && appliedCount >= 1) state = 'READY'
  else if (verifiedCount >= 2 && (strongMatches >= 1 || appliedCount >= 1)) state = 'NEARLY_READY'
  else if (verifiedCount === 0 && evidenceGraph.length === 0) state = 'INSUFFICIENT_DATA'
  else if (needsAttention.length >= 3) state = 'NEEDS_ATTENTION'

  return {
    state,
    explanation: {
      what: `Placement readiness: ${state.replace(/_/g, ' ')}`,
      why: strengths.length
        ? `Evidence-backed strengths identified from profile and matching feed.`
        : 'Insufficient evidence to assess readiness confidently.',
      strengths,
      needsAttention,
      source: 'Skill evidence graph + opportunity matching + applications',
    },
  }
}

async function getPlacementReadiness(userId) {
  const [context, feed, apps] = await Promise.all([
    buildOpportunityContext(userId),
    getStudentFeed(userId, { limit: 20 }),
    listMyApplications(userId),
  ])
  return derivePlacementReadiness(context, feed, apps.applications || [])
}

async function getSkillGapIntelligence(userId, { source, sourceId, targetRole } = {}) {
  const context = await buildOpportunityContext(userId)
  if (!context.hasInstitutionLink) {
    return { hasInstitutionLink: false, gaps: [], note: 'Institution link required.' }
  }

  let requiredSkills = []
  let opportunityTitle = targetRole || 'Target role'

  if (source && sourceId) {
    const explanation = await getMatchExplanation(userId, source, sourceId)
    requiredSkills = explanation.opportunity?.requiredSkills || []
    opportunityTitle = explanation.opportunity?.title || opportunityTitle
    const missing = explanation.match?.missingRequirements || []
    return {
      hasInstitutionLink: true,
      target: opportunityTitle,
      requiredSkills,
      criticalGaps: missing,
      recommendedGaps: missing.slice(0, 5),
      optionalGaps: [],
      skillChecks: explanation.match?.eligibility?.checks?.filter((c) => c.category === 'skill') || [],
      explanation: {
        what: missing.length ? `${missing.length} skill gap(s) for ${opportunityTitle}` : 'No critical skill gaps detected',
        why: missing.length
          ? 'Required skills without matching evidence in your profile.'
          : 'All required skills have some evidence or no requirements listed.',
        source: 'Opportunity requirements + skill evidence graph',
      },
    }
  }

  const feed = await getStudentFeed(userId, { limit: 5 })
  const topOpp = feed.strongMatches?.[0]
  if (topOpp) {
    return getSkillGapIntelligence(userId, { source: topOpp.source, sourceId: topOpp.id })
  }

  return {
    hasInstitutionLink: true,
    target: opportunityTitle,
    requiredSkills: [],
    criticalGaps: [],
    recommendedGaps: [],
    optionalGaps: [],
    explanation: {
      what: 'No target opportunity selected',
      why: 'Select an opportunity or provide source/sourceId for gap analysis.',
      source: 'Talent Intelligence Service',
    },
  }
}

async function getLearningRecommendations(userId, { source, sourceId } = {}) {
  if (!source || !sourceId) {
    const gaps = await getSkillGapIntelligence(userId)
    const skills = gaps.criticalGaps || []
    return {
      recommendations: skills.map((skill) => ({
        skill,
        what: `Build evidence for ${skill}`,
        why: 'Identified as a skill gap for relevant opportunities',
        source: 'Skill gap analysis',
        href: '/learn',
        action: 'Complete existing learning modules covering this skill',
      })),
    }
  }

  const plan = await buildPreparationPlan(userId, source, sourceId)
  return {
    recommendations: (plan.checklist?.learningSuggestions || []).map((l) => ({
      skill: l.skill,
      what: l.suggestion,
      why: `Required for ${plan.opportunity?.title || 'this opportunity'}`,
      source: l.source || 'learning_roadmap',
      href: '/learn',
      action: 'User confirmation required before any application',
    })),
    opportunity: plan.opportunity,
    disclaimer: plan.disclaimer,
  }
}

async function getProjectRecommendations(userId) {
  const context = await buildOpportunityContext(userId)
  const gaps = await getSkillGapIntelligence(userId)
  const missing = gaps.criticalGaps || []

  return {
    recommendations: missing.slice(0, 5).map((skill) => ({
      skill,
      what: `Build a project demonstrating ${skill}`,
      why: 'Project evidence strengthens opportunity matches',
      source: 'Skill gap + project intelligence',
      href: '/community/projects',
      action: 'Create or link an existing project — not auto-created',
    })),
    existingProjects: (context.projects || []).map((p) => p.title),
  }
}

async function getProgramRecommendations(userId) {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId, status: 'active' }).lean()
  if (!student?.institutionId) return { recommendations: [] }

  const programs = await listDiscoverablePrograms(userId, student.institutionId, {})
  const gaps = await getSkillGapIntelligence(userId)
  const gapSet = new Set((gaps.criticalGaps || []).map((s) => s.toLowerCase()))

  const recommendations = programs
    .filter((p) => p.eligibility?.eligible)
    .filter((p) => (p.skills || []).some((s) => gapSet.has(String(s).toLowerCase())))
    .slice(0, 5)
    .map((p) => ({
      id: p.id || p._id?.toString(),
      title: p.title,
      what: p.programType,
      why: `Program skills address identified gaps: ${(p.skills || []).filter((s) => gapSet.has(String(s).toLowerCase())).join(', ')}`,
      source: 'Institution Program Operations (V3 P10)',
      href: `/programs/${p.id || p._id}`,
    }))

  return { recommendations }
}

async function getApplicationPipeline(userId) {
  const apps = await listMyApplications(userId)
  const items = apps.applications || []
  const applicationIds = items.map((a) => a.id || a._id).filter(Boolean)

  const [interviews, offers, assessments] = await Promise.all([
    applicationIds.length
      ? RecruitmentInterview.find({ applicationId: { $in: applicationIds } })
          .select('applicationId status scheduledAt completedAt result')
          .lean()
      : [],
    applicationIds.length
      ? RecruitmentOffer.find({ applicationId: { $in: applicationIds } })
          .select('applicationId status releasedAt acceptedAt')
          .lean()
      : [],
    applicationIds.length
      ? ApplicationAssessment.find({ applicationId: { $in: applicationIds } })
          .select('applicationId status score completedAt')
          .lean()
      : [],
  ])

  const interviewMap = Object.fromEntries(interviews.map((i) => [i.applicationId.toString(), i]))
  const offerMap = Object.fromEntries(offers.map((o) => [o.applicationId.toString(), o]))
  const assessmentMap = Object.fromEntries(assessments.map((a) => [a.applicationId.toString(), a]))

  return {
    pipeline: items.map((app) => {
      const id = (app.id || app._id).toString()
      const interview = interviewMap[id]
      const offer = offerMap[id]
      const assessment = assessmentMap[id]
      return {
        applicationId: id,
        roleTitle: app.roleTitle || app.title,
        stage: app.stage,
        companyName: app.companyName,
        appliedAt: app.createdAt || app.appliedAt,
        assessment: assessment
          ? { status: assessment.status || 'NOT_STARTED', score: assessment.score ?? null }
          : { status: 'NOT_STARTED', score: null },
        interview: interview
          ? {
              status: interview.status || (interview.scheduledAt ? 'scheduled' : 'pending'),
              scheduledAt: interview.scheduledAt,
            }
          : null,
        offer: offer
          ? { status: offer.status?.toUpperCase() || 'OFFERED' }
          : null,
      }
    }),
    totals: {
      applied: items.length,
      assessments: assessments.filter((a) => a.status === 'completed').length,
      interviews: interviews.length,
      offers: offers.length,
    },
  }
}

async function getStudentCareerIntelligence(userId) {
  const [talentProfile, readiness, feed, pipeline, gaps, learning, projects, programs] = await Promise.all([
    getStudentTalentProfile(userId),
    getPlacementReadiness(userId),
    getStudentFeed(userId, { limit: 15 }),
    getApplicationPipeline(userId),
    getSkillGapIntelligence(userId),
    getLearningRecommendations(userId),
    getProjectRecommendations(userId),
    getProgramRecommendations(userId),
  ])

  const opportunities = {
    recommended: (feed.strongMatches || []).slice(0, 8).map((o) => ({
      id: o.id,
      source: o.source,
      title: o.title,
      matchCategory: mapMatchCategory(o.match?.matchLevel, o.match?.eligibility?.result),
      why: o.match?.reasons?.slice(0, 3) || [],
      evidence: (o.match?.signals || []).slice(0, 3).map((s) =>
        typeof s === 'string' ? s : s.label || s.type || String(s),
      ),
      gaps: o.match?.missingRequirements || [],
      nextStep: o.match?.nextAction,
      href: o.href,
    })),
    closingSoon: (feed.closingSoon || []).slice(0, 5),
    skillBuilding: (feed.skillBuilding || []).slice(0, 5),
  }

  return {
    generatedAt: new Date().toISOString(),
    talentProfile,
    readiness,
    skillGaps: gaps,
    opportunities,
    pipeline,
    recommendations: {
      learning: learning.recommendations || [],
      projects: projects.recommendations || [],
      programs: programs.recommendations || [],
    },
    disclaimer: 'Career intelligence uses authorized data only. Does not guarantee hiring outcomes.',
  }
}

async function matchStudentToOpportunity(userId, source, sourceId) {
  const result = await getMatchExplanation(userId, source, sourceId)
  const category = mapMatchCategory(result.match?.matchLevel, result.match?.eligibility?.result)

  const strengths = (result.match?.signals || []).map((s) =>
    typeof s === 'string' ? s : s.label || s.type,
  )
  const gaps = result.match?.missingRequirements || []

  return {
    match: category,
    explanation: {
      what: `${category.replace(/_/g, ' ')} for ${result.opportunity?.title || 'opportunity'}`,
      why: result.match?.reasons || [],
      evidence: strengths,
      gaps,
      nextStep: result.match?.nextAction,
      source: 'Eligibility engine + skill evidence + opportunity matching',
    },
    eligibility: result.match?.eligibility,
    skillMatch: result.contextUsed?.skillMatch || null,
    opportunity: result.opportunity,
  }
}

async function getCompanyTalentIntelligence(companyId, query = {}) {
  const filters = buildFilters(query)
  const [analytics, recruitment, talentPool, jobs] = await Promise.all([
    getCompanySkillAnalytics(companyId, filters),
    getRecruitmentAnalytics(companyId, filters),
    discoverCompanyTalent(companyId, { limit: 10, ...query }),
    RecruitmentJob.find({ companyId: oid(companyId), status: { $in: ['open', 'published'] } })
      .select('title requiredSkills department')
      .limit(10)
      .lean(),
  ])

  return {
    generatedAt: new Date().toISOString(),
    scope: 'company',
    skillDemand: analytics.demand?.slice(0, 10) || [],
    skillSupply: analytics.supply?.slice(0, 10) || [],
    recruitment: {
      totalApplications: recruitment.totalApplications,
      activeRecruitments: recruitment.activeRecruitments,
      funnel: recruitment.candidatePipelineDistribution,
    },
    talentPool: {
      count: talentPool.total ?? talentPool.items?.length ?? 0,
      candidates: (talentPool.items || []).slice(0, 10),
    },
    openRoles: jobs.map((j) => ({
      id: j._id.toString(),
      title: j.title,
      requiredSkills: j.requiredSkills || [],
    })),
    disclaimer: 'Candidate data limited to authorized application snapshots. No cross-company data.',
  }
}

async function getInstitutionPlacementIntelligence(institutionId, query = {}) {
  const filters = buildFilters(query)
  const [placement, skills, talent] = await Promise.all([
    getPlacementAnalytics(institutionId, filters),
    getInstitutionSkillAnalytics(institutionId, filters),
    discoverTalent(institutionId, { limit: 10, placementReady: query.placementReady }),
  ])

  const readinessDistribution = { READY: 0, NEARLY_READY: 0, PREPARING: 0, NEEDS_ATTENTION: 0, INSUFFICIENT_DATA: 0 }
  for (const candidate of (talent.items || []).slice(0, 50)) {
    const state = candidate.placementReadiness || candidate.readiness || 'PREPARING'
    if (readinessDistribution[state] !== undefined) readinessDistribution[state]++
    else readinessDistribution.PREPARING++
  }

  return {
    generatedAt: new Date().toISOString(),
    scope: 'institution',
    placement: {
      hasData: placement.hasData,
      applicationsSubmitted: placement.applicationsSubmitted,
      studentsPlaced: placement.studentsPlaced,
      activeOpportunities: placement.activeOpportunities,
    },
    industryDemand: skills.demand?.slice(0, 10) || [],
    skillGaps: skills.gaps?.slice(0, 10) || [],
    skillOverlap: skills.overlap?.slice(0, 10) || [],
    talentPool: {
      total: talent.total ?? talent.items?.length ?? 0,
      eligibleCount: talent.eligibleCount ?? null,
    },
    readinessDistribution,
    disclaimer: 'Aggregate institution analytics. Individual student PII minimized.',
  }
}

async function searchTalentIntelligence(scopeId, role, { q = '', type = 'all', limit = 20 } = {}) {
  const term = String(q || '').trim()
  if (!term) return { results: [] }

  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const results = []
  const max = Math.min(parseInt(limit, 10) || 20, 30)

  if (role === 'institution') {
    const talent = await discoverTalent(scopeId, { search: term, limit: max })
    for (const s of (talent.items || []).slice(0, max)) {
      results.push({
        kind: 'student',
        id: s.id || s._id?.toString(),
        title: s.fullName || s.name,
        subtitle: s.department,
        href: `/institution/students/${s.id || s._id}`,
      })
    }
  }

  if (role === 'company') {
    const jobs = await RecruitmentJob.find({
      companyId: oid(scopeId),
      title: regex,
      status: { $in: ['open', 'published'] },
    })
      .select('title requiredSkills')
      .limit(max)
      .lean()
    for (const j of jobs) {
      results.push({
        kind: 'job',
        id: j._id.toString(),
        title: j.title,
        subtitle: (j.requiredSkills || []).slice(0, 3).join(', '),
        href: '/company/recruitment/jobs',
      })
    }
  }

  if (role === 'student') {
    const { items } = await loadAllOpportunities(scopeId, { q: term, limit: max })
    for (const o of items.slice(0, max)) {
      results.push({
        kind: o.source || 'opportunity',
        id: o.id,
        title: o.title,
        subtitle: o.companyName || o.opportunityType,
        href: o.href,
      })
    }
  }

  return { results: results.slice(0, max), query: term }
}

module.exports = {
  getStudentTalentProfile,
  buildSkillEvidenceGraph,
  getPlacementReadiness,
  getSkillGapIntelligence,
  getLearningRecommendations,
  getProjectRecommendations,
  getProgramRecommendations,
  getApplicationPipeline,
  getStudentCareerIntelligence,
  matchStudentToOpportunity,
  getCompanyTalentIntelligence,
  getInstitutionPlacementIntelligence,
  searchTalentIntelligence,
  mapMatchCategory,
  derivePlacementReadiness,
}
