const path = require('path')
const fs = require('fs')
const mongoose = require('mongoose')
const LibraryBook = require('../models/LibraryBook')
const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const libraryDocumentService = require('../services/libraryDocumentService')
const libraryReadingAssistant = require('../services/libraryReadingAssistantService')
const libraryResourceService = require('../services/libraryResourceService')
const plannerService = require('../services/plannerService')

const fail = (res, err, status = 500) =>
  res.status(err.statusCode || status).json({ success: false, message: err.message || 'Server error' })

function validId(value) {
  return mongoose.isValidObjectId(value)
}

async function activeBook(id) {
  if (!validId(id)) return null
  return LibraryBook.findOne({ _id: id, status: 'active' })
}

async function assertBookAccess(book, user) {
  if (!book) throw Object.assign(new Error('Resource not found.'), { statusCode: 404 })
  if (book.ownerType === 'student' && String(book.uploadedBy || book.ownerId) !== String(user._id)) {
    throw Object.assign(new Error('Unauthorized access to private document.'), { statusCode: 403 })
  }
}

exports.getMyLibrary = async (req, res) => {
  try {
    const library = await libraryResourceService.getMyLibrary(req.user._id)
    return res.json({ success: true, library })
  } catch (err) {
    return fail(res, err)
  }
}

exports.searchResources = async (req, res) => {
  try {
    const result = await libraryResourceService.searchResources({
      q: req.query.q,
      category: req.query.category,
      resourceType: req.query.resourceType,
      accessType: req.query.accessType,
      skill: req.query.skill,
      topic: req.query.topic,
      saved: req.query.saved === 'true',
      userId: req.user?._id,
      page: Number(req.query.page) || 1,
      limit: Math.min(48, Number(req.query.limit) || 24),
      sort: req.query.sort || 'relevance',
    })
    return res.json({ success: true, ...result })
  } catch (err) {
    return fail(res, err)
  }
}

exports.naturalLanguageSearch = async (req, res) => {
  try {
    const parsed = await libraryResourceService.parseNaturalLanguageSearch(req.body?.query, req.user._id)
    const result = await libraryResourceService.searchResources({
      ...parsed,
      userId: req.user._id,
      page: 1,
      limit: 24,
    })
    return res.json({ success: true, parsed, ...result })
  } catch (err) {
    return fail(res, err)
  }
}

exports.goalResources = async (req, res) => {
  try {
    if (!validId(req.params.goalId)) return res.status(400).json({ success: false, message: 'Invalid goal ID.' })
    const items = await libraryResourceService.recommendForGoal(req.user._id, req.params.goalId, {
      milestoneKey: req.query.milestone,
      limit: Number(req.query.limit) || 8,
    })
    const goal = await Goal.findOne({ _id: req.params.goalId, userId: req.user._id }).select('title resources').lean()
    return res.json({ success: true, goal, items })
  } catch (err) {
    return fail(res, err)
  }
}

exports.roadmapResources = async (req, res) => {
  try {
    if (!validId(req.params.roadmapId)) return res.status(400).json({ success: false, message: 'Invalid roadmap ID.' })
    const items = await libraryResourceService.recommendForRoadmap(req.user._id, req.params.roadmapId, {
      stageIndex: req.query.stage != null ? Number(req.query.stage) : undefined,
      limit: Number(req.query.limit) || 8,
    })
    return res.json({ success: true, items })
  } catch (err) {
    return fail(res, err)
  }
}

exports.linkGoalResource = async (req, res) => {
  try {
    if (!validId(req.params.goalId)) return res.status(400).json({ success: false, message: 'Invalid goal ID.' })
    const result = await libraryResourceService.linkResourceToGoal(req.user._id, req.params.goalId, req.body || {})
    return res.json({ success: true, ...result })
  } catch (err) {
    return fail(res, err)
  }
}

exports.linkRoadmapResource = async (req, res) => {
  try {
    if (!validId(req.params.roadmapId)) return res.status(400).json({ success: false, message: 'Invalid roadmap ID.' })
    const result = await libraryResourceService.linkResourceToRoadmapStage(req.user._id, req.params.roadmapId, req.body || {})
    return res.json({ success: true, ...result })
  } catch (err) {
    return fail(res, err)
  }
}

exports.indexDocument = async (req, res) => {
  try {
    const book = await activeBook(req.params.id)
    await assertBookAccess(book, req.user)
    const result = await libraryDocumentService.indexPageTexts(book._id, req.body?.pages || [])
    return res.json({ success: true, ...result })
  } catch (err) {
    return fail(res, err)
  }
}

exports.documentStatus = async (req, res) => {
  try {
    const status = await libraryDocumentService.getProcessingStatus(req.params.id)
    if (!status) return res.status(404).json({ success: false, message: 'Resource not found.' })
    return res.json({ success: true, processing: status })
  } catch (err) {
    return fail(res, err)
  }
}

