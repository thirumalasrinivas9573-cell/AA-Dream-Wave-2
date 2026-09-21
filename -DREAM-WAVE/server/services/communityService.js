const mongoose = require('mongoose')
const Post = require('../models/Post')
const CommunityFollow = require('../models/CommunityFollow')
const CollaborationRequest = require('../models/CollaborationRequest')
const CommunityReport = require('../models/CommunityReport')
const User = require('../models/User')
const UserProfile = require('../models/UserProfile')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const RecruitmentJob = require('../models/RecruitmentJob')
const RecruitmentInternship = require('../models/RecruitmentInternship')
const CampusOpportunity = require('../models/CampusOpportunity')
const { notifyUser } = require('./platformNotificationService')
const {
  POST_TYPES,
  LEGACY_TAG_TO_POST_TYPE,
  VISIBILITY,
  REACTION_TYPES,
  FEED_MODES,
} = require('../constants/community')
const { classifyPost, buildFeedSuggestions } = require('./communityAiService')

function oid(value) {
  return new mongoose.Types.ObjectId(value)
}

function err(message, statusCode = 400) {
  const e = new Error(message)
  e.statusCode = statusCode
  return e
}

function authorInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

async function resolveAuthorContext(user) {
  const base = {
    userId: user._id,
    authorName: user.name,
    authorInitials: authorInitials(user.name),
    authorRole: user.role === 'institution' || user.role === 'company' ? user.role : 'student',
    organizationId: null,
  }

  if (user.role === 'institution') {
    const inst = await Institution.findOne({ ownerUserId: user._id }).select('_id name')
    if (inst) {
      base.organizationId = inst._id
      base.authorName = inst.name || user.name
    }
  } else if (user.role === 'company') {
    const comp = await Company.findOne({ ownerUserId: user._id }).select('_id name')
    if (comp) {
      base.organizationId = comp._id
      base.authorName = comp.name || user.name
    }
  }

  return base
}

function canViewPost(post, viewerId, followingUserIds = new Set()) {
  const authorId = post.userId?.toString()
  const viewer = viewerId?.toString()
  if (!viewer) return post.visibility === 'public'
  if (authorId === viewer) return true

  switch (post.visibility) {
    case 'private':
      return false
    case 'followers':
      return followingUserIds.has(authorId)
    case 'shared':
    case 'public':
    default:
      return true
  }
}

function serializeReactions(post, viewerId) {
  const uid = viewerId?.toString()
  const liked = (post.likes || []).some((id) => id.toString() === uid)
  const insight = (post.reactions?.insight || []).some((id) => id.toString() === uid)
  const helpful = (post.reactions?.helpful || []).some((id) => id.toString() === uid)

  return {
    like: { count: post.likes?.length || 0, reactedByMe: liked },
    insight: { count: post.reactions?.insight?.length || 0, reactedByMe: insight },
    helpful: { count: post.reactions?.helpful?.length || 0, reactedByMe: helpful },
    likeCount: post.likes?.length || 0,
    likedByMe: liked,
  }
}

