const mongoose = require('mongoose')
const User = require('../models/User')
const UserProfile = require('../models/UserProfile')
const StudentProfile = require('../models/StudentProfile')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const LibraryReadingSession = require('../models/LibraryReadingSession')
const Bookmark = require('../models/Bookmark')
const Chat = require('../models/Chat')
const Application = require('../models/Application')
const recommendationEngine = require('./recommendationEngine')

const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

async function getOrCreateAiProfile(userId) {
  let profile = await UserProfile.findOne({ userId })
  if (!profile) profile = await UserProfile.create({ userId })
  return profile
}

async function buildActivitySnapshot(userId) {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const [
    user,
    studentProfile,
    aiProfile,
    goals,
    tasks,
    roadmaps,
    readingProgress,
    readingWeek,
    bookmarks,
    chats,
    applications,
  ] = await Promise.all([
    User.findById(userId).select('name streak credits level').lean(),
    StudentProfile.findOne({ userId }).lean(),
    getOrCreateAiProfile(userId),
    Goal.find({ userId }).sort('-updatedAt').limit(100).lean(),
    Task.find({ userId, status: { $ne: 'archived' } }).sort('-updatedAt').limit(200).lean(),
    Roadmap.find({ userId, status: { $ne: 'archived' } }).populate('goalId', 'title').limit(20).lean(),
    LibraryProgress.find({ userId, percent: { $gt: 0 } }).populate({ path: 'bookId', match: { status: 'active' }, select: 'title author category' }).sort('-lastReadAt').limit(20).lean(),
    LibraryReadingSession.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(String(userId)), startedAt: { $gte: weekStart } } },
      { $group: { _id: { $dayOfWeek: '$startedAt' }, minutes: { $sum: { $divide: ['$durationSeconds', 60] } } } },
    ]),
    Bookmark.find({ studentId: userId }).sort('-createdAt').limit(20).lean(),
    Chat.find({ userId }).select('session messages updatedAt').sort('-updatedAt').limit(10).lean(),
    Application.find({ studentId: userId }).sort('-updatedAt').limit(20).lean(),
  ])

  const completedTasks = tasks.filter((item) => item.completed || item.status === 'completed')
  const activeGoals = goals.filter((item) => item.status === 'active' || item.status === 'in_progress')
  const priorityGoals = [...activeGoals].sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 }
    return (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2)
  }).slice(0, 5)

  const recommendedTasks = tasks
    .filter((item) => !item.completed && item.status !== 'completed' && item.status !== 'archived')
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 }
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
      if (dueA !== dueB) return dueA - dueB
      return (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2)
    })
    .slice(0, 6)

  const books = readingProgress.filter((item) => item.bookId)
  const readingStats = readingWeek.reduce((acc, row) => {
    acc[row._id] = Math.round(row.minutes || 0)
    return acc
  }, {})

  const weeklyProgress = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => ({
    label,
    minutes: readingStats[index + 1] || 0,
  }))

  const skillGrowth = (studentProfile?.skills || []).slice(0, 8).map((skill) => ({
    name: skill.name,
    level: skill.level || skill.proficiency || 'learning',
    endorsements: skill.endorsements || 0,
  }))

  const knowledgeAreas = [...new Set([
    ...books.map((item) => item.bookId?.category).filter(Boolean),
    ...goals.map((item) => item.category).filter(Boolean),
    ...(aiProfile.preferredTopics || []),
  ])].slice(0, 8)

  const upcomingDeadlines = [
    ...tasks.filter((item) => item.dueDate && item.status !== 'completed').map((item) => ({
      id: String(item._id),
      title: item.title,
      type: 'task',
      dueDate: item.dueDate,
      url: `/student/tasks?taskId=${item._id}`,
    })),
    ...goals.filter((item) => item.deadline && item.status !== 'completed').map((item) => ({
      id: String(item._id),
      title: item.title,
      type: 'goal',
      dueDate: item.deadline,
      url: `/student/goals?goalId=${item._id}`,
    })),
  ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8)

  const goalProgress = average(goals.map((item) => Number(item.progress) || 0))
  const taskProgress = tasks.length ? (completedTasks.length / tasks.length) * 100 : 0
  const readingProgressPercent = average(books.map((item) => Number(item.percent) || 0))
  const learningProgress = Math.round(average([goalProgress, taskProgress, readingProgressPercent].filter(Number.isFinite)))

  return {
    user,
    studentProfile,
    aiProfile,
    goals,
    tasks,
    roadmaps,
    books,
    bookmarks,
    chats,
    applications,
    completedTasks,
    activeGoals,
    priorityGoals,
    recommendedTasks,
    weeklyProgress,
    skillGrowth,
    knowledgeAreas,
    upcomingDeadlines,
    learningProgress,
    readingMinutesWeek: weeklyProgress.reduce((sum, day) => sum + day.minutes, 0),
  }
}

