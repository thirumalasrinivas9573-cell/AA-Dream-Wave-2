const PartnershipActivity = require('../models/PartnershipActivity')
const PlatformNotification = require('../models/PlatformNotification')
const User = require('../models/User')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const { getSocketIo } = require('./socketRegistry')
const { sendEmailNotification } = require('./emailNotificationService')

const PRIORITY_MAP = {
  recruitment_offer_released: 'important',
  recruitment_interview_scheduled: 'important',
  recruitment_interview_rescheduled: 'important',
  placement_offer_released: 'important',
  placement_interview_scheduled: 'important',
  security_alert: 'important',
  alumni_career_application_updated: 'important',
  community_post_comment: 'normal',
  community_post_like: 'low',
  community_new_follower: 'normal',
}

function resolvePriority(type) {
  return PRIORITY_MAP[type] || 'normal'
}

function resolveDeepLink(notification) {
  const meta = notification.metadata || {}
  const type = notification.type

  if (meta.href) return meta.href
  if (meta.applicationId) return `/company/recruitment/applications/${meta.applicationId}`
  if (meta.source && meta.sourceId) return `/events/${meta.source}/${meta.sourceId}`
  if (meta.postId) return `/community`
  if (meta.teamId && meta.source && meta.sourceId) return `/events/${meta.source}/${meta.sourceId}`
  if (meta.projectId) return `/research/${meta.projectId}`
  if (meta.partnershipId) return `/institution/partnerships/${meta.partnershipId}`

  switch (type) {
    case 'recruitment_application_received':
    case 'recruitment_interview_scheduled':
    case 'recruitment_offer_released':
      return meta.applicationId ? `/ai/career/jobs` : '/ai/career/jobs'
    case 'event_registration_confirmed':
    case 'event_team_invitation':
    case 'placement_opportunity_published':
      return meta.source && meta.sourceId ? `/events/${meta.source}/${meta.sourceId}` : '/events/my'
    case 'community_collaboration_request':
      return '/community'
    default:
      return null
  }
}

function deliverRealtime(notification) {
  const io = getSocketIo()
  if (!io) return
  const payload = {
    id: notification._id?.toString?.() || notification._id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    read: notification.read,
    priority: notification.metadata?.priority || resolvePriority(notification.type),
    metadata: notification.metadata,
    partnershipId: notification.partnershipId,
    createdAt: notification.createdAt,
    href: resolveDeepLink(notification),
  }
  io.to(`user:${notification.recipientUserId}`).emit('platform:notification', payload)
}

async function recordActivity({
  partnershipId,
  institutionId,
  companyId,
  type,
  title,
  description = '',
  actorUserId = null,
  actorRole = 'system',
  metadata = {},
}) {
  return PartnershipActivity.create({
    partnershipId,
    institutionId,
    companyId,
    type,
    title,
    description,
    actorUserId,
    actorRole,
    metadata,
  })
}

async function notifyUser({
  recipientUserId,
  recipientRole,
  type,
  title,
  body = '',
  partnershipId = null,
  metadata = {},
  io = null,
  idempotencyKey = null,
  actorUserId = null,
  skipEmail = false,
}) {
  if (!recipientUserId || !type || !title) {
    throw new Error('recipientUserId, type, and title are required')
  }

  const blockedMetaKeys = ['recipientUserId', 'recipientRole', 'read', 'systemGenerated']
  for (const key of blockedMetaKeys) {
    if (key in metadata) delete metadata[key]
  }

  if (idempotencyKey) {
    const existing = await PlatformNotification.findOne({
      recipientUserId,
      'metadata.idempotencyKey': idempotencyKey,
    }).lean()
    if (existing) return existing
    metadata.idempotencyKey = idempotencyKey
  }

  metadata.priority = metadata.priority || resolvePriority(type)
  if (actorUserId) metadata.actorUserId = actorUserId.toString()

  const notification = await PlatformNotification.create({
    recipientUserId,
    recipientRole,
    type,
    title,
    body,
    partnershipId,
    metadata,
  })

  const doc = notification.toObject ? notification.toObject() : notification
  doc.href = resolveDeepLink(doc)

  if (io) {
    io.to(`user:${recipientUserId}`).emit('platform:notification', {
      id: doc._id,
      type,
      title,
      body,
      partnershipId,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      href: doc.href,
    })
  } else {
    deliverRealtime(doc)
  }

  if (!skipEmail) {
    sendEmailNotification({ recipientUserId, type, title, body }).catch(() => {})
  }

  return notification
}

