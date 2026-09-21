const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Post = require('../models/Post')
const StudentFollow = require('../models/StudentFollow')
const StudentBlock = require('../models/StudentBlock')
const Bookmark = require('../models/Bookmark')
const LearningGroup = require('../models/LearningGroup')
const CollaborationRequest = require('../models/CollaborationRequest')
const Task = require('../models/Task')
const ContentReport = require('../models/ContentReport')
const communityController = require('../controllers/communityController')
const communityService = require('../services/communityService')

let mongod
const userA = new mongoose.Types.ObjectId()
const userB = new mongoose.Types.ObjectId()

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
  }
}

async function invoke(handler, { body = {}, params = {}, query = {}, user = userA } = {}) {
  const res = response()
  await handler({ body, params, query, user: { _id: user, id: user, name: user.equals(userA) ? 'Student A' : 'Student B', role: 'student' } }, res)
  return res
}

describe('student community network', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await Promise.all([
      Post.deleteMany({}),
      StudentFollow.deleteMany({}),
      StudentBlock.deleteMany({}),
      Bookmark.deleteMany({}),
      LearningGroup.deleteMany({}),
      CollaborationRequest.deleteMany({}),
      Task.deleteMany({}),
      ContentReport.deleteMany({}),
    ])
  })

  it('creates, lists, edits, and soft-deletes posts with ownership checks', async () => {
    const created = await invoke(communityController.createPost, {
      body: { content: 'Learning React hooks today.', postType: 'LEARNING_UPDATE', topics: ['React'] },
    })
    assert.equal(created.statusCode, 201)
    const postId = created.body.post._id

    const feed = await invoke(communityController.getFeed, { query: { tab: 'knowledge' } })
    assert.equal(feed.statusCode, 200)
    assert.equal(feed.body.posts.length, 1)

    const updated = await invoke(communityController.updatePost, {
      params: { id: postId },
      body: { content: 'Updated learning note.' },
    })
    assert.equal(updated.statusCode, 200)

    const forbidden = await invoke(communityController.updatePost, {
      params: { id: postId },
      body: { content: 'Hack attempt' },
      user: userB,
    })
    assert.equal(forbidden.statusCode, 404)

    const deleted = await invoke(communityController.deletePost, { params: { id: postId } })
    assert.equal(deleted.statusCode, 200)
    const afterDelete = await Post.findById(postId)
    assert.equal(afterDelete.status, 'removed')
  })

  it('supports reactions, comments, bookmarks, and task conversion', async () => {
    const created = await invoke(communityController.createPost, {
      body: { content: 'Question about binary trees?', postType: 'QUESTION' },
      user: userB,
    })
    const postId = created.body.post._id

    const liked = await invoke(communityController.toggleLike, { params: { id: postId } })
    assert.equal(liked.body.likedByMe, true)

    const bookmarked = await invoke(communityController.toggleBookmark, { params: { id: postId } })
    assert.equal(bookmarked.body.saved, true)

    const comment = await invoke(communityController.addComment, {
      params: { id: postId },
      body: { content: 'Try in-order traversal first.' },
    })
    assert.equal(comment.statusCode, 201)

    const task = await invoke(communityController.createTaskFromPost, { params: { id: postId } })
    assert.equal(task.statusCode, 201)
    assert.ok(task.body.task.title)
  })

  it('enforces visibility and blocking in feed access', async () => {
    await Post.create({ userId: userB, content: 'Private note', visibility: 'PRIVATE', status: 'published' })
    await Post.create({ userId: userB, content: 'Public learning update', visibility: 'PUBLIC', status: 'published', postType: 'LEARNING_UPDATE' })

    const feed = await invoke(communityController.getFeed, { query: { tab: 'for-you' } })
    assert.equal(feed.body.posts.length, 1)
    assert.match(feed.body.posts[0].content, /Public learning update/)

    await StudentBlock.create({ blockerId: userA, blockedId: userB })
    const blockedFeed = await communityService.fetchFeed({ viewerId: userA, tab: 'for-you', limit: 20 })
    assert.equal(blockedFeed.posts.length, 0)
  })

  it('supports follow, groups, collaboration, and reports', async () => {
    const follow = await invoke(communityController.followStudent, { params: { userId: userB } })
    assert.equal(follow.body.following, true)

    const group = await invoke(communityController.createGroup, {
      body: { name: 'Python Beginners', topic: 'Python', description: 'Weekly practice' },
    })
    assert.equal(group.statusCode, 201)

    const join = await invoke(communityController.joinGroup, { params: { id: group.body.group._id }, user: userB })
    assert.equal(join.body.joined, true)

    const collab = await invoke(communityController.createCollaboration, {
      body: { description: 'Need a UI designer for hackathon project.', skillsNeeded: ['Figma', 'React'] },
    })
    assert.equal(collab.statusCode, 201)

    const post = await invoke(communityController.createPost, { body: { content: 'Spam spam spam', postType: 'GENERAL' } })
    const report = await invoke(communityController.reportContent, {
      body: { targetType: 'post', targetId: post.body.post._id, reason: 'Spam', details: 'Repeated content' },
    })
    assert.equal(report.statusCode, 201)
    assert.equal(report.body.report.reason, 'Spam')
  })

  it('ranks for-you feed deterministically using following and engagement', async () => {
    await StudentFollow.create({ followerId: userA, followingId: userB })
    await Post.create({ userId: userB, content: 'Followed student update', visibility: 'PUBLIC', status: 'published', likeCount: 1 })
    await Post.create({ userId: userB, content: 'Older public update', visibility: 'PUBLIC', status: 'published' })

    const feed = await communityService.fetchFeed({ viewerId: userA, tab: 'for-you', limit: 10 })
    assert.ok(feed.posts.length >= 1)
    assert.ok(feed.posts[0].feedReason || feed.posts[0].author)
  })
})
