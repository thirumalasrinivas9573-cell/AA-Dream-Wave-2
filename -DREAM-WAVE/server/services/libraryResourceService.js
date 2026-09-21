const Goal = require('../models/Goal')
const Roadmap = require('../models/Roadmap')
const Task = require('../models/Task')
const LibraryBook = require('../models/LibraryBook')
const LibraryProgress = require('../models/LibraryProgress')
const { openai } = require('../utils/openaiClient')

const PRIORITY_WEIGHT = { beginner: 1, intermediate: 2, advanced: 3 }

function accessLabel(book) {
  const license = book.license || {}
  if (license.externalOnly) return 'EXTERNAL_LINK'
  if (license.type === 'public-domain') return 'PUBLIC_DOMAIN'
  if (license.type === 'open-educational-resource') return 'OPEN_ACCESS'
  if (license.type === 'user-uploaded') return 'USER_UPLOADED'
  if (license.type === 'institution-licensed') return 'INSTITUTION_LICENSED'
  if (book.pdfUrl && !license.externalOnly) return 'INTERNAL_RESOURCE'
  return 'METADATA_ONLY'
}

function canReadPdf(book) {
  const license = book.license || {}
  if (license.externalOnly && !book.pdfUrl?.startsWith('/')) return false
  return Boolean(book.pdfUrl) && book.status === 'active'
}

function explainRecommendation(book, context = {}) {
  const parts = []
  if (context.goalTitle) parts.push(`supports your goal "${context.goalTitle}"`)
  if (context.stageTitle) parts.push(`matches roadmap stage "${context.stageTitle}"`)
  if (context.milestoneTitle) parts.push(`relates to milestone "${context.milestoneTitle}"`)
  if (context.matchedTerms?.length) parts.push(`covers topics: ${context.matchedTerms.slice(0, 4).join(', ')}`)
  if (context.categoryMatch) parts.push(`same category (${book.category})`)
  return parts.length
    ? `Recommended because it ${parts.join(' and ')}.`
    : 'Recommended based on your learning profile and catalog metadata.'
}

