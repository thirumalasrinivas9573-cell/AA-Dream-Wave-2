const mongoose = require('mongoose')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const CampusOpportunity = require('../models/CampusOpportunity')
const { listOpportunities } = require('./institutionPlacementService')
const { getInstitutionSkillAnalytics } = require('./businessIntelligenceService')
const { getRecommendedPartners } = require('./partnershipIntelligenceService')
const {
  browseMarketplace,
  getPersonalizedFeed,
  getMatchDetail,
} = require('./talentMarketplaceService')
const {
  compareOpportunities,
  loadAllOpportunities,
  matchOpportunity,
} = require('./opportunityMatchingService')
const { buildOpportunityContext } = require('./opportunityContextService')
const { validateOpportunityQuality, classifyDeadline, filterActiveOpportunities } = require('./opportunityQualityService')
const { TYPE_MAP, MARKETPLACE_TYPE_TABS } = require('../constants/industryOpportunity')
const { resolveOpportunityStatus } = require('./talentMarketplaceService')

function oid(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
}

function normalizeType(kind, source) {
  const k = String(kind || source || '').toLowerCase()
  for (const [tab, aliases] of Object.entries(TYPE_MAP)) {
    if (aliases.some((a) => k.includes(a))) return tab
  }
  if (k.includes('research')) return 'research'
  if (k.includes('train') || k.includes('workshop')) return 'training'
  if (k.includes('hack')) return 'hackathon'
  if (k.includes('event')) return 'event'
  if (k.includes('intern')) return 'internship'
  if (k.includes('job')) return 'job'
  return 'all'
}

function filterByType(items, typeFilter) {
  if (!typeFilter || typeFilter === 'all') return items
  const aliases = TYPE_MAP[typeFilter] || [typeFilter]
  return items.filter((item) => {
    const k = `${item.kind || ''} ${item.source || ''} ${item.opportunityType || ''}`.toLowerCase()
    return aliases.some((a) => k.includes(a))
  })
}

function scoreInstitutionRelevance(skills, opportunity) {
  const required = opportunity.requiredSkills || opportunity.eligibilityRules?.requiredSkills || []
  if (!required.length) return { relevance: 'INSUFFICIENT_DATA', score: 0, reasons: ['No required skills listed'] }

  const supplySet = new Set((skills.supply || []).map((s) => String(s.skill).toLowerCase()))
  let matched = 0
  const matchedSkills = []
  const gapSkills = []
  for (const raw of required) {
    const key = String(raw).toLowerCase()
    if ([...supplySet].some((s) => s.includes(key) || key.includes(s))) {
      matched++
      matchedSkills.push(raw)
    } else {
      gapSkills.push(raw)
    }
  }
  const ratio = matched / Math.max(required.length, 1)
  let relevance = 'LOW'
  if (ratio >= 0.7) relevance = 'HIGH'
  else if (ratio >= 0.45) relevance = 'MEDIUM'

  return {
    relevance,
    score: Math.round(ratio * 100),
    matchedSkills,
    gapSkills,
    reasons: [
      `${matched}/${required.length} required skills have aggregate student evidence`,
      gapSkills.length ? `Gap areas: ${gapSkills.slice(0, 3).join(', ')}` : 'Strong program alignment',
    ],
    disclaimer: 'Institution-level aggregate relevance — not individual student predictions.',
  }
}

async function getStudentMarketplaceHub(userId, filters = {}) {
  const [feed, browse] = await Promise.all([
    getPersonalizedFeed(userId, filters),
    browseMarketplace(userId, { ...filters, limit: filters.limit || 30 }),
  ])

  let items = filterActiveOpportunities(browse.items || [])
  items = filterByType(items, filters.type)

  const withQuality = items.slice(0, 30).map((item) => ({
    ...item,
    quality: validateOpportunityQuality(item),
    deadlineState: classifyDeadline(item.deadline || item.registrationDeadline),
  }))

  return {
    role: 'student',
    generatedAt: new Date().toISOString(),
    sections: {
      strongMatches: (feed.sections?.strongMatches || []).slice(0, 10),
      closingSoon: (feed.sections?.closingSoon || []).slice(0, 10),
      recommended: (feed.sections?.recommended || []).slice(0, 10),
      skillBuilding: (feed.sections?.skillBuilding || []).slice(0, 8),
      discover: withQuality,
      newOpportunities: (feed.sections?.newOpportunities || []).slice(0, 10),
    },
    typeTabs: MARKETPLACE_TYPE_TABS,
    profileCompleteness: feed.profileCompleteness,
    disclaimer: 'Scores reflect profile-to-requirement alignment, not hiring probability.',
  }
}

