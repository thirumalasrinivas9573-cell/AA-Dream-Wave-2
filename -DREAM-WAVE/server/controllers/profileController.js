const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const User = require('../models/User')
const StudentProfile = require('../models/StudentProfile')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const FocusSession = require('../models/FocusSession')
const profilePortfolioService = require('../services/profilePortfolioService')
const profileIntelligence = require('../services/profileIntelligenceService')

const SECTIONS = {
  skills: { max: 100, required: ['name'] },
  projects: { max: 50, required: ['title'] },
  achievements: { max: 100, required: ['title'] },
  credentials: { max: 100, required: ['title', 'issuer'] },
  academicJourney: { max: 20, required: ['institution'] },
  experience: { max: 50, required: ['title'] },
}
const RESERVED = new Set(['admin', 'api', 'auth', 'login', 'signup', 'student', 'students', 'portfolio', 'settings', 'profile', 'support'])
const PROFILE_FIELDS = ['displayName', 'profilePhoto', 'coverBanner', 'headline', 'bio', 'location', 'languages', 'links', 'academic', 'sectionOrder', 'careerDirection']
const ASSET_ROOT = path.resolve(process.env.STUDENT_ASSET_ROOT || path.join(process.cwd(), 'uploads', 'student-profiles'))

const fail = (res, status, message, code = 'PROFILE_ERROR') => res.status(status).json({ success: false, code, message })
const pick = (source, fields) => Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
const slugify = (value) => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
const safeUrl = (value) => {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol)) return ''
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return ''
    return url.toString().slice(0, 1000)
  } catch {
    if (String(value).startsWith('/api/profile/assets/')) return String(value)
    return ''
  }
}

function cleanProfilePayload(body) {
  const result = pick(body, PROFILE_FIELDS)
  for (const field of ['profilePhoto', 'coverBanner']) {
    if (result[field] !== undefined) result[field] = safeUrl(result[field])
  }
  if (result.displayName !== undefined) result.displayName = String(result.displayName).trim().slice(0, 120)
  if (result.headline !== undefined) result.headline = String(result.headline).trim().slice(0, 180)
  if (result.bio !== undefined) result.bio = String(result.bio).trim().slice(0, 2000)
  if (result.location !== undefined) result.location = String(result.location).trim().slice(0, 200)
  if (result.languages !== undefined) result.languages = Array.isArray(result.languages) ? result.languages.slice(0, 20).map((item) => String(item).trim().slice(0, 80)).filter(Boolean) : []
  if (result.links !== undefined) result.links = Array.isArray(result.links) ? result.links.slice(0, 12).map((item) => ({
    label: String(item.label || '').trim().slice(0, 80),
    url: safeUrl(item.url),
  })).filter((item) => item.label && item.url) : []
  if (result.academic !== undefined) {
    const academic = result.academic || {}
    result.academic = {
      institution: String(academic.institution || '').trim().slice(0, 200),
      department: String(academic.department || '').trim().slice(0, 200),
      course: String(academic.course || '').trim().slice(0, 200),
      semester: String(academic.semester || '').trim().slice(0, 40),
      year: String(academic.year || '').trim().slice(0, 40),
      cgpa: Math.max(0, Math.min(10, Number(academic.cgpa) || 0)),
      completedCourses: Array.isArray(academic.completedCourses) ? academic.completedCourses.slice(0, 100).map((item) => String(item).trim().slice(0, 200)).filter(Boolean) : [],
      activeCourses: Array.isArray(academic.activeCourses) ? academic.activeCourses.slice(0, 100).map((item) => String(item).trim().slice(0, 200)).filter(Boolean) : [],
    }
  }
  if (result.careerDirection !== undefined && result.careerDirection && typeof result.careerDirection === 'object') {
    result.careerDirection = {
      targetRole: String(result.careerDirection.targetRole || '').trim().slice(0, 120),
      interests: Array.isArray(result.careerDirection.interests)
        ? result.careerDirection.interests.slice(0, 12).map((item) => String(item).trim().slice(0, 80)).filter(Boolean)
        : [],
      visibility: ['private', 'unlisted', 'public'].includes(result.careerDirection.visibility)
        ? result.careerDirection.visibility
        : 'public',
    }
  }
  return result
}

