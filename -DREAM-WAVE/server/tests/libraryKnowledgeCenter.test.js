const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const LibraryBook = require('../models/LibraryBook')
const LibraryProgress = require('../models/LibraryProgress')
const LibraryAnnotation = require('../models/LibraryAnnotation')
const LibraryReadingSession = require('../models/LibraryReadingSession')
const controller = require('../controllers/libraryController')

let mongod
const userId = new mongoose.Types.ObjectId()
const otherUserId = new mongoose.Types.ObjectId()

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    setHeader(key, value) { this.headers[key] = value },
    redirect(url) { this.statusCode = 302; this.body = { url }; return this },
  }
}

async function invoke(handler, { body = {}, params = {}, query = {}, currentUserId = userId, role = 'student' } = {}) {
  const res = response()
  await handler({ body, params, query, user: { _id: currentUserId, role } }, res)
  return res
}

async function activeBook(overrides = {}) {
  return LibraryBook.create({
    title: 'Open Algorithms',
    author: 'Open Learning Project',
    pdfUrl: 'https://example.org/open-algorithms.pdf',
    pages: 200,
    status: 'active',
    license: {
      type: 'open-educational-resource',
      attribution: 'CC BY Open Learning Project',
      sourceUrl: 'https://example.org/open-algorithms',
      allowDownload: true,
      verificationStatus: 'verified',
    },
    ...overrides,
  })
}

describe('digital library knowledge center', () => {
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
      LibraryBook.deleteMany({}),
      LibraryProgress.deleteMany({}),
      LibraryAnnotation.deleteMany({}),
      LibraryReadingSession.deleteMany({}),
    ])
  })

  it('requires legal provenance and prevents publisher mass assignment', async () => {
    const rejected = await invoke(controller.createBook, {
      role: 'admin',
      body: { title: 'Unknown rights', pdfUrl: 'https://example.org/book.pdf', license: { type: 'licensed' } },
    })
    assert.equal(rejected.statusCode, 400)

    const created = await invoke(controller.createBook, {
      role: 'admin',
      body: {
        title: 'Public Domain Physics',
        pdfUrl: 'https://example.org/physics.pdf',
        status: 'active',
        views: 999999,
        ownerType: 'company',
        license: {
          type: 'public-domain',
          attribution: 'Public domain archive',
          sourceUrl: 'https://example.org/physics',
        },
      },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.body.book.status, 'pending')
    assert.equal(created.body.book.ownerType, 'admin')
    assert.equal(created.body.book.views, 0)
  })

  it('clamps reading progress and protects user ownership', async () => {
    const book = await activeBook()
    const saved = await invoke(controller.saveProgress, {
      params: { id: book._id.toString() },
      body: { currentPage: 500, totalPages: 200, percent: 500, readingMinutesDelta: 900, userId: otherUserId },
    })
    assert.equal(saved.statusCode, 200)
    assert.equal(saved.body.progress.currentPage, 200)
    assert.equal(saved.body.progress.percent, 100)
    assert.equal(saved.body.progress.readingMinutes, 720)
    assert.equal(saved.body.progress.userId.toString(), userId.toString())
  })

  it('creates isolated bookmark, highlight, note, quote and page-tag annotations', async () => {
    const book = await activeBook()
    for (const type of ['bookmark', 'highlight', 'underline', 'note', 'quote', 'page-tag']) {
      const created = await invoke(controller.createAnnotation, {
        params: { id: book._id.toString() },
        body: {
          type,
          page: 12,
          text: type === 'highlight' ? 'Important idea' : '',
          content: type === 'note' ? 'Review this chapter' : '',
          label: type === 'bookmark' ? 'Exam topic' : '',
          tags: type === 'page-tag' ? ['exam'] : [],
        },
      })
      assert.equal(created.statusCode, 201)
    }
    const listed = await invoke(controller.listAnnotations, { params: { id: book._id.toString() } })
    assert.equal(listed.body.items.length, 6)
    const foreign = await invoke(controller.listAnnotations, { params: { id: book._id.toString() }, currentUserId: otherUserId })
    assert.equal(foreign.body.items.length, 0)
  })

  it('records idempotent reading sessions and dashboard analytics', async () => {
    const book = await activeBook()
    const body = {
      clientEventId: 'reader-session-1',
      startedAt: new Date(Date.now() - 10 * 60000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 600,
      startPage: 10,
      endPage: 25,
      pagesRead: 15,
    }
    const first = await invoke(controller.recordReadingSession, { params: { id: book._id.toString() }, body })
    assert.equal(first.statusCode, 201)
    const duplicate = await invoke(controller.recordReadingSession, { params: { id: book._id.toString() }, body })
    assert.equal(duplicate.statusCode, 200)
    assert.equal(duplicate.body.duplicate, true)
    assert.equal(await LibraryReadingSession.countDocuments({}), 1)

    const dashboard = await invoke(controller.libraryDashboard)
    assert.equal(dashboard.body.dashboard.pagesReadToday, 15)
    assert.equal(dashboard.body.dashboard.minutesWeek, 10)
    assert.equal(dashboard.body.dashboard.booksStarted, 1)
  })

  it('blocks inactive and traversal-based PDF sources', async () => {
    const pending = await activeBook({ status: 'pending' })
    const inactive = await invoke(controller.getPdf, { params: { id: pending._id.toString() } })
    assert.equal(inactive.statusCode, 404)

    const traversal = await activeBook({ pdfUrl: '../../server.js' })
    const blocked = await invoke(controller.getPdf, { params: { id: traversal._id.toString() } })
    assert.equal(blocked.statusCode, 403)
  })
})
