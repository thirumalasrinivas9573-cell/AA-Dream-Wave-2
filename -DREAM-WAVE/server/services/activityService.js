const Goal = require('../models/Goal')
const Task = require('../models/Task')
const Roadmap = require('../models/Roadmap')
const LibraryProgress = require('../models/LibraryProgress')
const LibraryBook = require('../models/LibraryBook')
const Application = require('../models/Application')
const StudentProfile = require('../models/StudentProfile')

const EVENT_TYPES = {
  goal_completed: { icon: '🎯', tone: 'green', label: 'Goal completed' },
  task_completed: { icon: '✓', tone: 'green', label: 'Task completed' },
  roadmap_updated: { icon: '🗺️', tone: 'purple', label: 'Roadmap updated' },
  reading_progress: { icon: '📖', tone: 'blue', label: 'Reading progress' },
  certificate_added: { icon: '🏅', tone: 'amber', label: 'Certificate added' },
  application_updated: { icon: '💼', tone: 'blue', label: 'Application update' },
  goal_created: { icon: '🎯', tone: 'purple', label: 'Goal created' },
}

function row({ id, type, title, meta, timestamp, url }) {
  const cfg = EVENT_TYPES[type] || { icon: '↻', tone: 'purple', label: 'Activity' }
  return {
    id,
    type,
    title,
    meta: meta || cfg.label,
    timestamp,
    url,
    icon: cfg.icon,
    tone: cfg.tone,
  }
}

async function buildRecentActivity(userId, { limit = 20, profile: profileInput } = {}) {
  const [
    goals,
    tasks,
    roadmaps,
    readingProgress,
    profile,
    applications,
  ] = await Promise.all([
    Goal.find({ userId }).select('title completed status progress updatedAt createdAt').sort('-updatedAt').limit(40).lean(),
    Task.find({ userId, status: { $ne: 'archived' } }).select('title completed status completedAt updatedAt createdAt').sort('-updatedAt').limit(60).lean(),
    Roadmap.find({ userId, status: { $ne: 'archived' } }).populate('goalId', 'title').select('goalId status updatedAt createdAt').sort('-updatedAt').limit(20).lean(),
    LibraryProgress.find({ userId, percent: { $gt: 0 } }).populate({ path: 'bookId', match: { status: 'active' }, select: 'title' }).sort('-lastReadAt').limit(15).lean(),
    profileInput || StudentProfile.findOne({ userId }).select('credentials').lean(),
    Application.find({ studentId: userId }).select('status targetType updatedAt createdAt').sort('-updatedAt').limit(15).lean(),
  ])

  const events = []

  for (const goal of goals) {
    if (goal.completed || goal.status === 'completed') {
      events.push(row({
        id: `goal-completed-${goal._id}`,
        type: 'goal_completed',
        title: goal.title,
        meta: `${Math.round(goal.progress || 100)}% complete`,
        timestamp: goal.updatedAt,
        url: `/student/goals?goalId=${goal._id}`,
      }))
    } else if (goal.createdAt && goal.updatedAt && String(goal.createdAt) === String(goal.updatedAt)) {
      events.push(row({
        id: `goal-created-${goal._id}`,
        type: 'goal_created',
        title: goal.title,
        timestamp: goal.createdAt,
        url: `/student/goals?goalId=${goal._id}`,
      }))
    }
  }

  for (const task of tasks.filter((t) => t.completed || t.status === 'completed')) {
    events.push(row({
      id: `task-completed-${task._id}`,
      type: 'task_completed',
      title: task.title,
      timestamp: task.completedAt || task.updatedAt,
      url: `/student/tasks?taskId=${task._id}`,
    }))
  }

  for (const roadmap of roadmaps) {
    events.push(row({
      id: `roadmap-${roadmap._id}`,
      type: 'roadmap_updated',
      title: roadmap.goalId?.title || 'Learning roadmap',
      meta: roadmap.status || 'Updated',
      timestamp: roadmap.updatedAt,
      url: '/student/roadmap',
    }))
  }

  for (const item of readingProgress.filter((r) => r.bookId)) {
    events.push(row({
      id: `reading-${item._id}`,
      type: 'reading_progress',
      title: item.bookId.title,
      meta: `${Math.round(item.percent || 0)}% read`,
      timestamp: item.lastReadAt || item.updatedAt,
      url: `/library/books/${item.bookId._id}`,
    }))
  }

  for (const [index, cert] of (profile?.credentials || []).entries()) {
    if (!cert.title) continue
    events.push(row({
      id: `cert-${cert._id || index}`,
      type: 'certificate_added',
      title: cert.title,
      meta: cert.issuer || 'Certificate',
      timestamp: cert.issuedAt || cert.createdAt,
      url: '/student/certificates',
    }))
  }

  for (const app of applications) {
    events.push(row({
      id: `app-${app._id}`,
      type: 'application_updated',
      title: `${app.targetType || 'Application'} application`,
      meta: app.status || 'Updated',
      timestamp: app.updatedAt || app.createdAt,
      url: '/student/career/applications',
    }))
  }

  return events
    .filter((e) => e.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
}

module.exports = { buildRecentActivity, EVENT_TYPES }