function buildDailyBrief(snapshot, recommendations) {
  const name = snapshot.user?.name?.split(' ')[0] || 'there'
  const pendingTasks = snapshot.tasks.filter((item) => item.status !== 'completed' && !item.completed).length
  const nextBook = snapshot.books[0]?.bookId?.title
  const nextSkill = recommendations.skills?.items?.[0]?.title
  const lines = [
    pendingTasks ? `You have ${pendingTasks} open tasks.` : 'Your task queue is clear today.',
    snapshot.priorityGoals[0] ? `Top goal: ${snapshot.priorityGoals[0].title}.` : 'Set a priority goal to focus your week.',
    nextBook ? `Continue reading ${nextBook}.` : 'Explore a new book from your recommendations.',
    nextSkill ? `Skill focus: ${nextSkill}.` : null,
  ].filter(Boolean)

  return {
    greeting: `Hello ${name}`,
    summary: lines.join(' '),
    highlights: lines,
    generatedAt: new Date().toISOString(),
    aiReady: true,
  }
}

function buildLearningPlan(snapshot, recommendations) {
  const plan = []
  if (snapshot.priorityGoals[0]) {
    plan.push({
      id: 'goal-focus',
      title: `Advance: ${snapshot.priorityGoals[0].title}`,
      duration: '45 min',
      url: `/student/goals?goalId=${snapshot.priorityGoals[0]._id}`,
    })
  }
  snapshot.recommendedTasks.slice(0, 2).forEach((task) => {
    plan.push({
      id: String(task._id),
      title: task.title,
      duration: '30 min',
      url: `/student/tasks?taskId=${task._id}`,
    })
  })
  const book = recommendations.books?.items?.[0]
  if (book) {
    plan.push({
      id: book.id,
      title: `Read: ${book.title}`,
      duration: '25 min',
      url: book.url,
    })
  }
  const course = recommendations.courses?.items?.[0]
  if (course) {
    plan.push({
      id: course.id,
      title: `Course: ${course.title}`,
      duration: '40 min',
      url: course.url,
    })
  }
  return {
    title: "Today's Learning Plan",
    items: plan.slice(0, 5),
    aiReady: true,
  }
}

function buildInsightsArchitecture(snapshot) {
  const strongSkills = snapshot.skillGrowth.slice(0, 3).map((item) => item.name)
  const weakSkills = (snapshot.aiProfile?.skills || [])
    .filter((item) => !strongSkills.includes(item))
    .slice(0, 3)
    .map((item) => ({ name: item, signal: 'growth_opportunity' }))

  return {
    widgets: [
      {
        key: 'weak-skills',
        title: 'Weak Skill Detection',
        status: 'architecture',
        items: weakSkills.length ? weakSkills : [{ name: 'Add skills to your profile', signal: 'setup' }],
        integration: 'Plug scoring model into recommendationEngine.skills',
      },
      {
        key: 'strong-skills',
        title: 'Strong Skill Detection',
        status: 'architecture',
        items: strongSkills.map((name) => ({ name, signal: 'strength' })),
        integration: 'Derive from StudentProfile.skills + task completion',
      },
      {
        key: 'study-pattern',
        title: 'Study Pattern',
        status: 'architecture',
        items: [{ pattern: snapshot.weeklyProgress, signal: 'weekly_minutes' }],
        integration: 'LibraryReadingSession + task timestamps',
      },
      {
        key: 'learning-consistency',
        title: 'Learning Consistency',
        status: 'architecture',
        value: snapshot.aiProfile?.consistencyScore || 0,
        streak: snapshot.user?.streak || snapshot.aiProfile?.dailyStreak || 0,
        integration: 'UserProfile.consistencyScore + User.streak',
      },
      {
        key: 'productivity-trend',
        title: 'Productivity Trend',
        status: 'architecture',
        value: snapshot.aiProfile?.improvementRate || 0,
        integration: 'Task completion velocity over time',
      },
      {
        key: 'career-readiness',
        title: 'Career Readiness',
        status: 'architecture',
        value: Math.min(100, (snapshot.applications?.length || 0) * 10 + snapshot.learningProgress),
        integration: 'Applications + skills + certificates + roadmap progress',
      },
    ],
    aiReady: true,
  }
}

