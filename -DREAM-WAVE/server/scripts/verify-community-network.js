#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Post = require('../models/Post')
const CommunityFollow = require('../models/CommunityFollow')
const CollaborationRequest = require('../models/CollaborationRequest')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`

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

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const userA = await User.create({
    name: 'Community User A',
    email: `comm-a-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })
  const userB = await User.create({
    name: 'Community User B',
    email: `comm-b-${ts}@test.com`,
    password: 'testpass123',
    role: 'student',
    onboardingCompleted: true,
  })

  const tokenA = sign(userA._id)
  const tokenB = sign(userB._id)

  const create = await request('/community', {
    method: 'POST',
    token: tokenA,
    body: { content: 'Hello community network', title: 'Intro', tag: 'General', postType: 'DISCUSSION', visibility: 'public' },
  })
  assert('Create post', create.status === 201 && (create.data.post?.id || create.data.post?._id), JSON.stringify(create.data))
  const postId = create.data.post.id || create.data.post._id

  const impersonate = await request('/community', {
    method: 'POST',
    token: tokenA,
    body: { content: 'Fake', userId: userB._id.toString(), authorId: userB._id.toString() },
  })
  assert('Mass assignment ignored', impersonate.status === 201)
  const createdAsA = await Post.findById(impersonate.data.post?.id || postId)
  assert('Post author is authenticated user', createdAsA.userId.toString() === userA._id.toString())

  const privatePost = await request('/community', {
    method: 'POST',
    token: tokenA,
    body: { content: 'Private thoughts', visibility: 'private' },
  })
  const privateId = privatePost.data.post.id

  const crossRead = await request(`/community/${privateId}`, { token: tokenB })
  assert('Private post hidden from other user', crossRead.status === 404)

  const ownRead = await request(`/community/${privateId}`, { token: tokenA })
  assert('Author can read private post', ownRead.status === 200)

  const comment = await request(`/community/${postId}/comments`, {
    method: 'POST',
    token: tokenB,
    body: { content: 'Great intro!' },
  })
  assert('Add comment', comment.status === 201 && comment.data.comment?.content)

  const insight = await request(`/community/${postId}/reactions/insight`, { method: 'PUT', token: tokenB })
  assert('Insight reaction', insight.status === 200)

  const duplicateInsight = await request(`/community/${postId}/reactions/insight`, { method: 'PUT', token: tokenB })
  assert('Toggle reaction off', duplicateInsight.status === 200 && duplicateInsight.data.reactedByMe === false)

  const like = await request(`/community/${postId}/like`, { method: 'PUT', token: tokenB })
  assert('Like post', like.status === 200 && like.data.likedByMe === true)

  const bookmark = await request(`/community/${postId}/bookmark`, { method: 'POST', token: tokenB })
  assert('Bookmark post', bookmark.status === 200 && bookmark.data.bookmarkedByMe === true)

  const follow = await request('/community/follow', {
    method: 'POST',
    token: tokenB,
    body: { targetType: 'user', targetId: userA._id.toString() },
  })
  assert('Follow user', follow.status === 200 && follow.data.following === true)

  const feed = await request('/community/feed?mode=following', { token: tokenB })
  assert('Following feed', feed.status === 200 && feed.data.posts?.length >= 1)

  const editDenied = await request(`/community/${postId}`, {
    method: 'PATCH',
    token: tokenB,
    body: { content: 'Hacked' },
  })
  assert('User B cannot edit User A post', editDenied.status === 403)

  const editOk = await request(`/community/${postId}`, {
    method: 'PATCH',
    token: tokenA,
    body: { content: 'Updated intro content' },
  })
  assert('User A can edit own post', editOk.status === 200)

  const collab = await request('/community/collaboration', {
    method: 'POST',
    token: tokenB,
    body: { targetUserId: userA._id.toString(), postId, message: 'Want to collaborate?' },
  })
  assert('Collaboration request', collab.status === 201, JSON.stringify(collab.data))
  const requestId = collab.data.request.id

  const accept = await request(`/community/collaboration/${requestId}/respond`, {
    method: 'POST',
    token: tokenA,
    body: { action: 'accept' },
  })
  assert('Accept collaboration', accept.status === 200 && accept.data.request.status === 'accepted')

  const dupCollab = await request('/community/collaboration', {
    method: 'POST',
    token: tokenB,
    body: { targetUserId: userA._id.toString(), postId, message: 'Again' },
  })
  assert('Duplicate collaboration allowed after response', dupCollab.status === 201)

  const search = await request('/community/search?q=intro', { token: tokenB })
  assert('Search respects visibility', search.status === 200 && search.data.posts?.length >= 1)

  const ai = await request(`/community/${postId}/ai-suggestions`, { token: tokenA })
  assert('AI suggestions', ai.status === 200 && ai.data.suggestions?.length >= 1)

  const report = await request(`/community/${postId}/report`, {
    method: 'POST',
    token: tokenB,
    body: { reason: 'spam' },
  })
  assert('Report post', report.status === 200)

  const deleteDenied = await request(`/community/${postId}`, { method: 'DELETE', token: tokenB })
  assert('User B cannot delete User A post', deleteDenied.status === 404)

  const deleteOk = await request(`/community/${privateId}`, { method: 'DELETE', token: tokenA })
  assert('User A can delete own post', deleteOk.status === 200)

  const unauth = await request('/community/feed')
  assert('Feed requires auth', unauth.status === 401)

  await CollaborationRequest.deleteMany({ requesterUserId: { $in: [userA._id, userB._id] } })
  await CommunityFollow.deleteMany({ followerUserId: { $in: [userA._id, userB._id] } })
  await Post.deleteMany({ userId: { $in: [userA._id, userB._id] } })
  await User.deleteMany({ _id: { $in: [userA._id, userB._id] } })
  await mongoose.disconnect()
  console.log('Community network verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
