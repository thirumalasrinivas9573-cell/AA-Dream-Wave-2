const LibraryBook = require('../models/LibraryBook')
const LibraryProgress = require('../models/LibraryProgress')
const Course = require('../models/Course')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const Job = require('../models/Job')
const Internship = require('../models/Internship')
const CompanyProfile = require('../models/CompanyProfile')
const Institution = require('../models/Institution')
const StudentProfile = require('../models/StudentProfile')
const UserProfile = require('../models/UserProfile')

const PROVIDERS = {
  books: recommendBooks,
  skills: recommendSkills,
  courses: recommendCourses,
  goals: recommendGoals,
  roadmaps: recommendRoadmaps,
  career: recommendCareer,
  internships: recommendInternships,
}

async function buildRecommendationContext(userId) {
  const [
    studentProfile,
    aiProfile,
    goals,
    tasks,
    progress,
    approvedCompanies,
    approvedInstitutions,
  ] = await Promise.all([
    StudentProfile.findOne({ userId }).select('skills headline credentials').lean(),
    UserProfile.findOne({ userId }).select('interests skills targetRole preferredTopics careerPreferences').lean(),
    Goal.find({ userId, status: { $in: ['active', 'in_progress'] } }).sort('-updatedAt').limit(12).lean(),
    Task.find({ userId, status: { $in: ['pending', 'in_progress', 'todo'] } }).sort('-updatedAt').limit(30).lean(),
    LibraryProgress.find({ userId }).sort('-lastReadAt').limit(12).populate('bookId', 'title category tags').lean(),
    CompanyProfile.find({ status: 'approved', isPublic: true }).distinct('_id'),
    Institution.find({ status: 'approved', isPublic: true }).distinct('_id'),
  ])

  const categories = [...new Set(progress.map((item) => item.bookId?.category).filter(Boolean))]
  const skillNames = [
    ...(studentProfile?.skills || []).map((item) => item.name),
    ...(aiProfile?.skills || []),
  ].filter(Boolean)
  const interests = [...(aiProfile?.interests || []), ...(aiProfile?.preferredTopics || [])]
  const keywords = [...new Set([...skillNames, ...interests, ...categories])].slice(0, 16)

  return {
    userId,
    studentProfile,
    aiProfile,
    goals,
    tasks,
    progress,
    approvedCompanies,
    approvedInstitutions,
    categories,
    skillNames,
    interests,
    keywords,
  }
}

async function recommendBooks(userId, ctx = null) {
  const context = ctx || await buildRecommendationContext(userId)
  const readIds = new Set(context.progress.map((item) => String(item.bookId?._id || item.bookId)).filter(Boolean))
  const filter = { status: 'active' }
  if (context.categories.length) filter.category = { $in: context.categories }

  let books = await LibraryBook.find(filter).sort('-saves -views -updatedAt').limit(10).lean()
  if (context.keywords.length) {
    try {
      const boosted = await LibraryBook.find({
        status: 'active',
        $text: { $search: context.keywords.slice(0, 6).join(' ') },
      }).limit(6).lean()
      const seen = new Set(books.map((item) => String(item._id)))
      boosted.forEach((item) => { if (!seen.has(String(item._id))) books.unshift(item) })
    } catch { /* text index optional */ }
  }

  const items = books
    .filter((item) => !readIds.has(String(item._id)))
    .slice(0, 8)
    .map((item) => ({
      id: String(item._id),
      title: item.title,
      subtitle: item.author,
      category: item.category,
      url: `/library/books/${item._id}`,
      coverUrl: item.coverUrl,
    }))

  return {
    provider: 'books',
    aiReady: true,
    reason: context.categories.length
      ? `Based on your reading in ${context.categories.slice(0, 3).join(', ')}`
      : 'Popular books aligned with your learning journey',
    items,
  }
}

async function recommendSkills(userId, ctx = null) {
  const context = ctx || await buildRecommendationContext(userId)
  const existing = new Set(context.skillNames.map((item) => item.toLowerCase()))
  const goalSkills = context.goals.flatMap((goal) => (goal.skills || []).map((item) => item.name || item)).filter(Boolean)
  const taskTags = context.tasks.flatMap((task) => task.tags || []).filter(Boolean)
  const candidates = [...new Set([
    ...goalSkills,
    ...taskTags,
    ...(context.aiProfile?.careerPreferences?.roles || []),
    'Communication',
    'Problem Solving',
    'Data Structures',
    'System Design',
    'Leadership',
  ])].filter((item) => !existing.has(String(item).toLowerCase()))

  const items = candidates.slice(0, 6).map((name) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    title: name,
    subtitle: 'Skill growth opportunity',
    url: '/student/learn',
  }))

  return {
    provider: 'skills',
    aiReady: true,
    reason: context.skillNames.length
      ? `Complements your current skills: ${context.skillNames.slice(0, 4).join(', ')}`
      : 'Starter skills based on your goals and tasks',
    items,
  }
}

async function recommendCourses(userId, ctx = null) {
  const context = ctx || await buildRecommendationContext(userId)
  const filter = {
    institutionId: { $in: context.approvedInstitutions },
    status: 'active',
  }
  let courses = await Course.find(filter).sort('-enrolled -updatedAt').limit(8).lean()
  if (context.keywords.length) {
    try {
      const boosted = await Course.find({
        ...filter,
        $text: { $search: context.keywords.slice(0, 5).join(' ') },
      }).limit(4).lean()
      const seen = new Set(courses.map((item) => String(item._id)))
      boosted.forEach((item) => { if (!seen.has(String(item._id))) courses.unshift(item) })
    } catch { /* optional */ }
  }

  const items = courses.slice(0, 8).map((item) => ({
    id: String(item._id),
    title: item.title,
    subtitle: item.level || item.category,
    url: '/search?type=courses',
    skills: item.skills || [],
  }))

  return {
    provider: 'courses',
    aiReady: true,
    reason: context.goals.length
      ? `Aligned with goals: ${context.goals.slice(0, 2).map((g) => g.title).join(', ')}`
      : 'Top courses from approved institutions',
    items,
  }
}