async function getInstitutionMarketplaceHub(institutionId, filters = {}) {
  const institution = await Institution.findById(institutionId).select('name departments programs').lean()
  if (!institution) {
    const err = new Error('Institution not found')
    err.statusCode = 404
    throw err
  }

  const [opportunities, skills, partners] = await Promise.all([
    listOpportunities(institutionId, { ...filters, limit: 50 }),
    getInstitutionSkillAnalytics(institutionId, filters),
    getRecommendedPartners(institutionId, 'institution', { limit: 5 }),
  ])

  let items = filterActiveOpportunities(opportunities.items || [])
  items = filterByType(items, filters.type)

  const enriched = items.map((item) => {
    const quality = validateOpportunityQuality(item)
    const relevance = scoreInstitutionRelevance(skills, item)
    return {
      ...item,
      quality,
      institutionRelevance: relevance,
      deadlineState: classifyDeadline(item.deadline || item.registrationDeadline),
      status: resolveOpportunityStatus(item),
    }
  })

  enriched.sort((a, b) => (b.institutionRelevance?.score || 0) - (a.institutionRelevance?.score || 0))

  const byType = {}
  for (const item of enriched) {
    const t = normalizeType(item.opportunityType || item.kind, item.source)
    byType[t] = (byType[t] || 0) + 1
  }

  return {
    role: 'institution',
    generatedAt: new Date().toISOString(),
    institution: { name: institution.name, departments: institution.departments, programs: institution.programs },
    sections: {
      recommended: enriched.filter((i) => i.institutionRelevance?.relevance === 'HIGH').slice(0, 10),
      companyOpportunities: enriched.filter((i) => i.companyId || i.company).slice(0, 15),
      internships: enriched.filter((i) => normalizeType(i.opportunityType, i.kind) === 'internship').slice(0, 10),
      projects: enriched.filter((i) => normalizeType(i.opportunityType, i.kind) === 'project').slice(0, 10),
      research: enriched.filter((i) => normalizeType(i.opportunityType, i.kind) === 'research').slice(0, 10),
      training: enriched.filter((i) => normalizeType(i.opportunityType, i.kind) === 'training').slice(0, 10),
      events: enriched.filter((i) => normalizeType(i.opportunityType, i.kind) === 'event').slice(0, 10),
      discover: enriched.slice(0, 30),
    },
    potentialPartners: partners.matches?.slice(0, 5) || [],
    skillDemand: (skills.demand || []).slice(0, 8),
    skillGaps: (skills.gaps || []).slice(0, 8),
    counts: { total: enriched.length, byType },
    typeTabs: MARKETPLACE_TYPE_TABS,
    disclaimer: 'Institution marketplace uses authorized placement and partnership data only.',
  }
}

