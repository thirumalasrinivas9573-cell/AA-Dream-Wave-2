const mongoose = require('mongoose')
const User = require('../models/User')
const StudentProfile = require('../models/StudentProfile')
const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const LibraryReadingSession = require('../models/LibraryReadingSession')
const CompanyProfile = require('../models/CompanyProfile')
const Job = require('../models/Job')
const Internship = require('../models/Internship')
const Application = require('../models/Application')
const Course = require('../models/Course')
const Institution = require('../models/Institution')
const PortalEvent = require('../models/PortalEvent')
const LibraryBook = require('../models/LibraryBook')
const notificationService = require('../services/notificationService')
const dashboardOrchestration = require('../services/dashboardOrchestrationService')
const activityService = require('../services/activityService')

const fail = (res, status, message, code = 'DASHBOARD_ERROR') => res.status(status).json({ success: false, code, message })
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

async function enrichApplications(userId) {
  const applications = await Application.find({ studentId: userId, targetType: { $in: ['job', 'internship'] } }).sort('-updatedAt').limit(30).lean()
  const jobs = await Job.find({ _id: { $in: applications.filter((item) => item.targetType === 'job').map((item) => item.targetId) } }).select('title companyId').lean()
  const internships = await Internship.find({ _id: { $in: applications.filter((item) => item.targetType === 'internship').map((item) => item.targetId) } }).select('title companyId').lean()
  const targetMap = new Map([...jobs, ...internships].map((item) => [String(item._id), item]))
  const companies = await CompanyProfile.find({ _id: { $in: applications.map((item) => item.companyId).filter(Boolean) } }).select('name slug logo').lean()
  const companyMap = new Map(companies.map((item) => [String(item._id), item]))
  return applications.map((item) => ({ ...item, opportunity: targetMap.get(String(item.targetId)) || null, company: companyMap.get(String(item.companyId)) || null }))
}

