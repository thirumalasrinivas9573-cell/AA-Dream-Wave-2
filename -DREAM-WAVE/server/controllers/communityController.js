const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const Post = require('../models/Post')
const { POST_TYPES, TAG_TO_TYPE } = require('../models/Post')
const StudentFollow = require('../models/StudentFollow')
const StudentBlock = require('../models/StudentBlock')
const Bookmark = require('../models/Bookmark')
const ContentReport = require('../models/ContentReport')
const LearningGroup = require('../models/LearningGroup')
const CollaborationRequest = require('../models/CollaborationRequest')
const StudentProfile = require('../models/StudentProfile')
const User = require('../models/User')
const Task = require('../models/Task')
const notificationService = require('../services/notificationService')
const communityService = require('../services/communityService')
const communityIntelligence = require('../services/communityIntelligenceService')

const MEDIA_ROOT = path.resolve(process.env.COMMUNITY_MEDIA_ROOT || path.join(process.cwd(), 'uploads', 'community-media'))
const TAGS = ['General', 'Achievement', 'Question', 'Resource', 'Project']
const REPORT_REASONS = ['Spam', 'Harassment', 'Impersonation', 'Unsafe Content', 'Misleading Content', 'Other']

const fail = (res, status, message, code = 'COMMUNITY_ERROR') => res.status(status).json({ success: false, code, message })
const ok = (res, payload = {}, status = 200) => res.status(status).json({ success: true, ...payload })

const safeUrl = (value) => {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol)) return ''
    return url.toString().slice(0, 1000)
  } catch {
    if (String(value).startsWith('/api/community/media/')) return String(value).slice(0, 1000)
    return ''
  }
}

function cleanStringList(value, max = 8, itemMax = 60) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => communityService.text(item, itemMax)).filter(Boolean))].slice(0, max)
}

function mapTagToPostType(tag, postType) {
  const normalized = communityService.text(postType, 40).toUpperCase()
  if (POST_TYPES.includes(normalized)) return normalized
  return TAG_TO_TYPE[tag] || 'GENERAL'
}

function cleanPostPayload(body, { partial = false } = {}) {
  const allowed = partial
    ? ['content', 'tag', 'postType', 'visibility', 'topics', 'skills', 'projectId', 'libraryBookId', 'groupId', 'collaborationId', 'achievementRef', 'media']
    : ['content', 'tag', 'postType', 'visibility', 'topics', 'skills', 'projectId', 'libraryBookId', 'groupId', 'collaborationId', 'achievementRef', 'media']
  const payload = {}
  for (const key of allowed) {
    if (body[key] === undefined) continue
    if (key === 'content') payload.content = communityService.text(body.content, 5000)
    else if (key === 'tag') payload.tag = TAGS.includes(body.tag) ? body.tag : 'General'
    else if (key === 'postType') payload.postType = mapTagToPostType(body.tag, body.postType)
    else if (key === 'visibility') payload.visibility = ['PUBLIC', 'FOLLOWERS', 'PRIVATE'].includes(body.visibility) ? body.visibility : 'PUBLIC'
    else if (key === 'topics') payload.topics = cleanStringList(body.topics)
    else if (key === 'skills') payload.skills = cleanStringList(body.skills)
    else if (key === 'projectId') payload.projectId = communityService.text(body.projectId, 80)
    else if (key === 'libraryBookId') payload.libraryBookId = mongoose.isValidObjectId(body.libraryBookId) ? body.libraryBookId : null
    else if (key === 'groupId') payload.groupId = mongoose.isValidObjectId(body.groupId) ? body.groupId : null
    else if (key === 'collaborationId') payload.collaborationId = mongoose.isValidObjectId(body.collaborationId) ? body.collaborationId : null
    else if (key === 'achievementRef' && body.achievementRef && typeof body.achievementRef === 'object') {
      const validTypes = ['certificate', 'goal', 'project', 'milestone', 'hackathon', 'other']
      const refType = communityService.text(body.achievementRef.type, 40)
      if (validTypes.includes(refType)) {
        payload.achievementRef = {
          type: refType,
          refId: communityService.text(body.achievementRef.refId, 80),
          label: communityService.text(body.achievementRef.label, 200),
        }
      }
    } else if (key === 'media' && Array.isArray(body.media)) {
      payload.media = body.media.slice(0, 6).map((item) => ({
        url: safeUrl(item.url),
        type: item.type === 'video' ? 'video' : 'image',
        mimeType: communityService.text(item.mimeType, 80),
        filename: communityService.text(item.filename, 200),
        size: Math.max(0, Number(item.size) || 0),
      })).filter((item) => item.url)
    }
  }
  if (payload.tag && !payload.postType) payload.postType = mapTagToPostType(payload.tag, body.postType)
  return payload
}