async function recommendGoals(userId, ctx = null) {
  const context = ctx || await buildRecommendationContext(userId)
  const activeTitles = new Set(context.goals.map((item) => item.title.toLowerCase()))
  const suggestions = [
    { title: 'Build a weekly learning routine', category: 'habits' },
    { title: 'Complete one certification this quarter', category: 'credentials' },
    { title: 'Ship a portfolio project', category: 'career' },
    { title: 'Read 3 industry books', category: 'reading' },
  ].filter((item) => !activeTitles.has(item.title.toLowerCase()))

  const items = suggestions.slice(0, 4).map((item) => ({
    id: item.title.toLowerCase().replace(/\s+/g, '-'),
    title: item.title,
    subtitle: item.category,
    url: '/student/goals',
  }))

  return {
    provider: 'goals',
    aiReady: true,
    reason: 'Suggested goals based on your activity patterns',
    items,
  }
}

async function recommendRoadmaps(userId, ctx = null) {
  const context = ctx || await buildRecommendationContext(userId)
  const roadmaps = await Roadmap.find({ userId, status: { $ne: 'archived' } })
    .populate('goalId', 'title description')
    .sort('-updatedAt')
    .limit(6)
    .lean()

  const items = roadmaps.map((item) => ({
    id: String(item._id),
    title: item.goalId?.title ? `${item.goalId.title} Roadmap` : 'Learning Roadmap',
    subtitle: `${item.status} · ${item.progress?.percent || 0}%`,
    url: `/student/roadmap?goalId=${item.goalId?._id || ''}`,
    progress: item.progress?.percent || 0,
  }))

  if (!items.length && context.goals[0]) {
    items.push({
      id: String(context.goals[0]._id),
      title: `Start roadmap for ${context.goals[0].title}`,
      subtitle: 'No roadmap yet',
      url: `/student/roadmap?goalId=${context.goals[0]._id}`,
    })
  }

  return {
    provider: 'roadmaps',
    aiReady: true,
    reason: items.length ? 'Continue your active learning roadmaps' : 'Create a roadmap from your top goal',
    items,
  }
}

async function recommendCareer(userId, ctx = null) {
  const context = ctx || await buildRecommendationContext(userId)
  const targetRole = context.aiProfile?.targetRole || context.studentProfile?.headline || ''
  const filter = {
    companyId: { $in: context.approvedCompanies },
    status: 'open',
    $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: new Date() } }],
  }
  let jobs = await Job.find(filter).populate('companyId', 'name slug').sort('-createdAt').limit(8).lean()
  if (targetRole) {
    try {
      const boosted = await Job.find({
        ...filter,
        $or: [{ title: new RegExp(targetRole.split(/\s+/)[0], 'i') }, { skills: new RegExp(targetRole.split(/\s+/)[0], 'i') }],
      }).populate('companyId', 'name slug').limit(4).lean()
      const seen = new Set(jobs.map((item) => String(item._id)))
      boosted.forEach((item) => { if (!seen.has(String(item._id))) jobs.unshift(item) })
    } catch { /* optional */ }
  }

  const items = jobs.slice(0, 6).map((item) => ({
    id: String(item._id),
    title: item.title,
    subtitle: item.companyId?.name || 'Company',
    url: `/companies/jobs/${item._id}`,
    workMode: item.workMode,
  }))

  return {
    provider: 'career',
    aiReady: true,
    reason: targetRole ? `Opportunities near your target: ${targetRole}` : 'Open roles from verified companies',
    items,
  }
}

async function recommendInternships(userId, ctx = null) {
  const context = ctx || await buildRecommendationContext(userId)
  const internships = await Internship.find({
    companyId: { $in: context.approvedCompanies },
    status: 'open',
    $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: new Date() } }],
  }).populate('companyId', 'name slug').sort('-createdAt').limit(6).lean()

  const items = internships.map((item) => ({
    id: String(item._id),
    title: item.title,
    subtitle: item.companyId?.name || 'Company',
    url: `/companies/internships/${item._id}`,
    duration: item.duration,
  }))

  return {
    provider: 'internships',
    aiReady: true,
    reason: 'Internships matched to your career exploration',
    items,
  }
}

async function getRecommendations(userId, types = null, ctx = null) {
  const context = ctx || await buildRecommendationContext(userId)
  const selected = types?.length ? types.filter((name) => PROVIDERS[name]) : Object.keys(PROVIDERS)
  const entries = await Promise.all(selected.map(async (name) => {
    try {
      const payload = await PROVIDERS[name](userId, context)
      return [name, payload]
    } catch (error) {
      return [name, { provider: name, aiReady: true, items: [], reason: '', error: error.message }]
    }
  }))
  return Object.fromEntries(entries)
}

async function getProvider(name, userId, ctx = null) {
  const fn = PROVIDERS[name]
  if (!fn) throw new Error(`Unknown recommendation provider: ${name}`)
  return fn(userId, ctx)
}

module.exports = {
  PROVIDERS,
  buildRecommendationContext,
  getRecommendations,
  getProvider,
}