exports.studentDashboard = async (req, res) => {
  try {
    const userId = req.user._id
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)
    const [approvedCompanies, approvedInstitutions] = await Promise.all([
      CompanyProfile.find({ status: 'approved', isPublic: true }).distinct('_id'),
      Institution.find({ status: 'approved', isPublic: true }).distinct('_id'),
    ])
    const [
      user, profile, goals, tasks, roadmaps, readingProgress, readingWeek,
      applications, notifications, jobsAvailable, internshipsAvailable,
      events, courses, featuredBooks, latestJobs, latestInternships,
    ] = await Promise.all([
      User.findById(userId).select('name email profileImage level credits streak aaid').lean(),
      StudentProfile.findOne({ userId }).lean(),
      Goal.find({ userId }).sort('-updatedAt').limit(100).lean(),
      Task.find({ userId, status: { $ne: 'archived' } }).sort('-updatedAt').limit(200).lean(),
      Roadmap.find({ userId, status: { $ne: 'archived' } }).populate('goalId', 'title').sort('-updatedAt').limit(50).lean(),
      LibraryProgress.find({ userId, percent: { $gt: 0 } }).populate({ path: 'bookId', match: { status: 'active' }, select: 'title author coverUrl category estimatedMinutes' }).sort('-lastReadAt').limit(20).lean(),
      LibraryReadingSession.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(String(userId)), startedAt: { $gte: weekStart } } },
        { $group: { _id: null, seconds: { $sum: '$durationSeconds' }, pages: { $sum: '$pagesRead' } } },
      ]),
      enrichApplications(userId),
      notificationService.listForUser(userId, { limit: 30 }),
      Job.countDocuments({ companyId: { $in: approvedCompanies }, status: 'open', $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }] }),
      Internship.countDocuments({ companyId: { $in: approvedCompanies }, status: 'open', $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }] }),
      PortalEvent.find({
        status: 'published',
        startDate: { $gte: now },
        $or: [
          { ownerType: 'company', ownerId: { $in: approvedCompanies } },
          { ownerType: 'institution', ownerId: { $in: approvedInstitutions } },
        ],
      }).sort('startDate').limit(8).lean(),
      Course.find({ institutionId: { $in: approvedInstitutions }, status: 'active' }).sort({ enrolled: -1, updatedAt: -1 }).limit(8).lean(),
      LibraryBook.find({ status: 'active' }).sort({ saves: -1, views: -1, createdAt: -1 }).select('title author coverUrl category').limit(8).lean(),
      Job.find({ companyId: { $in: approvedCompanies }, status: 'open' }).populate('companyId', 'name slug logo').sort('-createdAt').limit(6).lean(),
      Internship.find({ companyId: { $in: approvedCompanies }, status: 'open' }).populate('companyId', 'name slug logo').sort('-createdAt').limit(6).lean(),
    ])
    if (!user) return fail(res, 404, 'Student account not found', 'NOT_FOUND')
    const books = readingProgress.filter((item) => item.bookId)
    const completedGoals = goals.filter((item) => item.completed || item.status === 'completed')
    const completedTasks = tasks.filter((item) => item.completed || item.status === 'completed')
    const goalProgress = average(goals.map((item) => Number(item.progress) || 0))
    const taskProgress = tasks.length ? completedTasks.length / tasks.length * 100 : 0
    const readingProgressPercent = average(books.map((item) => Number(item.percent) || 0))
    const learningProgress = Math.round(average([goalProgress, taskProgress, readingProgressPercent].filter((value) => Number.isFinite(value))))
    const credentials = profile?.credentials || []
    const readingStats = readingWeek[0] || { seconds: 0, pages: 0 }

    const discovery = {
      events,
      courses,
      featuredBooks,
      jobs: latestJobs,
      internships: latestInternships,
    }

    const [commandCenter, activity] = await Promise.all([
      dashboardOrchestration.buildCommandCenter(userId, {
        user,
        profile,
        goals,
        tasks,
        roadmaps,
        books,
        applications,
        notifications,
        discovery,
      }),
      activityService.buildRecentActivity(userId, { limit: 12, profile }),
    ])

    const groupedNotifications = notificationService.groupNotifications(notifications.items || [])

    return res.json({
      success: true,
      data: {
        identity: { user, profile },
        goals,
        tasks,
        roadmaps,
        books,
        credentials,
        applications,
        notifications: {
          ...notifications,
          grouped: groupedNotifications,
        },
        discovery,
        reading: {
          minutesWeek: Math.round(readingStats.seconds / 60),
          pagesReadWeek: readingStats.pages,
          booksStarted: books.length,
          booksCompleted: books.filter((item) => item.percent >= 100).length,
          continueReading: books.slice(0, 10),
        },
        stats: {
          goals: goals.length,
          activeGoals: goals.filter((item) => item.status === 'active').length,
          completedGoals: completedGoals.length,
          tasks: tasks.length,
          completedTasks: completedTasks.length,
          books: books.length,
          certificates: credentials.length,
          roadmaps: roadmaps.length,
          jobsAvailable,
          internshipsAvailable,
          jobApplications: applications.filter((item) => item.targetType === 'job').length,
          internshipApplications: applications.filter((item) => item.targetType === 'internship').length,
          unreadNotifications: notifications.unread,
          learningProgress,
          goalProgress: Math.round(goalProgress),
          taskProgress: Math.round(taskProgress),
          readingProgress: Math.round(readingProgressPercent),
        },
        commandCenter,
        activity,
      },
      meta: {
        generatedAt: new Date(),
        sources: ['profile', 'goals', 'tasks', 'roadmaps', 'library', 'career', 'notifications', 'discovery', 'planner', 'focus', 'commandCenter'],
      },
    })
  } catch (error) {
    console.error('[student.dashboard]', error.message)
    return fail(res, 500, 'Student dashboard is temporarily unavailable')
  }
}