async function notifyUser(userId, data) {
  try {
    await notificationService.createForUser(userId, data)
  } catch (error) {
    if (error.code !== 11000) console.error('[community.notify]', error.message)
  }
}

async function serializePost(post, viewerId) {
  const [mapped] = await communityService.attachEngagement(
    await communityService.attachAuthors([post]),
    viewerId,
  )
  return mapped
}

// Legacy alias
exports.getPosts = async (req, res) => exports.getFeed(req, res)

exports.getFeed = async (req, res) => {
  try {
    const tab = communityService.text(req.query.tab || 'for-you', 30).toLowerCase()
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50)
    const { posts, nextCursor } = await communityService.fetchFeed({
      viewerId: req.user._id,
      tab,
      postType: req.query.postType,
      topic: req.query.topic,
      groupId: req.query.groupId,
      limit,
      cursor: req.query.cursor,
    })
    return ok(res, { posts, nextCursor, tab })
  } catch (error) {
    console.error('[community.getFeed]', error.message)
    return fail(res, 500, 'Failed to load feed.')
  }
}

exports.getTrending = async (req, res) => {
  try {
    const topics = await communityService.getTrendingTopics(Math.min(Number(req.query.limit) || 8, 20))
    return ok(res, { topics })
  } catch (error) {
    console.error('[community.getTrending]', error.message)
    return fail(res, 500, 'Failed to load trending topics.')
  }
}

exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean()
    if (!post || post.status === 'removed') return fail(res, 404, 'Post not found.', 'NOT_FOUND')
    const allowed = await communityService.canViewPost(post, req.user._id)
    if (!allowed) return fail(res, 403, 'You cannot view this post.', 'FORBIDDEN')
    await Post.updateOne({ _id: post._id }, { $inc: { viewCount: 1 } })
    return ok(res, { post: await serializePost(post, req.user._id) })
  } catch (error) {
    console.error('[community.getPost]', error.message)
    return fail(res, 500, 'Failed to load post.')
  }
}

exports.createPost = async (req, res) => {
  try {
    const payload = cleanPostPayload(req.body)
    if (!payload.content) return fail(res, 400, 'Content is required.', 'VALIDATION_ERROR')
    if (payload.groupId) {
      const group = await LearningGroup.findById(payload.groupId)
      if (!group || group.status !== 'active') return fail(res, 404, 'Group not found.', 'NOT_FOUND')
      const member = group.members.find((m) => String(m.userId) === String(req.user._id))
      if (group.visibility === 'PRIVATE' && !member) return fail(res, 403, 'Private group membership required.', 'FORBIDDEN')
    }
    const post = await Post.create({ ...payload, userId: req.user._id, status: 'published' })
    return ok(res, { post: await serializePost(post.toObject(), req.user._id) }, 201)
  } catch (error) {
    console.error('[community.createPost]', error.message)
    return fail(res, 500, 'Failed to create post.')
  }
}

exports.updatePost = async (req, res) => {
  try {
    const payload = cleanPostPayload(req.body, { partial: true })
    if (payload.content !== undefined && !payload.content) return fail(res, 400, 'Content cannot be empty.', 'VALIDATION_ERROR')
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id, status: { $ne: 'removed' } })
    if (!post) return fail(res, 404, 'Post not found or not yours.', 'NOT_FOUND')
    Object.assign(post, payload)
    await post.save()
    return ok(res, { post: await serializePost(post.toObject(), req.user._id) })
  } catch (error) {
    console.error('[community.updatePost]', error.message)
    return fail(res, 500, 'Failed to update post.')
  }
}

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id })
    if (!post) return fail(res, 404, 'Post not found or not yours.', 'NOT_FOUND')
    post.status = 'removed'
    await post.save()
    return ok(res)
  } catch (error) {
    console.error('[community.deletePost]', error.message)
    return fail(res, 500, 'Failed to delete post.')
  }
}

exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post || post.status !== 'published') return fail(res, 404, 'Post not found.', 'NOT_FOUND')
    const allowed = await communityService.canViewPost(post, req.user._id)
    if (!allowed) return fail(res, 403, 'You cannot interact with this post.', 'FORBIDDEN')
    const uid = req.user._id
    const liked = post.likes.some((id) => id.equals(uid))
    if (liked) post.likes = post.likes.filter((id) => !id.equals(uid))
    else post.likes.push(uid)
    await post.save()
    if (!liked && String(post.userId) !== String(uid)) {
      await notifyUser(post.userId, {
        type: 'follow',
        title: 'New reaction on your post',
        body: `${req.user.name || 'A student'} reacted to your post.`,
        link: '/student/community',
        dedupeKey: `post-like:${post._id}:${uid}`,
      })
    }
    return ok(res, { likeCount: post.likeCount, likedByMe: !liked })
  } catch (error) {
    console.error('[community.toggleLike]', error.message)
    return fail(res, 500, 'Failed to update reaction.')
  }
}

exports.toggleBookmark = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post || post.status !== 'published') return fail(res, 404, 'Post not found.', 'NOT_FOUND')
    const allowed = await communityService.canViewPost(post, req.user._id)
    if (!allowed) return fail(res, 403, 'You cannot save this post.', 'FORBIDDEN')
    const existing = await Bookmark.findOne({ studentId: req.user._id, targetType: 'post', targetId: post._id })
    if (existing) {
      await existing.deleteOne()
      await Post.updateOne({ _id: post._id }, { $inc: { saveCount: -1 } })
      return ok(res, { saved: false })
    }
    await Bookmark.create({ studentId: req.user._id, targetType: 'post', targetId: post._id })
    await Post.updateOne({ _id: post._id }, { $inc: { saveCount: 1 } })
    return ok(res, { saved: true })
  } catch (error) {
    if (error.code === 11000) return ok(res, { saved: true })
    console.error('[community.toggleBookmark]', error.message)
    return fail(res, 500, 'Failed to update bookmark.')
  }
}

exports.getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('comments userId visibility status').lean()
    if (!post || post.status !== 'published') return fail(res, 404, 'Post not found.', 'NOT_FOUND')
    const allowed = await communityService.canViewPost(post, req.user._id)
    if (!allowed) return fail(res, 403, 'You cannot view comments.', 'FORBIDDEN')
    const comments = (post.comments || []).filter((c) => c.status !== 'removed')
    const userIds = [...new Set(comments.map((c) => String(c.userId)))]
    const users = await User.find({ _id: { $in: userIds } }).select('name profileImage').lean()
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]))
    return ok(res, {
      comments: comments.map((c) => ({
        ...c,
        authorName: userMap[String(c.userId)]?.name || 'Student',
        authorPhoto: userMap[String(c.userId)]?.profileImage || '',
        isMine: String(c.userId) === String(req.user._id),
      })),
    })
  } catch (error) {
    console.error('[community.getComments]', error.message)
    return fail(res, 500, 'Failed to load comments.')
  }
}

exports.addComment = async (req, res) => {
  try {
    const content = communityService.text(req.body.content, 2000)
    if (!content) return fail(res, 400, 'Comment content is required.', 'VALIDATION_ERROR')
    const post = await Post.findById(req.params.id)
    if (!post || post.status !== 'published') return fail(res, 404, 'Post not found.', 'NOT_FOUND')
    const allowed = await communityService.canViewPost(post, req.user._id)
    if (!allowed) return fail(res, 403, 'You cannot comment on this post.', 'FORBIDDEN')
    let parentCommentId = null
    if (req.body.parentCommentId && mongoose.isValidObjectId(req.body.parentCommentId)) {
      const parent = post.comments.id(req.body.parentCommentId)
      if (parent && parent.status !== 'removed' && !parent.parentCommentId) parentCommentId = parent._id
    }
    post.comments.push({ userId: req.user._id, content, parentCommentId })
    await post.save()
    const comment = post.comments[post.comments.length - 1]
    if (String(post.userId) !== String(req.user._id)) {
      await notifyUser(post.userId, {
        type: 'system',
        title: 'New comment on your post',
        body: `${req.user.name || 'A student'} commented on your post.`,
        link: '/student/community',
        dedupeKey: `post-comment:${post._id}:${comment._id}`,
      })
    }
    return ok(res, { comment: { ...comment.toObject(), authorName: req.user.name, isMine: true } }, 201)
  } catch (error) {
    console.error('[community.addComment]', error.message)
    return fail(res, 500, 'Failed to add comment.')
  }
}