function buildKnowledgeMemory(snapshot) {
  const profileMemory = snapshot.aiProfile?.knowledgeMemory || {}
  const learningHistory = snapshot.books.slice(0, 8).map((item) => ({
    id: String(item.bookId?._id || item._id),
    title: item.bookId?.title || 'Book',
    type: 'reading',
    progress: item.percent,
    url: item.bookId?._id ? `/library/books/${item.bookId._id}` : '/student/books',
    updatedAt: item.lastReadAt,
  }))

  const completedSessions = snapshot.chats.map((chat) => {
    const last = [...(chat.messages || [])].reverse().find((item) => item.role === 'user')
    return {
      id: String(chat._id),
      session: chat.session,
      snippet: last?.content?.slice(0, 120) || 'Mentor conversation',
      url: '/student/mentor',
      updatedAt: chat.updatedAt,
    }
  })

  const bookmarkItems = [
    ...snapshot.bookmarks.map((item) => ({
      id: String(item._id),
      title: item.title || item.targetType,
      type: item.targetType,
      url: item.url || '/student/books',
      updatedAt: item.createdAt,
    })),
    ...(profileMemory.bookmarks || []),
  ]

  return {
    learningHistory,
    completedSessions,
    bookmarks: bookmarkItems.slice(0, 12),
    savedConversations: profileMemory.savedConversations || [],
    favoriteResources: profileMemory.favoriteResources || [],
    recentSuggestions: profileMemory.recentSuggestions || [],
    architecture: {
      storage: 'UserProfile.knowledgeMemory + live aggregates from Bookmark, LibraryProgress, Chat',
      aiReady: true,
    },
  }
}

function buildPersonalProfile(snapshot) {
  return {
    goals: snapshot.goals.length,
    completedTasks: snapshot.completedTasks.length,
    readingHistory: snapshot.books.length,
    skills: snapshot.skillGrowth.map((item) => item.name),
    interests: snapshot.aiProfile?.interests || [],
    careerPreferences: snapshot.aiProfile?.careerPreferences || {},
    learningTime: {
      minutesThisWeek: snapshot.readingMinutesWeek,
      totalLearningMinutes: snapshot.aiProfile?.totalLearningMinutes || 0,
    },
    preferredTopics: snapshot.aiProfile?.preferredTopics || [],
    targetRole: snapshot.aiProfile?.targetRole || '',
    tone: snapshot.aiProfile?.tone || 'calm',
    engagementLevel: snapshot.aiProfile?.engagementLevel || 'low',
  }
}

function buildActionCenter() {
  return [
    { key: 'ask-ai', label: 'Ask AI', icon: '💬', url: '/student/mentor', action: 'navigate' },
    { key: 'study-plan', label: 'Generate Study Plan', icon: '📋', url: '/student/intelligence?action=study-plan', action: 'study-plan' },
    { key: 'weekly-plan', label: 'Generate Weekly Plan', icon: '🗓️', url: '/student/intelligence?action=weekly-plan', action: 'weekly-plan' },
    { key: 'recommend-books', label: 'Recommend Books', icon: '📚', url: '/student/intelligence?section=books', action: 'recommend-books' },
    { key: 'recommend-courses', label: 'Recommend Courses', icon: '🎓', url: '/student/intelligence?section=courses', action: 'recommend-courses' },
    { key: 'suggest-practice', label: 'Suggest Practice', icon: '⚡', url: '/student/tasks', action: 'suggest-practice' },
    { key: 'open-mentor', label: 'Open Mentor', icon: '🤖', url: '/student/mentor', action: 'navigate' },
  ]
}

