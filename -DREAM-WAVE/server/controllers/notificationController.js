const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const notificationService = require('../services/notificationService')

const fail = (res, status, message, code = 'NOTIFICATION_ERROR') => res.status(status).json({ success: false, code, message })
const validId = (value) => mongoose.isValidObjectId(value)
const emitFrom = (req) => (room, event, payload) => req.app?.get('io')?.to(room).emit(event, payload)

exports.listMine = async (req, res) => {
  try {
    const result = await notificationService.listForUser(req.user._id, req.query)
    return res.json({ success: true, ...result })
  } catch (error) {
    return fail(res, 500, 'Failed to load notifications')
  }
}

exports.markRead = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Notification not found', 'NOT_FOUND')
    const item = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } },
      { new: true, runValidators: true },
    )
    if (!item) return fail(res, 404, 'Notification not found', 'NOT_FOUND')
    return res.json({ success: true, item })
  } catch (error) {
    return fail(res, 500, 'Failed to mark notification as read')
  }
}

exports.markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, archivedAt: null, read: false },
      { $set: { read: true } },
    )
    return res.json({ success: true, updated: result.modifiedCount })
  } catch (error) {
    return fail(res, 500, 'Failed to mark notifications as read')
  }
}

async function mutateMine(req, res, update, successKey) {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Notification not found', 'NOT_FOUND')
    const item = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true, runValidators: true },
    )
    if (!item) return fail(res, 404, 'Notification not found', 'NOT_FOUND')
    req.app?.get('io')?.to(`user:${req.user._id}`).emit('notification:updated', item.toObject())
    return res.json({ success: true, item, [successKey]: true })
  } catch (error) {
    if (error.name === 'ValidationError') return fail(res, 400, error.message, 'VALIDATION_ERROR')
    return fail(res, 500, 'Failed to update notification')
  }
}

exports.archive = (req, res) => mutateMine(req, res, { $set: { archivedAt: new Date(), pinnedAt: null } }, 'archived')
exports.restore = (req, res) => mutateMine(req, res, { $set: { archivedAt: null } }, 'restored')
exports.pin = (req, res) => mutateMine(req, res, { $set: { pinnedAt: req.body.pinned === false ? null : new Date() } }, 'pinned')
exports.setPriority = (req, res) => {
  if (!notificationService.PRIORITIES.includes(req.body.priority)) return fail(res, 400, 'Invalid notification priority', 'VALIDATION_ERROR')
  return mutateMine(req, res, { $set: { priority: req.body.priority } }, 'prioritized')
}

exports.remove = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, 'Notification not found', 'NOT_FOUND')
    const item = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!item) return fail(res, 404, 'Notification not found', 'NOT_FOUND')
    req.app?.get('io')?.to(`user:${req.user._id}`).emit('notification:deleted', { id: item._id })
    return res.json({ success: true, deleted: true, id: item._id })
  } catch (error) {
    return fail(res, 500, 'Failed to delete notification')
  }
}

exports.create = async (req, res) => {
  try {
    const item = await notificationService.createForUser(req.body.userId, req.body, {
      validateRecipient: true,
      emit: emitFrom(req),
    })
    return res.status(201).json({ success: true, item })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.statusCode ? error.message : 'Failed to create notification', error.code)
  }
}

exports.createForUser = (userId, data) => notificationService.createForUser(userId, data)