exports.updateComment = async (req, res) => {
  try {
    const content = communityService.text(req.body.content, 2000)
    if (!content) return fail(res, 400, 'Comment content is required.', 'VALIDATION_ERROR')
    const post = await Post.findById(req.params.id)
    if (!post) return fail(res, 404, 'Post not found.', 'NOT_FOUND')
    const comment = post.comments.id(req.params.commentId)
    if (!comment || comment.status === 'removed') return fail(res, 404, 'Comment not found.', 'NOT_FOUND')
    if (String(comment.userId) !== String(req.user._id)) return fail(res, 403, 'You can only edit your own comments.', 'FORBIDDEN')
    comment.content = content
    comment.editedAt = new Date()
    await post.save()
    return ok(res, { comment })
  } catch (error) {
    console.error('[community.updateComment]', error.message)
    return fail(res, 500, 'Failed to update comment.')
  }
}

exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) return fail(res, 404, 'Post not found.', 'NOT_FOUND')
    const comment = post.comments.id(req.params.commentId)
    if (!comment || comment.status === 'removed') return fail(res, 404, 'Comment not found.', 'NOT_FOUND')
    if (String(comment.userId) !== String(req.user._id)) return fail(res, 403, 'You can only delete your own comments.', 'FORBIDDEN')
    comment.status = 'removed'
    await post.save()
    return ok(res)
  } catch (error) {
    console.error('[community.deleteComment]', error.message)
    return fail(res, 500, 'Failed to delete comment.')
  }
}

exports.markHelpfulComment = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id })
    if (!post) return fail(res, 403, 'Only the post author can mark helpful answers.', 'FORBIDDEN')
    const comment = post.comments.id(req.params.commentId)
    if (!comment || comment.status === 'removed') return fail(res, 404, 'Comment not found.', 'NOT_FOUND')
    for (const c of post.comments) c.helpful = false
    comment.helpful = true
    post.acceptedCommentId = comment._id
    await post.save()
    return ok(res, { acceptedCommentId: comment._id })
  } catch (error) {
    console.error('[community.markHelpfulComment]', error.message)
    return fail(res, 500, 'Failed to mark helpful comment.')
  }
}

exports.reportContent = async (req, res) => {
  try {
    const targetType = communityService.text(req.body.targetType, 30)
    const reason = communityService.text(req.body.reason, 80)
    const targetId = req.body.targetId
    if (!['post', 'comment', 'project', 'group', 'profile', 'media'].includes(targetType)) {
      return fail(res, 400, 'Invalid report target.', 'VALIDATION_ERROR')
    }
    if (!mongoose.isValidObjectId(targetId)) return fail(res, 400, 'Invalid target id.', 'VALIDATION_ERROR')
    if (!REPORT_REASONS.includes(reason)) return fail(res, 400, 'Invalid report reason.', 'VALIDATION_ERROR')
    const existing = await ContentReport.findOne({
      reporterId: req.user._id,
      targetType,
      targetId,
      status: { $in: ['open', 'reviewing'] },
    })
    if (existing) return ok(res, { report: existing, duplicate: true })
    const report = await ContentReport.create({
      reporterId: req.user._id,
      targetType,
      targetId,
      reason,
      details: communityService.text(req.body.details, 1000),
    })
    return ok(res, { report }, 201)
  } catch (error) {
    console.error('[community.reportContent]', error.message)
    return fail(res, 500, 'Failed to submit report.')
  }
}

exports.followStudent = async (req, res) => {
  try {
    const targetId = req.params.userId
    if (!mongoose.isValidObjectId(targetId)) return fail(res, 400, 'Invalid student id.', 'VALIDATION_ERROR')
    if (String(targetId) === String(req.user._id)) return fail(res, 400, 'You cannot follow yourself.', 'VALIDATION_ERROR')
    const blocked = await StudentBlock.exists({
      $or: [
        { blockerId: req.user._id, blockedId: targetId },
        { blockerId: targetId, blockedId: req.user._id },
      ],
    })
    if (blocked) return fail(res, 403, 'Follow not allowed.', 'FORBIDDEN')
    const existing = await StudentFollow.findOne({ followerId: req.user._id, followingId: targetId })
    if (existing) {
      await existing.deleteOne()
      const [followingCount, followerCount] = await Promise.all([
        StudentFollow.countDocuments({ followerId: req.user._id }),
        StudentFollow.countDocuments({ followingId: targetId }),
      ])
      return ok(res, { following: false, followingCount, followerCount })
    }
    await StudentFollow.create({ followerId: req.user._id, followingId: targetId })
    await notifyUser(targetId, {
      type: 'follow',
      title: 'New follower',
      body: `${req.user.name || 'A student'} started following you.`,
      link: '/student/community',
      dedupeKey: `follow:${req.user._id}:${targetId}`,
    })
    const [followingCount, followerCount] = await Promise.all([
      StudentFollow.countDocuments({ followerId: req.user._id }),
      StudentFollow.countDocuments({ followingId: targetId }),
    ])
    return ok(res, { following: true, followingCount, followerCount })
  } catch (error) {
    if (error.code === 11000) return ok(res, { following: true })
    console.error('[community.followStudent]', error.message)
    return fail(res, 500, 'Failed to update follow state.')
  }
}

