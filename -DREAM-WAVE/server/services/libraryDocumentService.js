const crypto = require('crypto')
const LibraryDocumentChunk = require('../models/LibraryDocumentChunk')
const LibraryBook = require('../models/LibraryBook')

const CHUNK_SIZE = 900
const CHUNK_OVERLAP = 120

function hashText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex').slice(0, 32)
}

function splitIntoChunks(text, { page = 1, section = '', chapter = '' } = {}) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const chunks = []
  let start = 0
  let order = 0
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + CHUNK_SIZE)
    const slice = normalized.slice(start, end).trim()
    if (slice.length >= 40) {
      chunks.push({
        page,
        section,
        chapter,
        order,
        text: slice,
        wordCount: slice.split(/\s+/).length,
        contentHash: hashText(slice),
      })
      order += 1
    }
    if (end >= normalized.length) break
    start = Math.max(start + 1, end - CHUNK_OVERLAP)
  }
  return chunks
}

async function indexPageTexts(bookId, pages = []) {
  if (!Array.isArray(pages) || !pages.length) {
    throw Object.assign(new Error('Page text content is required for indexing.'), { statusCode: 400 })
  }
  const book = await LibraryBook.findById(bookId)
  if (!book) throw Object.assign(new Error('Book not found.'), { statusCode: 404 })

  book.processingStatus = 'processing'
  await book.save()

  try {
    await LibraryDocumentChunk.deleteMany({ bookId })
    const docs = []
    for (const entry of pages.slice(0, 500)) {
      const pageNum = Number(entry.page) || 1
      const chunks = splitIntoChunks(entry.text, {
        page: pageNum,
        section: entry.section || '',
        chapter: entry.chapter || '',
      })
      chunks.forEach((chunk) => docs.push({ bookId, ...chunk }))
    }
    if (docs.length) await LibraryDocumentChunk.insertMany(docs, { ordered: false })
    book.processingStatus = docs.length ? 'ready' : 'failed'
    book.indexedAt = new Date()
    await book.save()
    return { chunkCount: docs.length, status: book.processingStatus }
  } catch (error) {
    book.processingStatus = 'failed'
    await book.save()
    throw error
  }
}

function scoreChunk(chunk, terms) {
  const lower = chunk.text.toLowerCase()
  let score = 0
  terms.forEach((term) => {
    if (term.length < 2) return
    const matches = lower.split(term).length - 1
    score += matches * (term.length > 4 ? 3 : 1)
  })
  if (chunk.page) score += 0.5
  return score
}

async function retrieveRelevantChunks(bookId, query, { limit = 5, currentPage } = {}) {
  const terms = String(query || '')
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2)
    .slice(0, 12)

  if (!terms.length) {
    const nearby = currentPage
      ? await LibraryDocumentChunk.find({ bookId, page: { $gte: Math.max(1, currentPage - 1), $lte: currentPage + 1 } }).limit(limit).lean()
      : []
    if (nearby.length) return nearby
    return LibraryDocumentChunk.find({ bookId }).sort({ page: 1, order: 1 }).limit(limit).lean()
  }

  let chunks = []
  try {
    chunks = await LibraryDocumentChunk.find({
      bookId,
      $text: { $search: terms.join(' ') },
    }).limit(limit * 3).lean()
  } catch {
    chunks = await LibraryDocumentChunk.find({
      bookId,
      text: { $regex: terms[0], $options: 'i' },
    }).limit(limit * 3).lean()
  }

  if (!chunks.length) {
    chunks = await LibraryDocumentChunk.find({ bookId }).limit(limit * 4).lean()
  }

  return chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

async function getProcessingStatus(bookId) {
  const [book, count] = await Promise.all([
    LibraryBook.findById(bookId).select('processingStatus indexedAt title').lean(),
    LibraryDocumentChunk.countDocuments({ bookId }),
  ])
  if (!book) return null
  return {
    status: book.processingStatus || (count ? 'ready' : 'uploaded'),
    indexedAt: book.indexedAt,
    chunkCount: count,
  }
}

module.exports = {
  indexPageTexts,
  retrieveRelevantChunks,
  getProcessingStatus,
  splitIntoChunks,
  hashText,
}
