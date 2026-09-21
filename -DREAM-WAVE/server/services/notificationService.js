const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const User = require('../models/User')

const TYPES = ['system', 'email', 'push', 'in-app', 'approval', 'report', 'job', 'internship', 'follow', 'library', 'book', 'discovery', 'goal', 'milestone', 'roadmap', 'task', 'reminder', 'certificate', 'academic', 'career', 'ai']
const CHANNELS = ['in-app', 'email', 'push']
const PRIORITIES = ['low', 'normal', 'high', 'urgent']

const text = (value, max) => String(value || '').trim().slice(0, max)

function normalize(data = {}) {
  const channel = CHANNELS.includes(data.channel) ? data.channel : 'in-app'
  return {
    title: text(data.title, 240),
    body: text(data.body, 4000),
    link: text(data.link, 1000),
    type: TYPES.includes(data.type) ? data.type : 'system',
    channel,
    priority: PRIORITIES.includes(data.priority) ? data.priority : 'normal',
    source: text(data.source, 100),
    dedupeKey: text(data.dedupeKey, 200),
    meta: data.meta && typeof data.meta === 'object' ? data.meta : undefined,
    expiresAt: data.expiresAt || null,
    emailStatus: channel === 'email' ? 'pending' : 'skipped',
    pushStatus: channel === 'push' ? 'pending' : 'skipped',
  }
}

async function createForUser(userId, data, { validateRecipient = false, emit } = {}) {
  if (!mongoose.isValidObjectId(userId)) {
    const error = new Error('Invalid notification recipient')
    error.statusCode = 400
    error.code = 'INVALID_RECIPIENT'
    throw error
  }
  const payload = normalize(data)
  if (!payload.title) {
    const error = new Error('Notification title is required')
    error.statusCode = 400
    error.code = 'VALIDATION_ERROR'
    throw error
  }
  if (validateRecipient && !await User.exists({ _id: userId })) {
    const error = new Error('Notification recipient not found')
    error.statusCode = 404
    error.code = 'RECIPIENT_NOT_FOUND'
    throw error
  }
  try {
    const item = await Notification.create({ userId, ...payload })
    if (emit) emit(`user:${userId}`, 'notification:new', item.toObject())
    return item
  } catch (error) {
    if (error.code === 11000 && payload.dedupeKey) {
      return Notification.findOne({ userId, dedupeKey: payload.dedupeKey })
    }
    throw error
  }
}

async function listForUser(userId, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 30))
  const filter = { userId }
  if (options.archived === 'true' || options.archived === true) filter.archivedAt = { $ne: null }
  else filter.archivedAt = null
  if (options.read === 'true' || options.read === true) filter.read = true
  if (options.read === 'false' || options.read === false) filter.read = false
  if (options.type && TYPES.includes(options.type)) filter.type = options.type
  if (options.priority && PRIORITIES.includes(options.priority)) filter.priority = options.priority
  if (options.cursor && mongoose.isValidObjectId(options.cursor)) {
    const cursor = await Notification.findOne({ _id: options.cursor, userId }).select('createdAt').lean()
    if (cursor) filter.createdAt = { $lt: cursor.createdAt }
  }
  const [items, unread] = await Promise.all([
    Notification.find(filter).sort({ pinnedAt: -1, createdAt: -1 }).limit(limit + 1).lean(),
    Notification.countDocuments({ userId, archivedAt: null, read: false }),
  ])
  const hasMore = items.length > limit
  if (hasMore) items.pop()
  return { items, unread, nextCursor: hasMore ? items[items.length - 1]?._id : null }
}

const GROUP_RULES = [
  { key: 'tasks', types: ['task', 'reminder', 'goal', 'milestone', 'roadmap'], label: 'Tasks & Goals' },
  { key: 'career', types: ['career', 'job', 'internship'], label: 'Career' },
  { key: 'community', types: ['follow', 'discovery'], label: 'Community' },
  { key: 'library', types: ['library', 'book'], label: 'Library' },
  { key: 'system', types: ['system', 'in-app', 'approval', 'report', 'ai', 'email', 'push'], label: 'System' },
]

function safeInternalLink(link) {
  if (!link || typeof link !== 'string') return null
  const trimmed = link.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//') || trimmed.includes('://')) return null
  return trimmed.slice(0, 1000)
}

function notificationCategory(type) {
  const match = GROUP_RULES.find((rule) => rule.types.includes(type))
  return match?.key || 'system'
}

function notificationPriorityBand(priority) {
  if (priority === 'urgent') return 'ACTION_REQUIRED'
  if (priority === 'high') return 'IMPORTANT'
  return 'NORMAL'
}

function groupNotifications(items = []) {
  const groups = Object.fromEntries(GROUP_RULES.map((rule) => [rule.key, { key: rule.key, label: rule.label, items: [], unread: 0 }]))
  const dedupeMap = new Map()

  for (const item of items) {
    const category = notificationCategory(item.type)
    const band = notificationPriorityBand(item.priority)
    const groupKey = item.dedupeKey || `${item.type}:${item.title}`
    const bucket = groups[category] || groups.system

    if (dedupeMap.has(groupKey)) {
      const existing = dedupeMap.get(groupKey)
      existing.count += 1
      existing.latestAt = item.createdAt
      if (!item.read) existing.unread += 1
      continue
    }

    const entry = {
      id: String(item._id),
      title: item.title,
      body: item.body,
      type: item.type,
      priority: item.priority,
      band,
      read: item.read,
      link: safeInternalLink(item.link),
      createdAt: item.createdAt,
      count: 1,
      latestAt: item.createdAt,
    }
    dedupeMap.set(groupKey, entry)
    bucket.items.push(entry)
    if (!item.read) bucket.unread += 1
  }

  return GROUP_RULES
    .map((rule) => groups[rule.key])
    .map((group) => ({
      ...group,
      items: group.items
        .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))
        .slice(0, 8)
        .map((item) => ({
          ...item,
          title: item.count > 1 ? `${item.count} related updates` : item.title,
        })),
    }))
    .filter((group) => group.items.length > 0)
}

module.exports = {
  TYPES, CHANNELS, PRIORITIES, createForUser, listForUser, normalize,
  groupNotifications, safeInternalLink, notificationCategory, notificationPriorityBand,
}