exports.getFollowStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id
    const [followerCount, followingCount, isFollowing] = await Promise.all([
      StudentFollow.countDocuments({ followingId: userId }),
      StudentFollow.countDocuments({ followerId: userId }),
      StudentFollow.exists({ followerId: req.user._id, followingId: userId }),
    ])
    return ok(res, { followerCount, followingCount, isFollowing: Boolean(isFollowing) })
  } catch (error) {
    console.error('[community.getFollowStats]', error.message)
    return fail(res, 500, 'Failed to load follow stats.')
  }
}

exports.blockStudent = async (req, res) => {
  try {
    const targetId = req.params.userId
    if (!mongoose.isValidObjectId(targetId) || String(targetId) === String(req.user._id)) {
      return fail(res, 400, 'Invalid student id.', 'VALIDATION_ERROR')
    }
    await StudentFollow.deleteMany({
      $or: [
        { followerId: req.user._id, followingId: targetId },
        { followerId: targetId, followingId: req.user._id },
      ],
    })
    await StudentBlock.updateOne(
      { blockerId: req.user._id, blockedId: targetId },
      { $setOnInsert: { blockerId: req.user._id, blockedId: targetId } },
      { upsert: true },
    )
    return ok(res, { blocked: true })
  } catch (error) {
    console.error('[community.blockStudent]', error.message)
    return fail(res, 500, 'Failed to block student.')
  }
}

exports.discoverStudents = async (req, res) => {
  try {
    const result = await communityService.discoverStudents({
      viewerId: req.user._id,
      q: req.query.q,
      skill: req.query.skill,
      topic: req.query.topic,
      limit: Math.min(Number(req.query.limit) || 20, 50),
      cursor: req.query.cursor,
    })
    return ok(res, result)
  } catch (error) {
    console.error('[community.discoverStudents]', error.message)
    return fail(res, 500, 'Failed to discover students.')
  }
}

exports.getProjects = async (req, res) => {
  try {
    const profiles = await StudentProfile.find({
      'projects.visibility': 'public',
      'privacy.visibility': 'public',
    }).select('userId username displayName profilePhoto projects').lean()
    const projects = []
    for (const profile of profiles) {
      for (const project of profile.projects || []) {
        if (project.visibility !== 'public') continue
        projects.push({
          id: project._id,
          userId: profile.userId,
          ownerUsername: profile.username,
          ownerName: profile.displayName,
          ownerPhoto: profile.profilePhoto,
          title: project.title,
          description: project.description,
          technologies: project.technologies,
          githubUrl: project.githubUrl,
          demoUrl: project.demoUrl,
          screenshots: project.screenshots,
          status: project.status,
          featured: project.featured,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        })
      }
    }
    projects.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    const limit = Math.min(Number(req.query.limit) || 24, 50)
    return ok(res, { projects: projects.slice(0, limit) })
  } catch (error) {
    console.error('[community.getProjects]', error.message)
    return fail(res, 500, 'Failed to load projects.')
  }
}

exports.getProject = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({
      'projects._id': req.params.projectId,
      'privacy.visibility': 'public',
    }).select('userId username displayName profilePhoto headline projects skills').lean()
    if (!profile) return fail(res, 404, 'Project not found.', 'NOT_FOUND')
    const project = (profile.projects || []).find((p) => String(p._id) === String(req.params.projectId))
    if (!project || project.visibility !== 'public') return fail(res, 404, 'Project not found.', 'NOT_FOUND')
    return ok(res, {
      project: {
        ...project,
        owner: {
          userId: profile.userId,
          username: profile.username,
          displayName: profile.displayName,
          profilePhoto: profile.profilePhoto,
          headline: profile.headline,
        },
        relatedSkills: (profile.skills || []).filter((s) => s.visibility === 'public').slice(0, 12),
      },
    })
  } catch (error) {
    console.error('[community.getProject]', error.message)
    return fail(res, 500, 'Failed to load project.')
  }
}

