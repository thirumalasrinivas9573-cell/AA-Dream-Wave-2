const mongoose = require('mongoose')
const InstitutionStudent = require('../models/InstitutionStudent')
const UserProfile = require('../models/UserProfile')
const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const { isProjectVisible } = require('../utils/institutionStudentPrivacy')
const { collectSkillEvidence } = require('./recruitmentIntelligenceService')

function oid(value) {
  if (!value) return null
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function extractRoadmapSkills(roadmaps = []) {
  const skills = new Set()
  for (const rm of roadmaps) {
    const data = rm.data || {}
    for (const s of data.skills || []) {
      if (typeof s === 'string') skills.add(s)
      else if (s?.name) skills.add(s.name)
    }
    for (const step of data.nextSteps || []) {
      if (typeof step === 'string') skills.add(step)
      else if (step?.title) skills.add(step.title)
    }
  }
  return [...skills]
}

async function loadMjProjects(userId) {
  const MJProject = mongoose.models.MJProject
  if (!MJProject) return []
  return MJProject.find({
    userId: oid(userId),
    archived: { $ne: true },
    visibility: { $in: ['public', 'institution'] },
  })
    .select('title description technologies status tags')
    .limit(20)
    .lean()
}

async function loadResearchTopics(userId, student) {
  const topics = []
  const InstitutionResearchProject = mongoose.models.InstitutionResearchProject
  if (InstitutionResearchProject && student?.institutionId) {
    const projects = await InstitutionResearchProject.find({
      institutionId: student.institutionId,
      'teamMembers.userId': oid(userId),
      status: { $in: ['active', 'ongoing', 'published'] },
    })
      .select('title researchArea keywords abstract')
      .limit(10)
      .lean()
    for (const p of projects) {
      if (p.researchArea) topics.push(p.researchArea)
      if (p.title) topics.push(p.title)
      for (const k of p.keywords || []) topics.push(k)
    }
  }
  return [...new Set(topics.filter(Boolean))]
}

/**
 * Builds authorized, minimal student context for opportunity matching.
 * Does not expose private AI conversations or full database history.
 */
async function buildOpportunityContext(userId) {
  const student = await InstitutionStudent.findOne({ linkedUserId: userId, status: 'active' })
  if (!student) {
    return {
      hasInstitutionLink: false,
      student: null,
      profile: null,
      goals: [],
      roadmaps: [],
      projects: [],
      researchTopics: [],
      skills: [],
      skillEvidence: new Map(),
      careerGoal: '',
      interests: [],
    }
  }

  const [profile, goals, roadmaps, mjProjects, researchTopics] = await Promise.all([
    UserProfile.findOne({ userId: oid(userId) }).lean(),
    Goal.find({ userId: oid(userId), completed: false }).select('title category description').limit(10).lean(),
    Roadmap.find({ userId: oid(userId) }).select('data goalId').limit(5).lean(),
    loadMjProjects(userId),
    loadResearchTopics(userId, student),
  ])

  const visibleProjects = (student.sharedProjects || [])
    .filter(isProjectVisible)
    .map((p) => ({
      title: p.title,
      technologies: p.technologies || [],
      description: p.description || '',
      source: 'institution_portfolio',
    }))

  const mjProjectItems = mjProjects.map((p) => ({
    title: p.title,
    technologies: p.technologies || p.tags || [],
    description: p.description || '',
    source: 'mj_project',
  }))

  const allProjects = [...visibleProjects, ...mjProjectItems]
  const skillEvidence = collectSkillEvidence(student)
  const profileSkills = profile?.skills || []
  const roadmapSkills = extractRoadmapSkills(roadmaps)
  const careerGoals = goals.filter((g) => g.category === 'Career').map((g) => g.title)

  const skills = [
    ...new Set([
      ...(student.sharedSkills || []),
      ...(student.verifiedSkills || []),
      ...(student.programmingLanguages || []),
      ...profileSkills,
      ...roadmapSkills,
    ]),
  ]

  return {
    hasInstitutionLink: true,
    student,
    profile: profile
      ? {
          targetRole: profile.targetRole || '',
          currentRole: profile.currentRole || '',
          interests: profile.interests || [],
          skills: profileSkills,
        }
      : null,
    goals: goals.map((g) => ({ title: g.title, category: g.category })),
    roadmaps: roadmaps.map((r) => ({ skills: extractRoadmapSkills([r]) })),
    projects: allProjects,
    researchTopics,
    skills,
    skillEvidence,
    careerGoal: profile?.targetRole || careerGoals[0] || '',
    interests: profile?.interests || [],
    department: student.department || '',
    course: student.course || '',
    batch: student.batch || '',
  }
}

function keywordOverlap(a, b) {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return false
  const wordsA = na.split(/\s+/).filter((w) => w.length > 2)
  const wordsB = nb.split(/\s+/).filter((w) => w.length > 2)
  return wordsA.some((w) => nb.includes(w)) || wordsB.some((w) => na.includes(w))
}

module.exports = {
  buildOpportunityContext,
  extractRoadmapSkills,
  keywordOverlap,
  normalizeText,
}