async function uniqueUsername(name, userId) {
  const base = slugify(name) || 'student'
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const username = attempt === 0 ? `${base}-${String(userId).slice(-5)}` : `${base}-${crypto.randomBytes(2).toString('hex')}`
    if (!RESERVED.has(username) && !await StudentProfile.exists({ username })) return username
  }
  return `student-${crypto.randomBytes(6).toString('hex')}`
}

async function ensureProfile(userId) {
  let profile = await StudentProfile.findOne({ userId })
  if (profile) return profile
  const user = await User.findById(userId).select('name profileImage certificates')
  if (!user) return null
  try {
    profile = await StudentProfile.create({
      userId,
      username: await uniqueUsername(user.name, userId),
      displayName: user.name,
      profilePhoto: user.profileImage || '',
      credentials: (user.certificates || []).slice(0, 100).map((item) => ({
        title: item.title,
        category: item.type === 'skill' ? 'skill' : 'other',
        issuer: 'Dream Wave (legacy)',
        documentUrl: safeUrl(item.url),
        issuedAt: item.issuedAt,
        verificationStatus: 'unverified',
        visibility: 'private',
      })),
    })
  } catch (error) {
    if (error.code !== 11000) throw error
    profile = await StudentProfile.findOne({ userId })
  }
  return profile
}

async function learningSummary(userId, profile) {
  const [goals, tasks, roadmaps, reading, focus] = await Promise.all([
    Goal.find({ userId }).select('status completed progress').lean(),
    Task.find({ userId, status: { $ne: 'archived' } }).select('status completed actualMinutes').lean(),
    Roadmap.find({ userId, status: { $ne: 'archived' } }).select('status progress').lean(),
    LibraryProgress.find({ userId }).select('percent readingMinutes').lean(),
    FocusSession.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(String(userId)), status: 'completed' } },
      { $group: { _id: null, seconds: { $sum: '$durationSeconds' } } },
    ]),
  ])
  const completedGoals = goals.filter((item) => item.completed || item.status === 'completed').length
  const completedTasks = tasks.filter((item) => item.completed || item.status === 'completed').length
  const booksRead = reading.filter((item) => item.percent >= 100).length
  const readingMinutes = reading.reduce((sum, item) => sum + (item.readingMinutes || 0), 0)
  const focusMinutes = Math.round((focus[0]?.seconds || 0) / 60)
  return {
    goals: { total: goals.length, completed: completedGoals, active: goals.filter((item) => item.status === 'active').length },
    roadmaps: { total: roadmaps.length, completed: roadmaps.filter((item) => item.progress?.percent >= 100).length },
    books: { started: reading.filter((item) => item.percent > 0).length, read: booksRead, readingMinutes },
    tasks: { total: tasks.length, completed: completedTasks },
    certificates: profile?.credentials?.length || 0,
    projects: profile?.projects?.length || 0,
    learningMinutes: readingMinutes + focusMinutes,
    learningHours: Math.round((readingMinutes + focusMinutes) / 6) / 10,
  }
}

function privateUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    aaid: user.aaid,
    level: user.level || 1,
    credits: user.credits || 0,
    streak: user.streak || 0,
    profileImage: user.profileImage || '',
    emailVerified: Boolean(user.emailVerified),
    phoneVerified: Boolean(user.phoneVerified),
  }
}