exports.publishProjectPost = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id }).select('projects').lean()
    const project = (profile?.projects || []).find((p) => String(p._id) === String(req.params.projectId))
    if (!project) return fail(res, 404, 'Project not found.', 'NOT_FOUND')
    const content = communityService.text(req.body.content, 5000) || `Shared project: ${project.title}`
    const post = await Post.create({
      userId: req.user._id,
      content,
      postType: 'PROJECT',
      tag: 'Project',
      visibility: project.visibility === 'public' ? 'PUBLIC' : 'FOLLOWERS',
      projectId: String(project._id),
      topics: (project.technologies || []).slice(0, 8),
      skills: (project.technologies || []).slice(0, 8),
      status: 'published',
    })
    return ok(res, { post: await serializePost(post.toObject(), req.user._id) }, 201)
  } catch (error) {
    console.error('[community.publishProjectPost]', error.message)
    return fail(res, 500, 'Failed to publish project post.')
  }
}

exports.listGroups = async (req, res) => {
  try {
    const filter = { status: 'active' }
    if (req.query.mine === 'true') {
      filter['members.userId'] = req.user._id
    } else {
      filter.visibility = 'PUBLIC'
    }
    if (req.query.topic) filter.topic = communityService.text(req.query.topic, 80)
    const groups = await LearningGroup.find(filter).sort({ createdAt: -1 }).limit(50).lean()
    return ok(res, {
      groups: groups.map((g) => ({
        ...g,
        isMember: (g.members || []).some((m) => String(m.userId) === String(req.user._id)),
      })),
    })
  } catch (error) {
    console.error('[community.listGroups]', error.message)
    return fail(res, 500, 'Failed to load groups.')
  }
}

exports.createGroup = async (req, res) => {
  try {
    const name = communityService.text(req.body.name, 120)
    if (!name) return fail(res, 400, 'Group name is required.', 'VALIDATION_ERROR')
    const group = await LearningGroup.create({
      name,
      description: communityService.text(req.body.description, 2000),
      topic: communityService.text(req.body.topic, 80),
      skills: cleanStringList(req.body.skills),
      visibility: req.body.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      ownerId: req.user._id,
      members: [{ userId: req.user._id, role: 'owner' }],
      memberCount: 1,
    })
    return ok(res, { group }, 201)
  } catch (error) {
    console.error('[community.createGroup]', error.message)
    return fail(res, 500, 'Failed to create group.')
  }
}

exports.getGroup = async (req, res) => {
  try {
    const group = await LearningGroup.findById(req.params.id).lean()
    if (!group || group.status !== 'active') return fail(res, 404, 'Group not found.', 'NOT_FOUND')
    const member = (group.members || []).find((m) => String(m.userId) === String(req.user._id))
    if (group.visibility === 'PRIVATE' && !member) return fail(res, 403, 'Private group.', 'FORBIDDEN')
    return ok(res, { group: { ...group, isMember: Boolean(member) } })
  } catch (error) {
    console.error('[community.getGroup]', error.message)
    return fail(res, 500, 'Failed to load group.')
  }
}

exports.joinGroup = async (req, res) => {
  try {
    const group = await LearningGroup.findById(req.params.id)
    if (!group || group.status !== 'active') return fail(res, 404, 'Group not found.', 'NOT_FOUND')
    if (group.visibility === 'PRIVATE') return fail(res, 403, 'Private groups require an invite.', 'FORBIDDEN')
    const exists = group.members.some((m) => String(m.userId) === String(req.user._id))
    if (!exists) {
      group.members.push({ userId: req.user._id, role: 'member' })
      group.memberCount = group.members.length
      await group.save()
    }
    return ok(res, { joined: true, memberCount: group.memberCount })
  } catch (error) {
    console.error('[community.joinGroup]', error.message)
    return fail(res, 500, 'Failed to join group.')
  }
}