async function getCompanyMarketplaceHub(companyId, filters = {}) {
  const company = await Company.findById(companyId).select('name industry').lean()
  if (!company) {
    const err = new Error('Company not found')
    err.statusCode = 404
    throw err
  }

  const partnerships = await InstitutionCompanyPartnership.find({
    companyId: oid(companyId),
    status: 'active',
  })
    .populate('institutionId', 'name type departments programs city')
    .limit(20)
    .lean()

  const [jobs, internships, campusOps] = await Promise.all([
    RecruitmentJob.find({ companyId: oid(companyId), status: { $in: ['open', 'published'] } }).limit(20).lean(),
    RecruitmentInternship.find({ companyId: oid(companyId), status: { $in: ['open', 'published'] } }).limit(20).lean(),
    CampusOpportunity.find({ companyId: oid(companyId), status: { $in: ['open', 'published', 'registration_open'] } })
      .limit(20)
      .lean(),
  ])

  const listings = [
    ...jobs.map((j) => ({
      id: j._id.toString(),
      source: 'job',
      kind: 'job',
      title: j.title,
      organizer: company.name,
      requiredSkills: j.requiredSkills,
      status: j.status,
      quality: validateOpportunityQuality({ ...j, organizer: company.name, isJob: true }),
    })),
    ...internships.map((i) => ({
      id: i._id.toString(),
      source: 'internship',
      kind: 'internship',
      title: i.title,
      organizer: company.name,
      requiredSkills: i.requiredSkills,
      status: i.status,
      quality: validateOpportunityQuality({ ...i, organizer: company.name, isInternship: true }),
    })),
    ...campusOps.map((o) => ({
      id: o._id.toString(),
      source: 'campus_opportunity',
      kind: o.opportunityType,
      title: o.title,
      organizer: company.name,
      requiredSkills: o.eligibilityRules?.requiredSkills || [],
      status: o.status,
      deadline: o.deadline,
      quality: validateOpportunityQuality({ ...o, organizer: company.name }),
    })),
  ]

  const partnerInstitutions = partnerships.map((p) => ({
    id: p.institutionId?._id?.toString(),
    name: p.institutionId?.name,
    type: p.institutionId?.type,
    relationshipType: p.relationshipType,
    departments: p.institutionId?.departments?.slice(0, 5),
  }))

  return {
    role: 'company',
    generatedAt: new Date().toISOString(),
    company: { name: company.name, industry: company.industry },
    sections: {
      openRoles: listings.filter((l) => l.kind === 'job' || l.kind === 'internship'),
      projects: listings.filter((l) => normalizeType(l.kind) === 'project'),
      training: listings.filter((l) => normalizeType(l.kind) === 'training'),
      partnerInstitutions,
    },
    counts: {
      openJobs: jobs.length,
      openInternships: internships.length,
      activePartnerships: partnerships.length,
      listings: listings.length,
    },
    typeTabs: MARKETPLACE_TYPE_TABS,
    disclaimer: 'Company marketplace shows authorized listings and partner institutions only.',
  }
}

async function getOpportunityQualityForUser(userId, source, sourceId) {
  const detail = await getMatchDetail(userId, source, sourceId)
  const quality = validateOpportunityQuality({
    ...detail.opportunity,
    requiredSkills: detail.opportunity?.requiredSkills,
    description: detail.opportunity?.description,
  })
  return { quality, opportunity: detail.opportunity, match: detail.match }
}

async function compareMarketplaceOpportunities(userId, items) {
  return compareOpportunities(userId, items)
}

async function getMarketplaceInsights(userId, intent, { source, sourceId } = {}) {
  const insight = { observation: '', why: '', missing: [], nextStep: null, source: 'Industry Opportunity Marketplace' }

  if (source && sourceId) {
    const detail = await getMatchDetail(userId, source, sourceId)
    if (intent === 'WHY_YOU_MATCH') {
      insight.observation = `${detail.match.category}: ${detail.opportunity.title}`
      insight.why = detail.explanation?.matched?.join(', ') || detail.match.reasons?.[0]?.label
      insight.missing = detail.explanation?.missing || []
    } else if (intent === 'WHAT_IS_MISSING') {
      insight.missing = detail.requirements?.missingRequirements?.map((m) => m.label) || detail.explanation?.missing || []
      insight.observation = insight.missing.length ? `Missing: ${insight.missing.slice(0, 3).join(', ')}` : 'No major gaps detected'
    } else if (intent === 'WHAT_TO_DO_NEXT') {
      insight.nextStep = detail.explanation?.nextStep || detail.match.nextStep
      insight.observation = insight.nextStep || 'Review requirements and prepare application'
    } else {
      insight.observation = detail.opportunity.title
      insight.why = detail.match.reasons?.[0]?.label || 'Based on profile alignment'
    }
  } else {
    const hub = await getStudentMarketplaceHub(userId)
    insight.observation = `${hub.sections.strongMatches?.length || 0} strong match(es) available`
    insight.nextStep = hub.sections.strongMatches?.[0]?.title || 'Browse marketplace'
  }

  return { intent, insight, limitation: 'Uses authorized data only. Does not guarantee outcomes.' }
}

module.exports = {
  getStudentMarketplaceHub,
  getInstitutionMarketplaceHub,
  getCompanyMarketplaceHub,
  getOpportunityQualityForUser,
  compareMarketplaceOpportunities,
  getMarketplaceInsights,
  scoreInstitutionRelevance,
  filterByType,
  normalizeType,
}