exports.readingAssistant = async (req, res) => {
  try {
    const book = await activeBook(req.params.id)
    await assertBookAccess(book, req.user)

    const status = await libraryDocumentService.getProcessingStatus(book._id)
    const chunks = await libraryDocumentService.retrieveRelevantChunks(
      book._id,
      req.body?.question,
      { limit: 5, currentPage: req.body?.currentPage },
    )

    let goalContext = ''
    if (req.body?.goalId && validId(req.body.goalId)) {
      const goal = await Goal.findOne({ _id: req.body.goalId, userId: req.user._id }).select('title category').lean()
      if (goal) goalContext = `${goal.title} (${goal.category})`
    }

    const answer = await libraryReadingAssistant.askReadingAssistant({
      book,
      question: req.body?.question,
      currentPage: req.body?.currentPage,
      goalContext,
      chunks,
    })

    return res.json({
      success: true,
      ...answer,
      processingStatus: status?.status,
    })
  } catch (err) {
    return fail(res, err)
  }
}

exports.practiceQuestions = async (req, res) => {
  try {
    const book = await activeBook(req.params.id)
    await assertBookAccess(book, req.user)
    const chunks = await libraryDocumentService.retrieveRelevantChunks(book._id, req.body?.focus || book.title, { limit: 4 })
    const result = await libraryReadingAssistant.generatePracticeQuestions({ book, chunks, count: req.body?.count || 4 })
    return res.json({ success: true, ...result })
  } catch (err) {
    return fail(res, err)
  }
}

exports.revisionCards = async (req, res) => {
  try {
    const book = await activeBook(req.params.id)
    await assertBookAccess(book, req.user)
    const chunks = req.body?.selection
      ? []
      : await libraryDocumentService.retrieveRelevantChunks(book._id, req.body?.focus || '', { limit: 3 })
    const result = await libraryReadingAssistant.suggestRevisionCards({
      book,
      chunks,
      studentSelection: req.body?.selection,
    })
    return res.json({ success: true, ...result })
  } catch (err) {
    return fail(res, err)
  }
}

exports.scheduleReading = async (req, res) => {
  try {
    const { task, book } = await libraryResourceService.scheduleReadingTask(req.user._id, req.body || {})
    if (req.body?.scheduledDate && req.body?.startTime) {
      await plannerService.createScheduleItem(req.user._id, {
        taskId: task._id,
        goalId: req.body.goalId,
        title: task.title,
        scheduledDate: req.body.scheduledDate,
        startTime: req.body.startTime,
        durationMinutes: task.estimatedMinutes || 45,
        itemType: 'study',
      }).catch(() => {})
    }
    return res.status(201).json({ success: true, task, book })
  } catch (err) {
    return fail(res, err)
  }
}

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'PDF file is required.' })
    const storageRoot = path.resolve(process.env.LIBRARY_STORAGE_ROOT || path.join(process.cwd(), 'uploads', 'library'))
    const userDir = path.join(storageRoot, `user-${req.user._id}`)
    fs.mkdirSync(userDir, { recursive: true })
    const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)}`
    const relPath = path.join(`user-${req.user._id}`, safeName)
    const absPath = path.join(storageRoot, relPath)
    if (!absPath.startsWith(storageRoot)) {
      return res.status(400).json({ success: false, message: 'Invalid file path.' })
    }
    fs.writeFileSync(absPath, req.file.buffer)

    const title = String(req.body.title || req.file.originalname.replace(/\.pdf$/i, '')).slice(0, 200)
    const book = await LibraryBook.create({
      title,
      author: req.body.author || 'Student upload',
      pdfUrl: relPath.replace(/\\/g, '/'),
      category: req.body.category || 'General',
      description: req.body.description || 'Personal study document uploaded by student.',
      ownerType: 'student',
      ownerId: req.user._id,
      uploadedBy: req.user._id,
      resourceType: 'document',
      processingStatus: 'uploaded',
      license: {
        type: 'user-uploaded',
        attribution: 'Uploaded by student for personal study',
        allowDownload: true,
        verificationStatus: 'verified',
      },
      status: 'active',
    })

    return res.status(201).json({ success: true, book })
  } catch (err) {
    return fail(res, err)
  }
}

exports.enrichedHome = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id, status: { $ne: 'archived' } })
      .sort('-updatedAt')
      .limit(3)
      .select('title category')
      .lean()
    const roadmaps = await Roadmap.find({ userId: req.user._id, status: { $ne: 'archived' } })
      .sort('-updatedAt')
      .limit(2)
      .populate('goalId', 'title')
      .lean()

    const goalResources = []
    for (const goal of goals.slice(0, 2)) {
      const items = await libraryResourceService.recommendForGoal(req.user._id, goal._id, { limit: 4 })
      goalResources.push({ goal, items })
    }

    const roadmapResources = []
    for (const roadmap of roadmaps.slice(0, 1)) {
      const items = await libraryResourceService.recommendForRoadmap(req.user._id, roadmap._id, { limit: 4 })
      roadmapResources.push({ roadmap, items })
    }

    return res.json({ success: true, goalResources, roadmapResources })
  } catch (err) {
    return fail(res, err)
  }
}