exports.getProfile = async (req, res) => {
  try {
    const [user, profile] = await Promise.all([
      User.findById(req.user._id || req.user.id).select('name email phone aaid level credits streak profileImage emailVerified phoneVerified').lean(),
      ensureProfile(req.user._id || req.user.id),
    ])
    if (!user || !profile) return fail(res, 404, 'Student profile not found', 'NOT_FOUND')
    const summary = await learningSummary(user._id, profile)
    return res.json({ success: true, user: privateUser(user), profile, summary })
  } catch (error) {
    console.error('[profile.get]', error.message)
    return fail(res, 500, 'Failed to load student profile')
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const profile = await ensureProfile(userId)
    if (!profile) return fail(res, 404, 'Student profile not found', 'NOT_FOUND')
    if (req.body.revision && Number(req.body.revision) !== profile.revision) return fail(res, 409, 'Profile changed in another session', 'REVISION_CONFLICT')
    const updates = cleanProfilePayload(req.body)
    Object.assign(profile, updates)
    if (req.body.username !== undefined) {
      const username = slugify(req.body.username)
      if (username.length < 3 || RESERVED.has(username)) return fail(res, 400, 'Choose a different username', 'VALIDATION_ERROR')
      if (await StudentProfile.exists({ username, _id: { $ne: profile._id } })) return fail(res, 409, 'Username is already taken', 'USERNAME_TAKEN')
      if (profile.username !== username && profile.usernameChangedAt) {
        const daysSinceChange = (Date.now() - new Date(profile.usernameChangedAt).getTime()) / 86400000
        if (daysSinceChange < 14) return fail(res, 429, 'Username can be changed again after 14 days', 'USERNAME_RATE_LIMIT')
      }
      if (profile.username !== username) profile.usernameChangedAt = new Date()
      profile.username = username
    }
    profile.revision += 1
    await profile.save()
    if (updates.displayName) await User.updateOne({ _id: userId }, { $set: { name: updates.displayName } })
    if (updates.profilePhoto) await User.updateOne({ _id: userId }, { $set: { profileImage: updates.profilePhoto } })
    return res.json({ success: true, profile })
  } catch (error) {
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    console.error('[profile.update]', error.message)
    return fail(res, 500, 'Failed to update profile')
  }
}

exports.updatePrivacy = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    const allowed = ['visibility', 'discoverable', 'showEmail', 'showPhone', 'showAcademic', 'showLearning', 'showSkills', 'showProjects', 'showAchievements', 'showCredentials', 'showExperience', 'showCareer', 'showLinks']
    Object.assign(profile.privacy, pick(req.body, allowed))
    if (!['private', 'unlisted', 'public'].includes(profile.privacy.visibility)) return fail(res, 400, 'Invalid profile visibility', 'VALIDATION_ERROR')
    if (profile.privacy.visibility !== 'public') profile.privacy.discoverable = false
    profile.revision += 1
    await profile.save()
    return res.json({ success: true, privacy: profile.privacy, revision: profile.revision })
  } catch (error) {
    return fail(res, 500, 'Failed to update privacy')
  }
}

exports.updatePreferences = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    const allowed = ['theme', 'language', 'emailNotifications', 'pushNotifications', 'weeklySummary']
    Object.assign(profile.preferences, pick(req.body, allowed))
    profile.revision += 1
    await profile.save()
    return res.json({ success: true, preferences: profile.preferences, revision: profile.revision })
  } catch (error) {
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    return fail(res, 500, 'Failed to update preferences')
  }
}