exports.leaveGroup = async (req, res) => {
  try {
    const group = await LearningGroup.findById(req.params.id)
    if (!group) return fail(res, 404, 'Group not found.', 'NOT_FOUND')
    const member = group.members.find((m) => String(m.userId) === String(req.user._id))
    if (!member) return ok(res, { left: true })
    if (member.role === 'owner') return fail(res, 400, 'Owners must transfer ownership before leaving.', 'VALIDATION_ERROR')
    group.members = group.members.filter((m) => String(m.userId) !== String(req.user._id))
    group.memberCount = group.members.length
    await group.save()
    return ok(res, { left: true, memberCount: group.memberCount })
  } catch (error) {
    console.error('[community.leaveGroup]', error.message)
    return fail(res, 500, 'Failed to leave group.')
  }
}

exports.listCollaborations = async (req, res) => {
  try {
    const filter = { status: 'OPEN', visibility: 'PUBLIC' }
    if (req.query.skill) filter.skillsNeeded = communityService.text(req.query.skill, 60)
    if (req.query.mine === 'true') {
      delete filter.visibility
      filter.userId = req.user._id
    }
    const rows = await CollaborationRequest.find(filter).sort({ createdAt: -1 }).limit(50).lean()
    const profile = await StudentProfile.findOne({ userId: req.user._id }).select('skills').lean()
    const mySkills = new Set((profile?.skills || []).map((s) => String(s.name).toLowerCase()))
    return ok(res, {
      requests: rows.map((row) => ({
        ...row,
        matchReason: (row.skillsNeeded || []).find((skill) => mySkills.has(String(skill).toLowerCase()))
          ? `This project is looking for ${(row.skillsNeeded || []).find((skill) => mySkills.has(String(skill).toLowerCase()))} skills.`
          : '',
      })),
    })
  } catch (error) {
    console.error('[community.listCollaborations]', error.message)
    return fail(res, 500, 'Failed to load collaboration requests.')
  }
}

exports.createCollaboration = async (req, res) => {
  try {
    const description = communityService.text(req.body.description, 2000)
    if (!description) return fail(res, 400, 'Description is required.', 'VALIDATION_ERROR')
    const request = await CollaborationRequest.create({
      userId: req.user._id,
      projectId: communityService.text(req.body.projectId, 80),
      projectTitle: communityService.text(req.body.projectTitle, 200),
      roleNeeded: communityService.text(req.body.roleNeeded, 120),
      skillsNeeded: cleanStringList(req.body.skillsNeeded, 12),
      topics: cleanStringList(req.body.topics, 8),
      description,
      status: 'OPEN',
      visibility: ['PUBLIC', 'FOLLOWERS', 'PRIVATE'].includes(req.body.visibility) ? req.body.visibility : 'PUBLIC',
    })
    return ok(res, { request }, 201)
  } catch (error) {
    console.error('[community.createCollaboration]', error.message)
    return fail(res, 500, 'Failed to create collaboration request.')
  }
}

exports.updateCollaborationStatus = async (req, res) => {
  try {
    const status = communityService.text(req.body.status, 20).toUpperCase()
    if (!['OPEN', 'PAUSED', 'CLOSED'].includes(status)) return fail(res, 400, 'Invalid status.', 'VALIDATION_ERROR')
    const request = await CollaborationRequest.findOne({ _id: req.params.id, userId: req.user._id })
    if (!request) return fail(res, 404, 'Collaboration request not found.', 'NOT_FOUND')
    request.status = status
    await request.save()
    return ok(res, { request })
  } catch (error) {
    console.error('[community.updateCollaborationStatus]', error.message)
    return fail(res, 500, 'Failed to update collaboration request.')
  }
}

exports.getCreatorStats = async (req, res) => {
  try {
    const userId = req.user._id
    const [posts, bookmarks] = await Promise.all([
      Post.find({ userId, status: 'published' }).select('likeCount commentCount saveCount viewCount createdAt postType').lean(),
      Bookmark.countDocuments({ studentId: userId, targetType: 'post' }),
    ])
    const totals = posts.reduce((acc, post) => {
      acc.reactions += post.likeCount || 0
      acc.comments += post.commentCount || 0
      acc.saves += post.saveCount || 0
      acc.views += post.viewCount || 0
      return acc
    }, { reactions: 0, comments: 0, saves: 0, views: 0 })
    return ok(res, {
      stats: {
        publishedPosts: posts.length,
        savedPosts: bookmarks,
        ...totals,
        byType: POST_TYPES.reduce((acc, type) => {
          acc[type] = posts.filter((p) => p.postType === type).length
          return acc
        }, {}),
      },
      recentPosts: posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10),
    })
  } catch (error) {
    console.error('[community.getCreatorStats]', error.message)
    return fail(res, 500, 'Failed to load creator stats.')
  }
}