function serializePost(post, viewerId, extra = {}) {
  const p = post.toObject ? post.toObject() : post
  const reactions = serializeReactions(p, viewerId)
  const uid = viewerId?.toString()

  return {
    id: p._id.toString(),
    _id: p._id.toString(),
    userId: p.userId?.toString(),
    authorName: p.authorName,
    authorInitials: p.authorInitials,
    authorRole: p.authorRole,
    organizationId: p.organizationId?.toString() || null,
    title: p.title || '',
    content: p.content,
    tag: p.tag,
    postType: p.postType,
    visibility: p.visibility,
    linkedEntity: p.linkedEntity || null,
    comments: (p.comments || []).map((c, i) => ({
      id: c._id?.toString() || `c-${i}`,
      _id: c._id?.toString() || `c-${i}`,
      userId: c.userId?.toString(),
      name: c.name,
      content: c.content,
      createdAt: c.createdAt,
    })),
    ...reactions,
    bookmarkedByMe: (p.bookmarkedBy || []).some((id) => id.toString() === uid),
    commentCount: (p.comments || []).length,
    aiClassification: p.aiClassification || '',
    relevanceReason: extra.relevanceReason || null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

async function getFollowingUserIds(viewerId) {
  const follows = await CommunityFollow.find({
    followerUserId: viewerId,
    targetType: 'user',
  }).select('targetId')
  return new Set(follows.map((f) => f.targetId.toString()))
}

async function buildLinkedEntitySnapshot(user, linkedEntity) {
  if (!linkedEntity?.entityType || !linkedEntity?.entityId) return null

  const { entityType, entityId } = linkedEntity

  if (entityType === 'project') {
    const MJProject = mongoose.models.MJProject
    if (!MJProject) throw err('Project system unavailable', 503)
    const project = await MJProject.findOne({
      _id: entityId,
      userId: user._id.toString(),
      status: { $ne: 'archived' },
    }).lean()
    if (!project) throw err('Project not found or not accessible', 404)
    return {
      entityType: 'project',
      entityId: String(entityId),
      snapshot: {
        title: project.name,
        description: project.description || '',
        status: project.status,
        technologies: [],
      },
    }
  }

  if (entityType === 'job') {
    const job = await RecruitmentJob.findOne({
      _id: entityId,
      status: { $in: ['open', 'published'] },
    }).lean()
    if (!job) throw err('Job not found or not publicly available', 404)
    return {
      entityType: 'job',
      entityId: String(entityId),
      snapshot: {
        title: job.title,
        companyId: job.companyId?.toString(),
        location: job.location || '',
        employmentType: job.employmentType || '',
        deadline: job.deadline,
        status: job.status,
        requiredSkills: job.requiredSkills || [],
      },
    }
  }

  if (entityType === 'internship') {
    const internship = await RecruitmentInternship.findOne({
      _id: entityId,
      status: { $in: ['open', 'published'] },
    }).lean()
    if (!internship) throw err('Internship not found or not publicly available', 404)
    return {
      entityType: 'internship',
      entityId: String(entityId),
      snapshot: {
        title: internship.title,
        companyId: internship.companyId?.toString(),
        location: internship.location || '',
        duration: internship.duration || '',
        deadline: internship.deadline,
        status: internship.status,
        requiredSkills: internship.requiredSkills || [],
      },
    }
  }

  if (entityType === 'campus_opportunity') {
    const opp = await CampusOpportunity.findOne({
      _id: entityId,
      status: { $in: ['open', 'ongoing'] },
    }).lean()
    if (!opp) throw err('Opportunity not found or closed', 404)
    return {
      entityType: 'campus_opportunity',
      entityId: String(entityId),
      snapshot: {
        title: opp.title,
        opportunityType: opp.opportunityType,
        institutionId: opp.institutionId?.toString(),
        companyId: opp.companyId?.toString(),
        deadline: opp.deadline,
        status: opp.status,
        requiredSkills: opp.requiredSkills || [],
      },
    }
  }

  if (entityType === 'learning') {
    const MJLearning = mongoose.models.MJLearning
    if (!MJLearning) throw err('Learning system unavailable', 503)
    const learning = await MJLearning.findOne({
      _id: entityId,
      userId: user._id.toString(),
    }).lean()
    if (!learning) throw err('Learning record not found', 404)
    return {
      entityType: 'learning',
      entityId: String(entityId),
      snapshot: {
        topic: learning.topic,
        skillLevel: learning.skillLevel,
        progress: learning.progress,
      },
    }
  }

  throw err('Unsupported linked entity type', 400)
}

function computeRelevanceReason(post, profile, followingIds) {
  const authorId = post.userId?.toString()
  if (followingIds.has(authorId)) {
    return 'Because you follow this author.'
  }

  const userSkills = new Set((profile?.skills || []).map((s) => s.toLowerCase()))
  const postSkills = [
    ...(post.linkedEntity?.snapshot?.requiredSkills || []),
    ...(post.linkedEntity?.snapshot?.technologies || []),
    post.linkedEntity?.snapshot?.topic,
  ].filter(Boolean)

  for (const skill of postSkills) {
    if (userSkills.has(String(skill).toLowerCase())) {
      return `Because this content relates to ${skill} in your profile.`
    }
  }

  if (profile?.targetRole && post.postType === 'OPPORTUNITY') {
    return 'Because this is an opportunity related to your career interests.'
  }

  if (post.postType === 'PROJECT') return 'Because you may be interested in project collaboration.'
  if (post.postType === 'RESEARCH') return 'Because you may be interested in research activity.'

  return null
}

async function listFeed(user, filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 20))
  const skip = (page - 1) * limit
  const mode = FEED_MODES.includes(filters.mode) ? filters.mode : 'for_you'

  const query = {}
  if (mode === 'projects') query.postType = 'PROJECT'
  else if (mode === 'research') query.postType = 'RESEARCH'
  else if (mode === 'opportunities') query.postType = 'OPPORTUNITY'

  if (filters.postType && POST_TYPES.includes(filters.postType)) {
    query.postType = filters.postType
  }

  if (filters.q) {
    const escaped = String(filters.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (escaped) {
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { content: { $regex: escaped, $options: 'i' } },
      ]
    }
  }

  const [posts, followingIds, profile] = await Promise.all([
    Post.find(query).sort({ createdAt: -1 }).limit(200).lean(),
    getFollowingUserIds(user._id),
    UserProfile.findOne({ userId: user._id }).lean(),
  ])

  let visible = posts.filter((p) => canViewPost(p, user._id, followingIds))

  if (mode === 'following') {
    visible = visible.filter((p) => followingIds.has(p.userId?.toString()))
  }

  if (mode === 'for_you') {
    visible.sort((a, b) => {
      const score = (post) => {
        let s = 0
        if (followingIds.has(post.userId?.toString())) s += 3
        if (post.postType === 'OPPORTUNITY' && profile?.targetRole) s += 2
        if (post.linkedEntity?.snapshot) s += 1
        return s
      }
      return score(b) - score(a) || new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  const total = visible.length
  const pageItems = visible.slice(skip, skip + limit)

  return {
    posts: pageItems.map((p) =>
      serializePost(p, user._id, {
        relevanceReason: computeRelevanceReason(p, profile, followingIds),
      }),
    ),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
    mode,
  }
}

async function createPost(user, payload = {}) {
  const content = payload.content?.trim()
  if (!content) throw err('Content is required')

  const author = await resolveAuthorContext(user)
  const postType = POST_TYPES.includes(payload.postType)
    ? payload.postType
    : LEGACY_TAG_TO_POST_TYPE[payload.tag] || 'GENERAL'

  const visibility = VISIBILITY.includes(payload.visibility) ? payload.visibility : 'public'

  let linkedEntity = null
  if (payload.linkedEntity?.entityType && payload.linkedEntity?.entityId) {
    linkedEntity = await buildLinkedEntitySnapshot(user, payload.linkedEntity)
    if (!POST_TYPES.includes(payload.postType)) {
      const typeMap = {
        project: 'PROJECT',
        research: 'RESEARCH',
        learning: 'LEARNING',
        job: 'OPPORTUNITY',
        internship: 'OPPORTUNITY',
        campus_opportunity: 'OPPORTUNITY',
      }
      payload.postType = typeMap[linkedEntity.entityType] || postType
    }
  }

  const classification = await classifyPost({
    content,
    title: payload.title,
    postType: payload.postType || postType,
    linkedEntity,
  })

  const post = await Post.create({
    ...author,
    title: payload.title?.trim() || '',
    content,
    tag: payload.tag || 'General',
    postType: payload.postType || postType,
    visibility,
    linkedEntity,
    aiClassification: classification.classification,
    relevanceTags: classification.tags || [],
  })

  return serializePost(post, user._id)
}

async function updatePost(user, postId, payload = {}) {
  const post = await Post.findById(postId)
  if (!post) throw err('Post not found', 404)
  if (!post.userId.equals(user._id)) throw err('Not authorized to edit this post', 403)

  if (payload.content !== undefined) {
    const trimmed = payload.content?.trim()
    if (!trimmed) throw err('Content is required')
    post.content = trimmed
  }
  if (payload.title !== undefined) post.title = payload.title?.trim() || ''
  if (payload.visibility && VISIBILITY.includes(payload.visibility)) {
    post.visibility = payload.visibility
  }
  if (payload.postType && POST_TYPES.includes(payload.postType)) {
    post.postType = payload.postType
  }

  await post.save()
  return serializePost(post, user._id)
}

async function deletePost(user, postId) {
  const post = await Post.findOneAndDelete({ _id: postId, userId: user._id })
  if (!post) throw err('Post not found or not yours', 404)
  return { deleted: true }
}

async function getPost(user, postId) {
  const post = await Post.findById(postId)
  if (!post) throw err('Post not found', 404)

  const followingIds = await getFollowingUserIds(user._id)
  if (!canViewPost(post, user._id, followingIds)) throw err('Post not found', 404)

  const profile = await UserProfile.findOne({ userId: user._id }).lean()
  return serializePost(post, user._id, {
    relevanceReason: computeRelevanceReason(post, profile, followingIds),
  })
}

async function toggleReaction(user, postId, reactionType) {
  if (!REACTION_TYPES.includes(reactionType)) throw err('Invalid reaction type')

  const post = await Post.findById(postId)
  if (!post) throw err('Post not found', 404)

  const followingIds = await getFollowingUserIds(user._id)
  if (!canViewPost(post, user._id, followingIds)) throw err('Post not found', 404)

  const uid = user._id
  let reacted = false

  if (reactionType === 'like') {
    const exists = post.likes.some((id) => id.equals(uid))
    if (exists) {
      post.likes = post.likes.filter((id) => !id.equals(uid))
    } else {
      post.likes.push(uid)
      reacted = true
      if (!post.userId.equals(uid)) {
        await notifyUser({
          recipientUserId: post.userId,
          recipientRole: 'student',
          type: 'community_post_like',
          title: 'New reaction on your post',
          body: `${user.name} reacted to your community post.`,
          metadata: { postId: post._id.toString(), reactionType: 'like' },
          idempotencyKey: `like:${post._id}:${uid}`,
          actorUserId: user._id,
        }).catch(() => {})
      }
    }
  } else {
    if (!post.reactions) post.reactions = { insight: [], helpful: [] }
    const list = post.reactions[reactionType] || []
    const exists = list.some((id) => id.equals(uid))
    if (exists) {
      post.reactions[reactionType] = list.filter((id) => !id.equals(uid))
    } else {
      post.reactions[reactionType].push(uid)
      reacted = true
    }
    post.markModified('reactions')
  }

  await post.save()
  const serialized = serializePost(post, user._id)
  return {
    reactionType,
    reactedByMe: reactionType === 'like' ? serialized.likedByMe : serialized[reactionType]?.reactedByMe,
    count: reactionType === 'like' ? serialized.likeCount : serialized[reactionType]?.count,
    ...serialized,
  }
}

async function addComment(user, postId, content) {
  const trimmed = content?.trim()
  if (!trimmed) throw err('Comment content is required')

  const post = await Post.findById(postId)
  if (!post) throw err('Post not found', 404)

  const followingIds = await getFollowingUserIds(user._id)
  if (!canViewPost(post, user._id, followingIds)) throw err('Post not found', 404)

  post.comments.push({
    userId: user._id,
    name: user.name,
    content: trimmed.slice(0, 500),
  })
  await post.save()

  const comment = post.comments[post.comments.length - 1]

  if (!post.userId.equals(user._id)) {
    await notifyUser({
      recipientUserId: post.userId,
      recipientRole: 'student',
      type: 'community_post_comment',
      title: 'New comment on your post',
      body: `${user.name} commented on your community post.`,
      metadata: { postId: post._id.toString(), commentId: comment._id.toString() },
    }).catch(() => {})
  }

  return {
    comment: {
      id: comment._id.toString(),
      userId: user._id.toString(),
      name: user.name,
      content: comment.content,
      createdAt: comment.createdAt,
    },
    commentCount: post.comments.length,
  }
}

async function deleteComment(user, postId, commentId) {
  const post = await Post.findById(postId)
  if (!post) throw err('Post not found', 404)

  const comment = post.comments.id(commentId)
  if (!comment) throw err('Comment not found', 404)
  if (!comment.userId.equals(user._id) && !post.userId.equals(user._id)) {
    throw err('Not authorized to delete this comment', 403)
  }

  comment.deleteOne()
  await post.save()
  return { commentCount: post.comments.length }
}

async function toggleBookmark(user, postId) {
  const post = await Post.findById(postId)
  if (!post) throw err('Post not found', 404)

  const followingIds = await getFollowingUserIds(user._id)
  if (!canViewPost(post, user._id, followingIds)) throw err('Post not found', 404)

  const exists = post.bookmarkedBy.some((id) => id.equals(user._id))
  if (exists) {
    post.bookmarkedBy = post.bookmarkedBy.filter((id) => !id.equals(user._id))
  } else {
    post.bookmarkedBy.push(user._id)
  }
  await post.save()
  return { bookmarkedByMe: !exists }
}

async function listBookmarks(user, pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 20))
  const skip = (page - 1) * limit

  const query = { bookmarkedBy: user._id }
  const [posts, total] = await Promise.all([
    Post.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments(query),
  ])

  return {
    posts: posts.map((p) => serializePost(p, user._id)),
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 1,
  }
}

async function follow(user, targetType, targetId) {
  if (!['user', 'institution', 'company'].includes(targetType)) throw err('Invalid follow target type')
  if (targetType === 'user' && user._id.equals(targetId)) throw err('Cannot follow yourself')

  try {
    await CommunityFollow.create({
      followerUserId: user._id,
      targetType,
      targetId: oid(targetId),
    })
  } catch (e) {
    if (e.code === 11000) return { following: true, alreadyFollowing: true }
    throw e
  }

  if (targetType === 'user') {
    await notifyUser({
      recipientUserId: oid(targetId),
      recipientRole: 'student',
      type: 'community_new_follower',
      title: 'New follower',
      body: `${user.name} started following you.`,
      metadata: { followerUserId: user._id.toString() },
    }).catch(() => {})
  }

  return { following: true }
}

async function unfollow(user, targetType, targetId) {
  const result = await CommunityFollow.findOneAndDelete({
    followerUserId: user._id,
    targetType,
    targetId: oid(targetId),
  })
  if (!result) throw err('Follow relationship not found', 404)
  return { following: false }
}

async function listFollowing(user) {
  const follows = await CommunityFollow.find({ followerUserId: user._id }).lean()
  return {
    following: follows.map((f) => ({
      targetType: f.targetType,
      targetId: f.targetId.toString(),
      createdAt: f.createdAt,
    })),
    total: follows.length,
  }
}

async function createCollaborationRequest(user, payload = {}) {
  const targetUserId = payload.targetUserId
  if (!targetUserId) throw err('targetUserId is required')
  if (user._id.equals(targetUserId)) throw err('Cannot collaborate with yourself')

  const target = await User.findById(targetUserId)
  if (!target) throw err('Target user not found', 404)

  try {
    const request = await CollaborationRequest.create({
      requesterUserId: user._id,
      targetUserId: oid(targetUserId),
      postId: payload.postId || null,
      linkedEntityType: payload.linkedEntityType || '',
      linkedEntityId: payload.linkedEntityId || '',
      message: payload.message?.trim() || '',
      status: 'pending',
    })

    await notifyUser({
      recipientUserId: oid(targetUserId),
      recipientRole: target.role === 'company' ? 'company' : target.role === 'institution' ? 'institution' : 'student',
      type: 'community_collaboration_request',
      title: 'Collaboration request',
      body: `${user.name} wants to collaborate${payload.message ? `: ${payload.message.slice(0, 80)}` : '.'}`,
      metadata: { requestId: request._id.toString(), postId: payload.postId || null },
    }).catch(() => {})

    return {
      id: request._id.toString(),
      status: request.status,
      message: request.message,
    }
  } catch (e) {
    if (e.code === 11000) throw err('Collaboration request already pending', 409)
    throw e
  }
}

async function respondCollaborationRequest(user, requestId, action) {
  const request = await CollaborationRequest.findById(requestId)
  if (!request) throw err('Request not found', 404)
  if (!request.targetUserId.equals(user._id)) throw err('Not authorized', 403)
  if (request.status !== 'pending') throw err('Request already responded', 409)

  request.status = action === 'accept' ? 'accepted' : 'declined'
  request.respondedAt = new Date()
  await request.save()

  const type = action === 'accept' ? 'community_collaboration_accepted' : 'community_collaboration_declined'
  await notifyUser({
    recipientUserId: request.requesterUserId,
    recipientRole: 'student',
    type,
    title: action === 'accept' ? 'Collaboration accepted' : 'Collaboration declined',
    body: `${user.name} ${action === 'accept' ? 'accepted' : 'declined'} your collaboration request.`,
    metadata: { requestId: request._id.toString() },
  }).catch(() => {})

  return { id: request._id.toString(), status: request.status }
}

async function listCollaborationRequests(user, role = 'incoming') {
  const query =
    role === 'outgoing'
      ? { requesterUserId: user._id }
      : { targetUserId: user._id }

  const requests = await CollaborationRequest.find(query).sort({ createdAt: -1 }).limit(50).lean()
  return {
    requests: requests.map((r) => ({
      id: r._id.toString(),
      requesterUserId: r.requesterUserId.toString(),
      targetUserId: r.targetUserId.toString(),
      postId: r.postId?.toString() || null,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
    })),
    total: requests.length,
  }
}

async function reportPost(user, postId, payload = {}) {
  const { REPORT_REASONS } = require('../constants/community')
  if (!REPORT_REASONS.includes(payload.reason)) throw err('Invalid report reason')

  const post = await Post.findById(postId)
  if (!post) throw err('Post not found', 404)

  try {
    await CommunityReport.create({
      reporterUserId: user._id,
      postId: post._id,
      reason: payload.reason,
      detail: payload.detail?.trim() || '',
    })
    post.reportCount = (post.reportCount || 0) + 1
    await post.save()
  } catch (e) {
    if (e.code === 11000) throw err('You already reported this post', 409)
    throw e
  }

  return { reported: true }
}

async function searchCommunity(user, q, filters = {}) {
  const escaped = String(q || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escaped) return { posts: [], users: [], total: 0 }

  const followingIds = await getFollowingUserIds(user._id)
  const posts = await Post.find({
    $or: [
      { title: { $regex: escaped, $options: 'i' } },
      { content: { $regex: escaped, $options: 'i' } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean()

  const visiblePosts = posts
    .filter((p) => canViewPost(p, user._id, followingIds))
    .map((p) => serializePost(p, user._id))

  const users = await User.find({
    name: { $regex: escaped, $options: 'i' },
    role: { $in: ['student', 'institution', 'company'] },
  })
    .select('name role')
    .limit(10)
    .lean()

  return {
    posts: visiblePosts,
    users: users.map((u) => ({ id: u._id.toString(), name: u.name, role: u.role })),
    total: visiblePosts.length + users.length,
  }
}

async function getPostAiSuggestions(user, postId) {
  const post = await getPost(user, postId)
  return buildFeedSuggestions(post)
}

module.exports = {
  listFeed,
  createPost,
  updatePost,
  deletePost,
  getPost,
  toggleReaction,
  addComment,
  deleteComment,
  toggleBookmark,
  listBookmarks,
  follow,
  unfollow,
  listFollowing,
  createCollaborationRequest,
  respondCollaborationRequest,
  listCollaborationRequests,
  reportPost,
  searchCommunity,
  getPostAiSuggestions,
  serializePost,
  canViewPost,
}