function cleanEntity(section, body) {
  if (section === 'skills') return {
    name: String(body.name || '').trim().slice(0, 100),
    type: body.type,
    proficiency: Math.max(0, Math.min(100, Number(body.proficiency) || 0)),
    years: Math.max(0, Math.min(80, Number(body.years) || 0)),
    visibility: body.visibility,
  }
  if (section === 'projects') return {
    title: String(body.title || '').trim().slice(0, 200),
    description: String(body.description || '').trim().slice(0, 5000),
    technologies: Array.isArray(body.technologies) ? body.technologies.slice(0, 30).map((item) => String(item).trim().slice(0, 80)).filter(Boolean) : [],
    githubUrl: safeUrl(body.githubUrl),
    demoUrl: safeUrl(body.demoUrl),
    screenshots: Array.isArray(body.screenshots) ? body.screenshots.slice(0, 12).map(safeUrl).filter(Boolean) : [],
    status: body.status,
    startedAt: body.startedAt || undefined,
    completedAt: body.completedAt || undefined,
    featured: Boolean(body.featured),
    visibility: body.visibility,
    goalId: body.goalId || undefined,
    roadmapId: body.roadmapId || undefined,
  }
  if (section === 'achievements') return {
    title: String(body.title || '').trim().slice(0, 200),
    type: body.type,
    issuer: String(body.issuer || '').trim().slice(0, 200),
    description: String(body.description || '').trim().slice(0, 3000),
    evidenceUrl: safeUrl(body.evidenceUrl),
    awardedAt: body.awardedAt || undefined,
    featured: Boolean(body.featured),
    visibility: body.visibility,
    verified: false,
    relatedProjectId: String(body.relatedProjectId || '').slice(0, 80),
    relatedSkill: String(body.relatedSkill || '').trim().slice(0, 100),
    shareToCommunity: Boolean(body.shareToCommunity),
  }
  if (section === 'academicJourney') return {
    level: body.level,
    institution: String(body.institution || '').trim().slice(0, 200),
    program: String(body.program || '').trim().slice(0, 200),
    specialization: String(body.specialization || '').trim().slice(0, 200),
    startYear: body.startYear ? Math.max(1950, Math.min(2100, Number(body.startYear))) : undefined,
    endYear: body.endYear ? Math.max(1950, Math.min(2100, Number(body.endYear))) : undefined,
    status: body.status,
    visibility: body.visibility,
    verified: false,
  }
  if (section === 'experience') return {
    title: String(body.title || '').trim().slice(0, 200),
    organization: String(body.organization || '').trim().slice(0, 200),
    type: body.type,
    description: String(body.description || '').trim().slice(0, 3000),
    startDate: body.startDate || undefined,
    endDate: body.endDate || undefined,
    current: Boolean(body.current),
    visibility: body.visibility,
  }
  return {
    title: String(body.title || '').trim().slice(0, 200),
    category: body.category,
    issuer: String(body.issuer || '').trim().slice(0, 200),
    credentialId: String(body.credentialId || '').trim().slice(0, 200),
    verificationUrl: safeUrl(body.verificationUrl),
    documentUrl: safeUrl(body.documentUrl),
    skills: Array.isArray(body.skills) ? body.skills.slice(0, 30).map((item) => String(item).trim().slice(0, 100)).filter(Boolean) : [],
    issuedAt: body.issuedAt || undefined,
    expiresAt: body.expiresAt || undefined,
    verificationStatus: 'unverified',
    visibility: body.visibility,
    featured: Boolean(body.featured),
    visibility: body.visibility,
    fileHash: String(body.fileHash || '').slice(0, 128),
  }
}

async function validateProjectLinks(data, userId) {
  if (data.goalId) {
    if (!mongoose.isValidObjectId(data.goalId) || !await Goal.exists({ _id: data.goalId, userId })) throw Object.assign(new Error('Linked goal not found'), { statusCode: 404 })
  }
  if (data.roadmapId) {
    if (!mongoose.isValidObjectId(data.roadmapId) || !await Roadmap.exists({ _id: data.roadmapId, userId, ...(data.goalId ? { goalId: data.goalId } : {}) })) throw Object.assign(new Error('Linked roadmap not found'), { statusCode: 404 })
  }
}