exports.improvePostDraft = async (req, res) => {
  try {
    const suggestion = await communityIntelligence.improvePostDraft({
      content: req.body.content,
      postType: req.body.postType,
      topics: req.body.topics,
      skills: req.body.skills,
    })
    return ok(res, { suggestion })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.suggestTags = async (req, res) => {
  try {
    const suggestion = await communityIntelligence.suggestTags({
      content: req.body.content,
      postType: req.body.postType,
    })
    return ok(res, { suggestion })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.suggestProjectSummary = async (req, res) => {
  try {
    const suggestion = await communityIntelligence.summarizeProject({
      title: req.body.title,
      description: req.body.description,
      technologies: req.body.technologies,
    })
    return ok(res, { suggestion })
  } catch (error) {
    return fail(res, error.statusCode || 500, error.message)
  }
}

exports.createTaskFromPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean()
    if (!post || post.status !== 'published') return fail(res, 404, 'Post not found.', 'NOT_FOUND')
    const allowed = await communityService.canViewPost(post, req.user._id)
    if (!allowed) return fail(res, 403, 'You cannot create a task from this post.', 'FORBIDDEN')
    const title = communityService.text(req.body.title, 200) || `Practice: ${communityService.text(post.content, 80)}`
    const task = await Task.create({
      userId: req.user._id,
      title,
      description: `Saved from community post ${post._id}`,
      priority: 'Medium',
      status: 'todo',
      tags: [...(post.topics || []), ...(post.skills || [])].slice(0, 8),
    })
    return ok(res, { task }, 201)
  } catch (error) {
    console.error('[community.createTaskFromPost]', error.message)
    return fail(res, 500, 'Failed to create task from post.')
  }
}

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, 'No file uploaded.', 'VALIDATION_ERROR')
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp']
    const allowedVideos = ['video/mp4', 'video/webm']
    const allowed = [...allowedImages, ...allowedVideos]
    if (!allowed.includes(req.file.mimetype)) return fail(res, 400, 'Unsupported file type.', 'VALIDATION_ERROR')
    const maxSize = allowedVideos.includes(req.file.mimetype) ? 25 * 1024 * 1024 : 8 * 1024 * 1024
    if (req.file.size > maxSize) return fail(res, 400, 'File exceeds size limit.', 'VALIDATION_ERROR')
    const signatures = {
      'image/jpeg': [0xff, 0xd8, 0xff],
      'image/png': [0x89, 0x50, 0x4e, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'video/mp4': [0x00, 0x00, 0x00],
      'video/webm': [0x1a, 0x45, 0xdf, 0xa3],
    }
    const sig = signatures[req.file.mimetype]
    if (sig && !sig.every((byte, index) => req.file.buffer[index] === byte)) {
      return fail(res, 400, 'File content does not match its type.', 'VALIDATION_ERROR')
    }
    const extension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
    }[req.file.mimetype]
    const filename = `${crypto.randomBytes(24).toString('hex')}.${extension}`
    fs.mkdirSync(MEDIA_ROOT, { recursive: true })
    await fs.promises.writeFile(path.join(MEDIA_ROOT, filename), req.file.buffer, { flag: 'wx' })
    const url = `/api/community/media/${filename}`
    return ok(res, {
      media: {
        url,
        type: allowedVideos.includes(req.file.mimetype) ? 'video' : 'image',
        mimeType: req.file.mimetype,
        filename,
        size: req.file.size,
      },
    }, 201)
  } catch (error) {
    console.error('[community.uploadMedia]', error.message)
    return fail(res, 500, 'Failed to upload media.')
  }
}

exports.getMedia = async (req, res) => {
  try {
    const filename = String(req.params.filename || '')
    if (!/^[a-f0-9]{48}\.(jpg|png|webp|mp4|webm)$/.test(filename)) return fail(res, 404, 'Media not found.', 'NOT_FOUND')
    const filePath = path.join(MEDIA_ROOT, filename)
    if (!fs.existsSync(filePath)) return fail(res, 404, 'Media not found.', 'NOT_FOUND')
    const ext = path.extname(filename).slice(1)
    const mime = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
    }[ext]
    res.setHeader('Content-Type', mime)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return fs.createReadStream(filePath).pipe(res)
  } catch (error) {
    console.error('[community.getMedia]', error.message)
    return fail(res, 500, 'Failed to load media.')
  }
}