async function searchResources({
  q = '',
  category,
  resourceType,
  accessType,
  skill,
  topic,
  saved,
  userId,
  page = 1,
  limit = 24,
  sort = 'relevance',
}) {
  const filter = { status: 'active' }
  if (category) filter.category = category
  if (resourceType) filter.tags = resourceType
  if (accessType) filter['license.type'] = accessType
  if (skill) filter.$or = [{ tags: skill }, { subjects: skill }, { description: { $regex: skill, $options: 'i' } }]
  if (topic) filter.$or = [{ tags: topic }, { subjects: topic }, { category: topic }]

  let bookIds = null
  if (saved && userId) {
    const savedProgress = await LibraryProgress.find({ userId, favorite: true }).select('bookId').lean()
    bookIds = savedProgress.map((p) => p.bookId)
    filter._id = { $in: bookIds.length ? bookIds : [] }
  }

  const skip = (Math.max(1, page) - 1) * limit
  let query = LibraryBook.find(filter)
  if (q?.trim()) {
    try {
      query = LibraryBook.find({ ...filter, $text: { $search: q.trim() } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
    } catch {
      query = LibraryBook.find({
        ...filter,
        $or: [
          { title: { $regex: q.trim(), $options: 'i' } },
          { author: { $regex: q.trim(), $options: 'i' } },
          { description: { $regex: q.trim(), $options: 'i' } },
        ],
      })
    }
  } else if (sort === 'recent') {
    query = query.sort('-createdAt')
  } else if (sort === 'title') {
    query = query.sort('title')
  } else if (sort === 'author') {
    query = query.sort('author')
  } else {
    query = query.sort('-views')
  }

  const [items, total] = await Promise.all([
    query.skip(skip).limit(limit).lean(),
    LibraryBook.countDocuments(filter),
  ])

  return {
    items: items.map((book) => ({
      ...book,
      accessType: accessLabel(book),
      canRead: canReadPdf(book),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

async function recommendForGoal(userId, goalId, { milestoneKey, limit = 8 } = {}) {
  const goal = await Goal.findOne({ _id: goalId, userId })
  if (!goal) throw Object.assign(new Error('Goal not found.'), { statusCode: 404 })

  const roadmap = await Roadmap.findOne({ goalId, userId }).lean()
  const keywords = [
    goal.title,
    goal.category,
    goal.description,
    ...(goal.aiPlan || []),
    ...(goal.milestones || []).map((m) => m.title),
  ].filter(Boolean)

  let stageTitle = ''
  if (roadmap?.learningStages?.length) {
    const stage = roadmap.learningStages.find((s) => s.status !== 'completed') || roadmap.learningStages[0]
    stageTitle = stage?.title || ''
    keywords.push(stageTitle, ...(stage?.skills || []))
  }

  let milestoneTitle = ''
  if (milestoneKey) {
    const milestone = (goal.milestones || []).find((m) => m.title === milestoneKey || String(m._id) === milestoneKey)
    if (milestone) {
      milestoneTitle = milestone.title
      keywords.push(milestone.title, milestone.description)
    }
  }

  const readProgress = await LibraryProgress.find({ userId }).select('bookId').lean()
  const readIds = readProgress.map((p) => p.bookId)

  const q = keywords.slice(0, 8).join(' ')
  let books = []
  try {
    books = await LibraryBook.find({
      status: 'active',
      _id: { $nin: readIds },
      $text: { $search: q },
    }).limit(limit * 2).lean()
  } catch {
    books = await LibraryBook.find({
      status: 'active',
      _id: { $nin: readIds },
      $or: [
        { category: goal.category },
        { tags: { $in: keywords.slice(0, 6) } },
      ],
    }).limit(limit * 2).lean()
  }

  if (books.length < limit) {
    const more = await LibraryBook.find({
      status: 'active',
      _id: { $nin: [...readIds, ...books.map((b) => b._id)] },
      category: goal.category,
    }).sort('-views').limit(limit - books.length).lean()
    books = [...books, ...more]
  }

  return books.slice(0, limit).map((book) => ({
    book,
    accessType: accessLabel(book),
    canRead: canReadPdf(book),
    explanation: explainRecommendation(book, {
      goalTitle: goal.title,
      stageTitle,
      milestoneTitle,
      categoryMatch: book.category === goal.category,
      matchedTerms: (book.tags || []).filter((t) => keywords.some((k) => String(k).toLowerCase().includes(String(t).toLowerCase()))),
    }),
    url: `/library/books/${book._id}`,
    source: 'dream_wave_library',
  }))
}

async function recommendForRoadmap(userId, roadmapId, { stageIndex, limit = 8 } = {}) {
  const roadmap = await Roadmap.findOne({ _id: roadmapId, userId }).populate('goalId', 'title category').lean()
  if (!roadmap) throw Object.assign(new Error('Roadmap not found.'), { statusCode: 404 })

  const stages = roadmap.learningStages || []
  const stage = stageIndex != null ? stages[stageIndex] : stages.find((s) => s.status !== 'completed') || stages[0]
  if (!stage) return []

  const keywords = [stage.title, stage.description, ...(stage.skills || []), roadmap.goalId?.title, roadmap.goalId?.category].filter(Boolean)
  const linkedIds = (stage.libraryBookIds || []).filter(Boolean)

  let books = []
  if (linkedIds.length) {
    books = await LibraryBook.find({ _id: { $in: linkedIds }, status: 'active' }).lean()
  }
  if (books.length < limit) {
    const q = keywords.join(' ')
    try {
      const found = await LibraryBook.find({ status: 'active', $text: { $search: q } }).limit(limit).lean()
      books = [...books, ...found.filter((b) => !books.some((x) => String(x._id) === String(b._id)))]
    } catch {
      const found = await LibraryBook.find({ status: 'active', tags: { $in: stage.skills || [] } }).limit(limit).lean()
      books = [...books, ...found]
    }
  }

  return books.slice(0, limit).map((book) => ({
    book,
    accessType: accessLabel(book),
    canRead: canReadPdf(book),
    explanation: explainRecommendation(book, { stageTitle: stage.title, goalTitle: roadmap.goalId?.title }),
    url: `/library/books/${book._id}`,
    source: 'dream_wave_library',
  }))
}

async function linkResourceToGoal(userId, goalId, { bookId, reason = '' } = {}) {
  const [goal, book] = await Promise.all([
    Goal.findOne({ _id: goalId, userId }),
    LibraryBook.findOne({ _id: bookId, status: 'active' }),
  ])
  if (!goal) throw Object.assign(new Error('Goal not found.'), { statusCode: 404 })
  if (!book) throw Object.assign(new Error('Resource not found.'), { statusCode: 404 })

  const resources = goal.resources || { books: [], courses: [], projects: [] }
  const exists = (resources.books || []).some((b) => String(b.bookId) === String(bookId) || b.url === `/library/books/${bookId}`)
  if (!exists) {
    resources.books = [...(resources.books || []), {
      title: book.title,
      url: `/library/books/${book._id}`,
      bookId: book._id,
      source: 'dream_wave_library',
      reason: String(reason).slice(0, 300),
    }]
    goal.resources = resources
    await goal.save()
  }

  await LibraryProgress.updateOne(
    { userId, bookId },
    { $set: { favorite: true, lastReadAt: new Date() }, $setOnInsert: { userId, bookId } },
    { upsert: true },
  )

  return { goal, book }
}

async function linkResourceToRoadmapStage(userId, roadmapId, { stageIndex, bookId } = {}) {
  const roadmap = await Roadmap.findOne({ _id: roadmapId, userId })
  if (!roadmap) throw Object.assign(new Error('Roadmap not found.'), { statusCode: 404 })
  const idx = Number(stageIndex)
  if (!roadmap.learningStages?.[idx]) throw Object.assign(new Error('Roadmap stage not found.'), { statusCode: 404 })

  const book = await LibraryBook.findOne({ _id: bookId, status: 'active' })
  if (!book) throw Object.assign(new Error('Resource not found.'), { statusCode: 404 })

  const stage = roadmap.learningStages[idx]
  stage.libraryBookIds = [...new Set([...(stage.libraryBookIds || []).map(String), String(bookId)])]
  roadmap.learningStages[idx] = stage
  await roadmap.save()
  return { roadmap, stage, book }
}

async function getMyLibrary(userId) {
  const progress = await LibraryProgress.find({ userId })
    .sort('-lastReadAt')
    .populate('bookId')
    .lean()

  const items = progress.filter((p) => p.bookId)
  return {
    saved: items.filter((p) => p.favorite),
    reading: items.filter((p) => p.percent > 0 && p.percent < 100),
    completed: items.filter((p) => p.percent >= 100),
    archived: items.filter((p) => p.readingStatus === 'archived'),
    recentlyViewed: items.slice(0, 20),
    uploaded: await LibraryBook.find({ ownerType: 'student', ownerId: userId, status: 'active' }).sort('-createdAt').lean(),
  }
}

async function parseNaturalLanguageSearch(query, userId) {
  const text = String(query || '').trim()
  if (!text) throw Object.assign(new Error('Enter a search query.'), { statusCode: 400 })

  const fallback = {
    q: text,
    category: null,
    skill: null,
    topic: null,
    difficulty: null,
    intent: 'search',
  }

  if (!process.env.OPENAI_API_KEY) return fallback

  try {
    const goals = await Goal.find({ userId, status: { $ne: 'archived' } }).select('title category').limit(3).lean()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Parse student library search intent. Return JSON: { q, category, skill, topic, difficulty, intent }. Use null for unknown fields. Never invent book titles.',
        },
        { role: 'user', content: `Query: "${text}". Active goals: ${goals.map((g) => g.title).join('; ')}` },
      ],
    })
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return {
      q: parsed.q || text,
      category: parsed.category || null,
      skill: parsed.skill || null,
      topic: parsed.topic || null,
      difficulty: parsed.difficulty || null,
      intent: parsed.intent || 'search',
    }
  } catch {
    return fallback
  }
}

async function scheduleReadingTask(userId, { bookId, title, scheduledDate, durationMinutes, goalId } = {}) {
  const book = await LibraryBook.findOne({ _id: bookId, status: 'active' })
  if (!book) throw Object.assign(new Error('Resource not found.'), { statusCode: 404 })

  const task = await Task.create({
    userId,
    goalId: goalId || undefined,
    title: title || `Read: ${book.title}`,
    description: `Study resource from Dream Wave Library — ${book.title}`,
    category: book.category || 'General',
    estimatedMinutes: durationMinutes || book.estimatedMinutes || 45,
    dueDate: scheduledDate ? new Date(scheduledDate) : undefined,
    status: 'todo',
    source: 'manual',
    tags: ['reading', 'library'],
  })

  return { task, book }
}

module.exports = {
  searchResources,
  recommendForGoal,
  recommendForRoadmap,
  linkResourceToGoal,
  linkResourceToRoadmapStage,
  getMyLibrary,
  parseNaturalLanguageSearch,
  scheduleReadingTask,
  accessLabel,
  canReadPdf,
  explainRecommendation,
}