exports.addEntity = async (req, res) => {
  try {
    const section = req.params.section
    if (!SECTIONS[section]) return fail(res, 404, 'Profile section not found', 'NOT_FOUND')
    const profile = await ensureProfile(req.user._id || req.user.id)
    if (profile[section].length >= SECTIONS[section].max) return fail(res, 400, `Maximum ${section} reached`, 'LIMIT_REACHED')
    const data = cleanEntity(section, req.body)
    if (SECTIONS[section].required.some((field) => !data[field])) return fail(res, 400, 'Required fields are missing', 'VALIDATION_ERROR')
    if (section === 'projects') await validateProjectLinks(data, profile.userId)
    if (section === 'credentials') {
      const duplicate = profilePortfolioService.findDuplicateCredential(profile, data)
      if (duplicate) return fail(res, 409, 'This certificate appears to already exist in your vault', 'DUPLICATE_CREDENTIAL')
    }
    profile[section].push(data)
    profile.revision += 1
    await profile.save()
    return res.status(201).json({ success: true, item: profile[section][profile[section].length - 1], revision: profile.revision })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, 'NOT_FOUND')
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    return fail(res, 500, 'Failed to add profile item')
  }
}

exports.updateEntity = async (req, res) => {
  try {
    const section = req.params.section
    if (!SECTIONS[section] || !mongoose.isValidObjectId(req.params.itemId)) return fail(res, 404, 'Profile item not found', 'NOT_FOUND')
    const profile = await ensureProfile(req.user._id || req.user.id)
    const item = profile[section].id(req.params.itemId)
    if (!item) return fail(res, 404, 'Profile item not found', 'NOT_FOUND')
    const data = cleanEntity(section, { ...item.toObject(), ...req.body })
    if (section === 'projects') await validateProjectLinks(data, profile.userId)
    Object.assign(item, data)
    profile.revision += 1
    await profile.save()
    return res.json({ success: true, item, revision: profile.revision })
  } catch (error) {
    if (error.statusCode) return fail(res, error.statusCode, error.message, 'NOT_FOUND')
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    return fail(res, 500, 'Failed to update profile item')
  }
}

exports.deleteEntity = async (req, res) => {
  try {
    const section = req.params.section
    if (!SECTIONS[section] || !mongoose.isValidObjectId(req.params.itemId)) return fail(res, 404, 'Profile item not found', 'NOT_FOUND')
    const profile = await ensureProfile(req.user._id || req.user.id)
    const item = profile[section].id(req.params.itemId)
    if (!item) return fail(res, 404, 'Profile item not found', 'NOT_FOUND')
    item.deleteOne()
    profile.revision += 1
    await profile.save()
    return res.json({ success: true, revision: profile.revision })
  } catch (error) {
    return fail(res, 500, 'Failed to delete profile item')
  }
}

exports.getSummary = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    return res.json({ success: true, summary: await learningSummary(profile.userId, profile) })
  } catch (error) {
    return fail(res, 500, 'Failed to load learning profile')
  }
}