async function notifyOrgCounterparty({
  partnership,
  type,
  title,
  body,
  initiatorRole,
  io = null,
}) {
  const targetRole = initiatorRole === 'institution' ? 'company' : 'institution'
  let recipientUserId = null

  if (targetRole === 'company') {
    const company = await Company.findById(partnership.companyId).select('ownerUserId')
    recipientUserId = company?.ownerUserId
  } else {
    const institution = await Institution.findById(partnership.institutionId).select('ownerUserId')
    recipientUserId = institution?.ownerUserId
  }

  if (!recipientUserId) return null

  return notifyUser({
    recipientUserId,
    recipientRole: targetRole,
    type,
    title,
    body,
    partnershipId: partnership._id,
    metadata: { partnershipId: partnership._id.toString() },
    io,
    idempotencyKey: `${type}:${partnership._id}:${recipientUserId}`,
  })
}

async function getUnreadCount(userId) {
  return PlatformNotification.countDocuments({ recipientUserId: userId, read: false })
}

async function listNotifications(userId, { page = 1, limit = 20, read, type, priority } = {}) {
  const query = { recipientUserId: userId }
  if (read === 'true') query.read = true
  if (read === 'false') query.read = false
  if (type) query.type = type
  if (priority) query['metadata.priority'] = priority

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10) || 20))
  const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 20))

  const [items, total, unreadCount] = await Promise.all([
    PlatformNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    PlatformNotification.countDocuments(query),
    PlatformNotification.countDocuments({ recipientUserId: userId, read: false }),
  ])

  const enriched = items.map((n) => ({ ...n, href: resolveDeepLink(n) }))
  return {
    items: enriched,
    total,
    unreadCount,
    page: Math.max(1, parseInt(page, 10)),
    limit: lim,
    pageCount: Math.ceil(total / lim) || 1,
  }
}

async function getNotificationById(notificationId, userId) {
  const notification = await PlatformNotification.findOne({
    _id: notificationId,
    recipientUserId: userId,
  }).lean()
  if (!notification) return null
  return { ...notification, href: resolveDeepLink(notification) }
}

async function markRead(notificationId, userId) {
  const notification = await PlatformNotification.findOneAndUpdate(
    { _id: notificationId, recipientUserId: userId },
    { read: true },
    { new: true },
  ).lean()
  if (!notification) return null
  return { ...notification, href: resolveDeepLink(notification) }
}

async function markAllRead(userId) {
  return PlatformNotification.updateMany({ recipientUserId: userId, read: false }, { read: true })
}

async function deleteNotification(notificationId, userId) {
  return PlatformNotification.findOneAndDelete({ _id: notificationId, recipientUserId: userId })
}

async function getPreferences(userId) {
  const UserProfile = require('../models/UserProfile')
  const profile = await UserProfile.findOne({ userId }).select('notifications').lean()
  return {
    emailEnabled: profile?.notifications?.emailEnabled !== false,
    inAppEnabled: profile?.notifications?.inAppEnabled !== false,
    categories: profile?.notifications?.categories || {},
  }
}

async function updatePreferences(userId, prefs = {}) {
  const UserProfile = require('../models/UserProfile')
  const blocked = ['userId', 'recipientUserId', 'role']
  for (const key of Object.keys(prefs)) {
    if (blocked.includes(key)) throw new Error(`Cannot set ${key}`)
  }
  const update = {}
  if (typeof prefs.emailEnabled === 'boolean') update['notifications.emailEnabled'] = prefs.emailEnabled
  if (typeof prefs.inAppEnabled === 'boolean') update['notifications.inAppEnabled'] = prefs.inAppEnabled
  if (prefs.categories && typeof prefs.categories === 'object') {
    update['notifications.categories'] = prefs.categories
  }
  await UserProfile.findOneAndUpdate({ userId }, { $set: update }, { upsert: false })
  return getPreferences(userId)
}

module.exports = {
  recordActivity,
  notifyUser,
  notifyOrgCounterparty,
  deliverRealtime,
  resolveDeepLink,
  resolvePriority,
  getUnreadCount,
  listNotifications,
  getNotificationById,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
}