async function getHome(userId) {
  const snapshot = await buildActivitySnapshot(userId)
  const recommendations = await recommendationEngine.getRecommendations(userId)
  let learningIntelligence = null
  try {
    const learningIntelligenceService = require('./learningIntelligenceService')
    learningIntelligence = await learningIntelligenceService.getLearningIntelligence(userId)
  } catch {
    learningIntelligence = null
  }

  return {
    dailyBrief: buildDailyBrief(snapshot, recommendations),
    learningPlan: buildLearningPlan(snapshot, recommendations),
    priorityGoals: snapshot.priorityGoals.map((item) => ({
      id: String(item._id),
      title: item.title,
      progress: item.progress || 0,
      priority: item.priority,
      url: `/student/goals?goalId=${item._id}`,
    })),
    recommendedTasks: snapshot.recommendedTasks.map((item) => ({
      id: String(item._id),
      title: item.title,
      priority: item.priority,
      dueDate: item.dueDate,
      url: `/student/tasks?taskId=${item._id}`,
    })),
    recommendations,
    careerSuggestions: recommendations.career?.items || [],
    progressSummary: {
      learningProgress: snapshot.learningProgress,
      goals: snapshot.goals.length,
      completedTasks: snapshot.completedTasks.length,
      booksInProgress: snapshot.books.length,
      streak: snapshot.user?.streak || 0,
    },
    learningDashboard: {
      weeklyProgress: snapshot.weeklyProgress,
      streak: snapshot.user?.streak || snapshot.aiProfile?.dailyStreak || 0,
      skillGrowth: snapshot.skillGrowth,
      recommendedNextStep: learningIntelligence?.nextAction
        ? {
          title: learningIntelligence.nextAction.study
            ? `Study: ${learningIntelligence.nextAction.study}`
            : learningIntelligence.nextAction.title,
          url: learningIntelligence.nextAction.url,
          why: learningIntelligence.nextAction.why,
        }
        : buildLearningPlan(snapshot, recommendations).items[0] || null,
      knowledgeAreas: snapshot.knowledgeAreas,
      upcomingDeadlines: snapshot.upcomingDeadlines,
      learningIntelligence: learningIntelligence
        ? {
          overview: learningIntelligence.overview,
          nextAction: learningIntelligence.nextAction,
          skillGaps: learningIntelligence.skillGaps,
          adaptive: learningIntelligence.adaptive,
          resources: learningIntelligence.resources,
          progressReview: learningIntelligence.progressReview,
          projectLearning: learningIntelligence.projectLearning,
          researchGaps: learningIntelligence.researchGaps,
          plan: learningIntelligence.plan,
        }
        : null,
    },
    actionCenter: buildActionCenter(),
    knowledgeMemory: buildKnowledgeMemory(snapshot),
    insights: buildInsightsArchitecture(snapshot),
    personalProfile: buildPersonalProfile(snapshot),
    aiReady: true,
  }
}

async function getDashboardInsights(userId) {
  const snapshot = await buildActivitySnapshot(userId)
  const recommendations = await recommendationEngine.getRecommendations(userId)

  return [
    {
      key: 'recommended-skill',
      icon: '⚡',
      label: 'Recommended Skill',
      value: recommendations.skills?.items?.[0]?.title || '',
      detail: recommendations.skills?.reason || '',
      to: '/student/intelligence',
      tone: 'purple',
    },
    {
      key: 'recommended-course',
      icon: '🎓',
      label: 'Recommended Course',
      value: recommendations.courses?.items?.[0]?.title || '',
      detail: recommendations.courses?.items?.[0]?.subtitle || '',
      to: '/student/intelligence',
      tone: 'blue',
    },
    {
      key: 'recommended-book',
      icon: '📚',
      label: 'Recommended Book',
      value: recommendations.books?.items?.[0]?.title || '',
      detail: recommendations.books?.items?.[0]?.subtitle || '',
      to: recommendations.books?.items?.[0]?.url || '/student/books',
      tone: 'green',
    },
    {
      key: 'career-suggestion',
      icon: '🧭',
      label: 'Career Suggestion',
      value: recommendations.career?.items?.[0]?.title || snapshot.aiProfile?.targetRole || '',
      detail: recommendations.career?.items?.[0]?.subtitle || 'Explore matched roles',
      to: '/student/career',
      tone: 'blue',
    },
    {
      key: 'internship-suggestion',
      icon: '💼',
      label: 'Internship Suggestion',
      value: recommendations.internships?.items?.[0]?.title || '',
      detail: recommendations.internships?.items?.[0]?.subtitle || '',
      to: '/student/career/internships',
      tone: 'green',
    },
    {
      key: 'learning-progress',
      icon: '📈',
      label: 'Learning Progress',
      value: `${snapshot.learningProgress}%`,
      detail: `${snapshot.completedTasks.length} tasks completed`,
      to: '/student/intelligence',
      tone: 'purple',
    },
  ]
}

async function updatePersonalProfile(userId, updates) {
  const allowed = [
    'tone', 'interests', 'currentRole', 'targetRole', 'skills', 'notifications',
    'preferredTopics', 'careerPreferences', 'learningPreferences', 'knowledgeMemory',
  ]
  const payload = {}
  allowed.forEach((key) => {
    if (updates[key] !== undefined) payload[key] = updates[key]
  })
  return UserProfile.findOneAndUpdate(
    { userId },
    { $set: payload },
    { new: true, upsert: true },
  )
}

module.exports = {
  getHome,
  getDashboardInsights,
  getOrCreateAiProfile,
  buildActivitySnapshot,
  buildKnowledgeMemory,
  buildPersonalProfile,
  updatePersonalProfile,
}