async function buildGraph(userId, profile, publicOnly = false) {
  const [goals, tasks, roadmaps, reading] = await Promise.all([
    Goal.find({ userId }).select('title category status progress').limit(100).lean(),
    Task.find({ userId, status: { $ne: 'archived' } }).select('title status goalId roadmapId tags').limit(200).lean(),
    Roadmap.find({ userId, status: { $ne: 'archived' } }).select('goalId status progress learningStages').limit(100).lean(),
    LibraryProgress.find({ userId, percent: { $gt: 0 } }).populate('bookId', 'title category status').limit(100).lean(),
  ])
  const nodes = [{ id: 'profile', type: 'profile', label: profile.displayName || 'Student profile', visibility: profile.privacy.visibility }]
  const edges = []
  const add = (id, type, label, visibility = 'private', data = {}) => {
    if (publicOnly && visibility !== 'public') return false
    nodes.push({ id, type, label, visibility, ...data })
    edges.push({ source: 'profile', target: id, type: `HAS_${type.toUpperCase()}` })
    return true
  }
  profile.skills.forEach((item) => add(`skill:${item._id}`, 'skill', item.name, item.visibility, { mastery: item.proficiency }))
  profile.projects.forEach((item) => {
    if (!add(`project:${item._id}`, 'project', item.title, item.visibility, { status: item.status })) return
    item.technologies.forEach((technology) => {
      const skill = profile.skills.find((candidate) => candidate.name.toLowerCase() === technology.toLowerCase())
      if (skill && (!publicOnly || skill.visibility === 'public')) edges.push({ source: `project:${item._id}`, target: `skill:${skill._id}`, type: 'USES_SKILL' })
    })
    if (item.goalId && !publicOnly) edges.push({ source: `project:${item._id}`, target: `goal:${item.goalId}`, type: 'SUPPORTS_GOAL' })
    if (item.roadmapId && !publicOnly) edges.push({ source: `project:${item._id}`, target: `roadmap:${item.roadmapId}`, type: 'IMPLEMENTS_ROADMAP' })
  })
  profile.achievements.forEach((item) => add(`achievement:${item._id}`, 'achievement', item.title, item.visibility, { verified: item.verified }))
  profile.credentials.forEach((item) => add(`credential:${item._id}`, 'credential', item.title, item.visibility, { verificationStatus: item.verificationStatus }))
  if (!publicOnly) {
    goals.forEach((item) => add(`goal:${item._id}`, 'goal', item.title, 'private', { status: item.status, progress: item.progress }))
    roadmaps.forEach((item) => {
      add(`roadmap:${item._id}`, 'roadmap', `Roadmap: ${item.status}`, 'private', { progress: item.progress?.percent || 0 })
      edges.push({ source: `roadmap:${item._id}`, target: `goal:${item.goalId}`, type: 'ADVANCES_GOAL' })
    })
    tasks.forEach((item) => {
      add(`task:${item._id}`, 'task', item.title, 'private', { status: item.status })
      if (item.goalId) edges.push({ source: `task:${item._id}`, target: `goal:${item.goalId}`, type: 'ADVANCES_GOAL' })
      if (item.roadmapId) edges.push({ source: `task:${item._id}`, target: `roadmap:${item.roadmapId}`, type: 'PART_OF_ROADMAP' })
    })
    reading.forEach((item) => {
      if (!item.bookId || item.bookId.status !== 'active') return
      add(`book:${item.bookId._id}`, 'book', item.bookId.title, 'private', { progress: item.percent })
    })
  }
  return {
    schemaVersion: 'student-knowledge-graph-v1',
    entityTypes: ['profile', 'goal', 'book', 'task', 'roadmap', 'credential', 'project', 'skill', 'career', 'mentor'],
    nodes,
    edges,
    generatedAt: new Date(),
  }
}

exports.getKnowledgeGraph = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    return res.json({ success: true, graph: await buildGraph(profile.userId, profile) })
  } catch (error) {
    return fail(res, 500, 'Failed to load knowledge graph')
  }
}

exports.getPublicPortfolio = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ username: String(req.params.username || '').toLowerCase() }).lean()
    if (!profile || profile.privacy.visibility === 'private') return fail(res, 404, 'Portfolio not found', 'NOT_FOUND')
    const user = await User.findById(profile.userId).select('name email phone level streak').lean()
    if (!user) return fail(res, 404, 'Portfolio not found', 'NOT_FOUND')
    const summary = profile.privacy.showLearning ? await learningSummary(profile.userId, profile) : undefined
    const graph = await buildGraph(profile.userId, profile, true)
    await StudentProfile.updateOne({ _id: profile._id }, { $inc: { viewCount: 1 } })
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
    res.set('Last-Modified', new Date(profile.updatedAt).toUTCString())
    res.set('ETag', `"portfolio-${profile._id}-${new Date(profile.updatedAt).getTime()}"`)
    return res.json({
      success: true,
      portfolio: profilePortfolioService.buildPublicPortfolioDTO(profile, user, { summary, graph }),
    })
  } catch (error) {
    console.error('[profile.public]', error.message)
    return fail(res, 500, 'Failed to load portfolio')
  }
}

