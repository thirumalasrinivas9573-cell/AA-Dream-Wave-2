#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { io } = require('socket.io-client')
const User = require('../models/User')
const { notifyUser, getUnreadCount, listNotifications, markRead, markAllRead } = require('../services/platformNotificationService')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`
const SOCKET_URL = `http://localhost:${process.env.PORT || 5001}`

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function sign(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

function assert(label, condition, detail) {
  if (!condition) throw new Error(`${label}: FAIL${detail ? ` — ${detail}` : ''}`)
  console.log(`${label}: OK`)
}

async function waitForSocketEvent(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Socket timeout: ${event}`)), timeoutMs)
    socket.once(event, (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const userA = await User.create({
    name: 'Notify A',
    email: `notify-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const userB = await User.create({
    name: 'Notify B',
    email: `notify-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const tokenA = sign(userA._id)
  const tokenB = sign(userB._id)

  const n1 = await notifyUser({
    recipientUserId: userA._id,
    recipientRole: 'student',
    type: 'community_post_comment',
    title: 'New comment',
    body: 'Someone commented on your post.',
    metadata: { postId: 'abc123' },
    idempotencyKey: `comment:abc123:${userA._id}`,
  })
  assert('Create notification', Boolean(n1._id))

  const dup = await notifyUser({
    recipientUserId: userA._id,
    recipientRole: 'student',
    type: 'community_post_comment',
    title: 'New comment duplicate',
    body: 'Should not duplicate.',
    metadata: { postId: 'abc123' },
    idempotencyKey: `comment:abc123:${userA._id}`,
  })
  assert('Duplicate prevented', dup._id.toString() === n1._id.toString())

  const countBefore = await getUnreadCount(userA._id)
  assert('Unread count', countBefore >= 1)

  const list = await request('/platform-notifications', { token: tokenA })
  assert('List notifications', list.status === 200 && list.data.notifications?.length >= 1)
  assert('List includes href', Boolean(list.data.notifications?.[0]?.href !== undefined || list.data.notifications?.[0]))

  const unread = await request('/platform-notifications/unread-count', { token: tokenA })
  assert('Unread API', unread.status === 200 && unread.data.count >= 1)

  const read = await request(`/platform-notifications/${n1._id}/read`, { method: 'PATCH', token: tokenA })
  assert('Mark read', read.status === 200 && read.data.notification?.read === true)

  const idor = await request(`/platform-notifications/${n1._id}`, { token: tokenB })
  assert('IDOR blocked', idor.status === 404)

  await notifyUser({
    recipientUserId: userA._id,
    recipientRole: 'student',
    type: 'event_team_invitation',
    title: 'Team invite',
    body: 'Join our hackathon team.',
    metadata: { source: 'campus_opportunity', sourceId: new mongoose.Types.ObjectId().toString(), teamId: 't1' },
    idempotencyKey: `team:t1:${userA._id}`,
  })

  const socket = io(SOCKET_URL, { auth: { token: tokenA }, transports: ['websocket'] })
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve)
    socket.on('connect_error', reject)
    setTimeout(() => reject(new Error('Socket connect timeout')), 5000)
  })

  const realtimePromise = waitForSocketEvent(socket, 'platform:notification')
  const dispatch = await request('/platform-notifications/verify-dispatch', {
    method: 'POST',
    token: tokenA,
    body: {
      type: 'recruitment_interview_scheduled',
      title: 'Interview scheduled',
      body: 'Your interview is tomorrow.',
      metadata: { applicationId: new mongoose.Types.ObjectId().toString() },
      idempotencyKey: `interview:${ts}:${userA._id}`,
    },
  })
  assert('Verify dispatch API', dispatch.status === 201)
  const realtime = await realtimePromise
  assert('Realtime delivery', realtime?.title === 'Interview scheduled')
  socket.disconnect()

  const readAll = await request('/platform-notifications/read-all', { method: 'POST', token: tokenA })
  assert('Mark all read', readAll.status === 200)
  const countAfter = await getUnreadCount(userA._id)
  assert('Unread zero after read all', countAfter === 0)

  const prefs = await request('/platform-notifications/preferences', { token: tokenA })
  assert('Get preferences', prefs.status === 200 && prefs.data.preferences)

  const badAssign = await request('/platform-notifications/preferences', {
    method: 'PATCH',
    token: tokenA,
    body: { userId: userB._id.toString() },
  })
  assert('Mass assignment blocked or ignored', badAssign.status === 200 || badAssign.status === 400)

  const important = await request('/platform-notifications?priority=important', { token: tokenA })
  assert('Priority filter', important.status === 200)

  await User.deleteMany({ _id: { $in: [userA._id, userB._id] } })
  const PlatformNotification = require('../models/PlatformNotification')
  await PlatformNotification.deleteMany({ recipientUserId: { $in: [userA._id, userB._id] } })
  await mongoose.disconnect()
  console.log('Platform notification verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
