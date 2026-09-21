/**
 * Student Intelligence Event Bus (V4 Prompt 8).
 * Thin domain emitter — NOT MJ EventBus, NOT a second database of truth.
 * Idempotent processing → change impact → optional notify / decision refresh.
 */
const crypto = require('crypto')
const mongoose = require('mongoose')
const IntelligenceEvent = require('../models/IntelligenceEvent')
const { EVENT_TYPES } = IntelligenceEvent
const changeImpactService = require('./changeImpactService')
const notificationService = require('./notificationService')
const limits = require('../config/intelligenceLimits')

function deny(code, message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  throw err
}

function requireUserId(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    deny('AUTH_REQUIRED', 'Authenticated user required.', 401)
  }
  return String(userId)
}

function buildIdempotencyKey({ eventType, entityType = '', entityId = '', userId, extra = '' }) {
  const raw = [eventType, entityType, entityId, String(userId), extra].join('|')
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 40)
}

function normalizeEvent(input = {}) {
  const eventType = String(input.eventType || '').toUpperCase()
  if (!EVENT_TYPES.includes(eventType)) {
    deny('INVALID_EVENT_TYPE', `Unsupported event type: ${input.eventType}`)
  }
  return {
    eventType,
    source: String(input.source || 'system').slice(0, 80),
    entityType: String(input.entityType || '').slice(0, 40),
    entityId: String(input.entityId || '').slice(0, 64),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    depth: Math.max(0, Number(input.depth) || 0),
    urgency: input.urgency || 'normal',
  }
}

/**
 * Publish + process once. Repeated identical keys return existing record.
 */
async function publish(userId, input = {}, { io = null, processHook = null } = {}) {
  const uid = requireUserId(userId)
  const normalized = normalizeEvent(input)
  const idempotencyKey = input.idempotencyKey
    || buildIdempotencyKey({
      eventType: normalized.eventType,
      entityType: normalized.entityType,
      entityId: normalized.entityId,
      userId: uid,
      extra: input.dedupeExtra || '',
    })

  const existing = await IntelligenceEvent.findOne({ userId: uid, idempotencyKey }).lean()
  if (existing) {
    return {
      duplicate: true,
      event: existing,
      impact: existing.impact || changeImpactService.analyzeImpact(normalized.eventType, { depth: existing.depth }),
      notified: false,
    }
  }

  const impact = changeImpactService.analyzeImpact(normalized.eventType, { depth: normalized.depth })
  const expiresAt = new Date(Date.now() + limits.EVENT_TTL_HOURS * 3600 * 1000)

  let doc
  try {
    doc = await IntelligenceEvent.create({
      userId: uid,
      eventType: normalized.eventType,
      source: normalized.source,
      entityType: normalized.entityType,
      entityId: normalized.entityId,
      idempotencyKey,
      depth: normalized.depth,
      status: impact.action === 'IGNORE' ? 'IGNORED' : 'RECEIVED',
      impact,
      metadata: normalized.metadata,
      expiresAt,
    })
  } catch (err) {
    if (err.code === 11000) {
      const again = await IntelligenceEvent.findOne({ userId: uid, idempotencyKey }).lean()
      return { duplicate: true, event: again, impact: again?.impact || impact, notified: false }
    }
    throw err
  }

  let hookResult = null
  if (impact.action !== 'IGNORE' && typeof processHook === 'function') {
    try {
      hookResult = await processHook({ userId: uid, event: doc, impact })
    } catch (err) {
      doc.status = 'FAILED'
      doc.metadata = { ...(doc.metadata || {}), error: String(err.message || err).slice(0, 200) }
      await doc.save()
      return { duplicate: false, event: doc.toObject(), impact, notified: false, error: err.message }
    }
  }

  let notified = false
  if (changeImpactService.shouldNotify(impact, { urgency: normalized.urgency })) {
    try {
      const emit = io
        ? (room, event, payload) => io.to(room).emit(event, payload)
        : undefined
      await notificationService.createForUser(uid, {
        title: `Update: ${normalized.eventType.replace(/_/g, ' ').toLowerCase()}`,
        body: impact.reason,
        type: 'ai',
        priority: normalized.urgency === 'urgent' ? 'urgent' : 'normal',
        source: 'continuous-intelligence',
        dedupeKey: `intel:${idempotencyKey}`,
        link: '/student/command-center',
        meta: { eventType: normalized.eventType, entityId: normalized.entityId },
      }, { emit })
      notified = true
    } catch {
      // notification failure must not break event processing
    }
  }

  doc.status = 'PROCESSED'
  doc.processedAt = new Date()
  if (hookResult) doc.metadata = { ...(doc.metadata || {}), hook: true }
  await doc.save()

  if (io) {
    try {
      io.to(`user:${uid}`).emit('intelligence:event', {
        eventType: normalized.eventType,
        impact: impact.action,
        entityId: normalized.entityId,
      })
    } catch { /* optional */ }
  }

  return { duplicate: false, event: doc.toObject(), impact, notified, hookResult }
}

async function listEvents(userId, { limit = 20, eventType } = {}) {
  const uid = requireUserId(userId)
  const filter = { userId: uid }
  if (eventType && EVENT_TYPES.includes(eventType)) filter.eventType = eventType
  const items = await IntelligenceEvent.find(filter)
    .sort('-createdAt')
    .limit(Math.min(50, Math.max(1, Number(limit) || 20)))
    .lean()
  return items
}

module.exports = {
  EVENT_TYPES,
  publish,
  listEvents,
  buildIdempotencyKey,
  normalizeEvent,
}