exports.getPublicPreview = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    const user = await User.findById(profile.userId).select('name email phone level streak').lean()
    const summary = profile.privacy.showLearning ? await learningSummary(profile.userId, profile) : undefined
    const graph = await buildGraph(profile.userId, profile.toObject(), true)
    const previewProfile = {
      ...profile.toObject(),
      privacy: {
        ...profile.privacy.toObject(),
        visibility: profile.privacy.visibility === 'private' ? 'unlisted' : profile.privacy.visibility,
      },
    }
    return res.json({
      success: true,
      portfolio: profilePortfolioService.buildPublicPortfolioDTO(previewProfile, user, { summary, graph }),
      preview: true,
    })
  } catch (error) {
    return fail(res, 500, 'Failed to load public preview')
  }
}

exports.getCompleteness = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    return res.json({
      success: true,
      completeness: profilePortfolioService.computeCompleteness(profile),
      recommendations: profilePortfolioService.buildRecommendations(profile),
    })
  } catch (error) {
    return fail(res, 500, 'Failed to load profile completeness')
  }
}

exports.updatePortfolio = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    if (req.body.revision && Number(req.body.revision) !== profile.revision) return fail(res, 409, 'Profile changed in another session', 'REVISION_CONFLICT')
    if (!profile.portfolio) profile.portfolio = {}
    const payload = profilePortfolioService.cleanPortfolioPayload(req.body)
    if (payload.sectionOrder) profile.sectionOrder = payload.sectionOrder
    if (payload.careerDirection) Object.assign(profile.careerDirection, payload.careerDirection)
    for (const [key, value] of Object.entries(payload)) {
      if (key.startsWith('portfolio.')) {
        const path = key.replace('portfolio.', '').split('.')
        if (path.length === 1) profile.portfolio[path[0]] = value
        else if (path.length === 2) profile.portfolio[path[0]][path[1]] = value
      }
    }
    profile.revision += 1
    await profile.save()
    return res.json({ success: true, profile, revision: profile.revision })
  } catch (error) {
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    return fail(res, 500, 'Failed to update portfolio settings')
  }
}

exports.reorderProjects = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    const order = Array.isArray(req.body.projectOrder) ? req.body.projectOrder.map(String) : []
    profile.portfolio.projectOrder = order.slice(0, 50)
    order.forEach((id, index) => {
      const project = profile.projects.id(id)
      if (project) project.sortOrder = index
    })
    profile.revision += 1
    await profile.save()
    return res.json({ success: true, projectOrder: profile.portfolio.projectOrder, revision: profile.revision })
  } catch (error) {
    return fail(res, 500, 'Failed to reorder projects')
  }
}

exports.getShareInfo = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    if (profile.privacy.visibility === 'private') return fail(res, 400, 'Enable unlisted or public visibility before sharing', 'VALIDATION_ERROR')
    const base = process.env.CLIENT_ORIGIN || process.env.APP_URL || 'http://localhost:5173'
    const shareUrl = `${String(base).replace(/\/$/, '')}/students/${profile.username}`
    return res.json({ success: true, share: { url: shareUrl, username: profile.username, visibility: profile.privacy.visibility } })
  } catch (error) {
    return fail(res, 500, 'Failed to build share info')
  }
}

exports.improveHeadline = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    const suggestion = await profileIntelligence.improveHeadline({
      headline: req.body.headline || profile.headline,
      bio: req.body.bio || profile.bio,
      skills: (profile.skills || []).map((item) => item.name),
      targetRole: profile.careerDirection?.targetRole,
    })
    return res.json({ success: true, suggestion })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.improveAbout = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    const suggestion = await profileIntelligence.improveAbout({
      bio: req.body.bio || profile.bio,
      headline: profile.headline,
      skills: profile.skills,
      projects: profile.projects,
    })
    return res.json({ success: true, suggestion })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.improveProjectDescription = async (req, res) => {
  try {
    const suggestion = await profileIntelligence.improveProjectDescription({
      title: req.body.title,
      description: req.body.description,
      technologies: req.body.technologies,
    })
    return res.json({ success: true, suggestion })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.portfolioSuggestions = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user._id || req.user.id)
    const suggestion = await profileIntelligence.portfolioSuggestions({ profile: profile.toObject() })
    return res.json({ success: true, suggestion })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}


exports.uploadProfileAsset = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, 'No file uploaded', 'VALIDATION_ERROR')
    const purpose = req.body.purpose || 'profile-photo'
    const allowed = purpose === 'credential'
      ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      : ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(req.file.mimetype)) return fail(res, 400, 'Unsupported file type', 'VALIDATION_ERROR')
    const signatures = {
      'image/jpeg': [0xff, 0xd8, 0xff],
      'image/png': [0x89, 0x50, 0x4e, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
    }
    if (!signatures[req.file.mimetype].every((byte, index) => req.file.buffer[index] === byte)) return fail(res, 400, 'File content does not match its type', 'VALIDATION_ERROR')
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[req.file.mimetype]
    const filename = `${crypto.randomBytes(24).toString('hex')}.${extension}`
    fs.mkdirSync(ASSET_ROOT, { recursive: true })
    await fs.promises.writeFile(path.join(ASSET_ROOT, filename), req.file.buffer, { flag: 'wx' })
    const url = `/api/profile/assets/${filename}`
    const fileHash = purpose === 'credential' ? profilePortfolioService.hashBuffer(req.file.buffer) : ''
    if (purpose === 'profile-photo' || purpose === 'cover-banner') {
      const profile = await ensureProfile(req.user._id || req.user.id)
      if (purpose === 'profile-photo') {
        profile.profilePhoto = url
        await User.updateOne({ _id: profile.userId }, { $set: { profileImage: url } })
      } else profile.coverBanner = url
      profile.revision += 1
      await profile.save()
    }
    return res.status(201).json({ success: true, asset: { url, mime: req.file.mimetype, size: req.file.size, purpose, fileHash } })
  } catch (error) {
    console.error('[profile.upload]', error.message)
    return fail(res, 500, 'Failed to store profile asset')
  }
}

exports.getProfileAsset = async (req, res) => {
  try {
    const filename = String(req.params.filename || '')
  if (!/^[a-f0-9]{48}\.(jpg|png|webp|pdf)$/.test(filename)) return fail(res, 404, 'Asset not found', 'NOT_FOUND')
  const assetUrl = `/api/profile/assets/${filename}`
  const ownerId = req.user?.role === 'student' ? req.user._id || req.user.id : null
  const ownerProfile = ownerId
    ? await StudentProfile.findOne({
      userId: ownerId,
      $or: [{ profilePhoto: assetUrl }, { coverBanner: assetUrl }, { 'credentials.documentUrl': assetUrl }],
    }).select('_id').lean()
    : null
  const publicProfile = ownerProfile ? null : await StudentProfile.findOne({
    $or: [
      { profilePhoto: assetUrl },
      { coverBanner: assetUrl },
      {
        'privacy.visibility': { $in: ['public', 'unlisted'] },
        'privacy.showCredentials': true,
        credentials: { $elemMatch: { documentUrl: assetUrl, visibility: 'public' } },
      },
    ],
  }).select('_id').lean()
  if (!ownerProfile && !publicProfile) return fail(res, 404, 'Asset not found', 'NOT_FOUND')
  const filePath = path.join(ASSET_ROOT, filename)
  if (!fs.existsSync(filePath)) return fail(res, 404, 'Asset not found', 'NOT_FOUND')
  const extension = path.extname(filename)
  const mime = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' }[extension]
  res.set('Content-Type', mime)
  res.set('Cache-Control', publicProfile ? 'public, max-age=31536000, immutable' : 'private, no-store')
  res.set('X-Content-Type-Options', 'nosniff')
    return fs.createReadStream(filePath).pipe(res)
  } catch (error) {
    console.error('[profile.asset]', error.message)
    return fail(res, 500, 'Failed to load profile asset')
  }
}

exports.generateCertificate = async (req, res) => fail(res, 410, 'Self-issued certificates are disabled. Import a credential with issuer evidence instead.', 'CREDENTIAL_TRUST_REQUIRED')
