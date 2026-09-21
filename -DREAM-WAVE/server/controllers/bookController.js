const fs = require('fs');
const path = require('path');
const { Book, UserBook } = require('../models/Book');
const Organization = require('../models/Organization');
const OrgMembership = require('../models/OrgMembership');
const Notification = require('../models/Notification');
const aiService = require('../services/aiService');
const bookKnowledge = require('../services/bookKnowledgeService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { escapeRegex, pick } = require('../utils/helpers');
const { toAssetUrl } = require('../utils/assetUrl');
const { consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');
const { ORG_TYPES } = require('../config/constants');

async function recordBookAiUsage(user, mode) {
  await recordAiUsage(user, {
    mode: mode || 'books',
    source: 'books',
    creditsUsed: 1,
    success: true,
  });
}
const SEED_BOOKS = [
  { title: 'Atomic Habits', author: 'James Clear', category: 'Productivity', description: 'Tiny changes, remarkable results — build systems that stick.', pages: 320, tags: ['habits', 'systems'], scope: 'public' },
  { title: 'Deep Work', author: 'Cal Newport', category: 'Productivity', description: 'Rules for focused success in a distracted world.', pages: 296, tags: ['focus'], scope: 'public' },
  { title: 'The Pragmatic Programmer', author: 'Andrew Hunt & David Thomas', category: 'Technology', description: 'Timeless lessons for software craftsmanship.', pages: 352, tags: ['engineering'], scope: 'public' },
  { title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', description: 'A handbook of agile software craftsmanship.', pages: 464, tags: ['code'], scope: 'public' },
  { title: 'Designing Your Life', author: 'Bill Burnett & Dave Evans', category: 'Career', description: 'How to build a well-lived, joyful life with design thinking.', pages: 272, tags: ['career'], scope: 'public' },
  { title: 'So Good They Can\'t Ignore You', author: 'Cal Newport', category: 'Career', description: 'Why skills trump passion in career growth.', pages: 288, tags: ['career'], scope: 'public' },
  { title: 'Mindset', author: 'Carol S. Dweck', category: 'Psychology', description: 'The new psychology of success and growth mindset.', pages: 320, tags: ['mindset'], scope: 'public' },
  { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', category: 'Psychology', description: 'How we make decisions — and how to decide better.', pages: 499, tags: ['cognition'], scope: 'public' },
  { title: 'The Lean Startup', author: 'Eric Ries', category: 'Business', description: 'Build products people want with validated learning.', pages: 336, tags: ['startup'], scope: 'public' },
  { title: 'Hooked', author: 'Nir Eyal', category: 'Business', description: 'How to build habit-forming products.', pages: 256, tags: ['product'], scope: 'public' },
  { title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', category: 'Technology', description: 'A modern introduction to programming.', pages: 472, tags: ['javascript'], scope: 'public' },
  { title: 'Range', author: 'David Epstein', category: 'Career', description: 'Why generalists triumph in a specialized world.', pages: 352, tags: ['learning'], scope: 'public' },
];

const BOOK_FIELDS = [
  'title',
  'author',
  'category',
  'subject',
  'publisher',
  'isbn',
  'version',
  'description',
  'coverUrl',
  'pages',
  'tags',
  'relatedBooks',
];

async function ensureSeed() {
  const publicCount = await Book.countDocuments({ scope: 'public' });
  if (publicCount === 0) await Book.insertMany(SEED_BOOKS);
}

async function accessibleBookFilter(user, extra = {}) {
  return require('../services/bookAccessService').accessibleBookFilter(user, extra);
}

async function assertCanAccessBook(user, book) {
  if (!book) throw new AppError('Book not found', 404);
  if (book.scope === 'public') return true;
  if (book.scope === 'personal' && String(book.uploadedBy) === String(user._id)) return true;
  if (
    book.organizationId &&
    user.organizationId &&
    String(book.organizationId) === String(user.organizationId)
  ) {
    return true;
  }
  throw new AppError('Book not found', 404);
}

async function assertCanManageBook(user, book) {
  await assertCanAccessBook(user, book);
  if (book.scope === 'public') {
    if (user.role === 'admin') return true;
    if (String(book.uploadedBy) === String(user._id)) return true;
    throw new AppError('Forbidden', 403);
  }
  if (book.scope === 'personal') {
    if (String(book.uploadedBy) !== String(user._id)) throw new AppError('Forbidden', 403);
    return true;
  }
  if (!user.organizationId || String(book.organizationId) !== String(user.organizationId)) {
    throw new AppError('Forbidden', 403);
  }
  const membership = await OrgMembership.findOne({
    org: user.organizationId,
    user: user._id,
  });
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    if (String(book.uploadedBy) === String(user._id)) return true;
    throw new AppError('Forbidden. Admins only.', 403);
  }
  return true;
}

async function resolveScope(user, requestedScope) {
  const scope = requestedScope || 'personal';
  if (!['public', 'personal', 'institution', 'company'].includes(scope)) {
    throw new AppError('Invalid library scope', 400);
  }
  if (scope === 'public' && user.role !== 'admin') {
    // Non-admins create personal by default unless uploading to org library
    return { scope: 'personal', organizationId: null };
  }
  if (scope === 'personal') return { scope, organizationId: null };
  if (!user.organizationId) throw new AppError('Join an organization to use this library', 400);
  const org = await Organization.findById(user.organizationId).select('type').lean();
  if (scope === 'institution') {
    if (org?.type !== ORG_TYPES.INSTITUTION) throw new AppError('Not an institution organization', 400);
    return { scope, organizationId: user.organizationId };
  }
  if (scope === 'company') {
    if (org?.type !== ORG_TYPES.COMPANY) throw new AppError('Not a company organization', 400);
    return { scope, organizationId: user.organizationId };
  }
  return { scope: 'personal', organizationId: null };
}

async function touchUserBook(userId, bookId, patch = {}) {
  return UserBook.findOneAndUpdate(
    { user: userId, book: bookId },
    {
      $set: { lastViewedAt: new Date(), ...patch },
      $setOnInsert: { bookmarked: true, status: 'want' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

exports.list = asyncHandler(async (req, res) => {
  await ensureSeed();
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24, maxLimit: 50 });
  const extra = {};
  if (req.query.category) extra.category = req.query.category;
  if (req.query.subject) extra.subject = req.query.subject;
  if (req.query.author) {
    extra.author = { $regex: escapeRegex(String(req.query.author).slice(0, 80)), $options: 'i' };
  }
  if (req.query.scope) extra.scope = req.query.scope;
  if (req.query.q) {
    const safe = escapeRegex(String(req.query.q).slice(0, 80));
    extra.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { author: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { searchIndex: { $regex: safe, $options: 'i' } },
      { tags: { $regex: safe, $options: 'i' } },
    ];
  }
  const filter = await accessibleBookFilter(req.user, extra);
  const [total, books] = await Promise.all([
    Book.countDocuments(filter),
    Book.find(filter)
      .select('-extractedText')
      .sort({ title: 1 })
      .skip(skip)
      .limit(limit),
  ]);
  const library = await UserBook.find({
    user: req.user._id,
    book: { $in: books.map((b) => b._id) },
  });
  const map = Object.fromEntries(library.map((ub) => [String(ub.book), ub]));
  const pagination = paginationMeta(page, limit, total);
  res.json({
    success: true,
    data: {
      books: books.map((b) => ({ ...b.toObject(), userMeta: map[String(b._id)] || null })),
      pagination,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
    },
  });
});

exports.search = asyncHandler(async (req, res) => {
  await ensureSeed();
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const q = String(req.query.q || '').trim().slice(0, 100);
  const extra = {};
  if (req.query.category) extra.category = req.query.category;
  if (req.query.subject) extra.subject = req.query.subject;
  if (req.query.author) {
    extra.author = { $regex: escapeRegex(String(req.query.author).slice(0, 80)), $options: 'i' };
  }
  if (req.query.topic) {
    extra['topics.name'] = { $regex: escapeRegex(String(req.query.topic).slice(0, 80)), $options: 'i' };
  }
  if (req.query.scope) extra.scope = req.query.scope;
  if (q) {
    const safe = escapeRegex(q);
    extra.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { author: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
      { searchIndex: { $regex: safe, $options: 'i' } },
      { 'chapters.title': { $regex: safe, $options: 'i' } },
      { 'topics.name': { $regex: safe, $options: 'i' } },
      { isbn: { $regex: safe, $options: 'i' } },
    ];
  }
  const filter = await accessibleBookFilter(req.user, extra);
  const [total, books] = await Promise.all([
    Book.countDocuments(filter),
    Book.find(filter)
      .select('-extractedText')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  const pagination = paginationMeta(page, limit, total);
  res.json({
    success: true,
    data: {
      books,
      pagination,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
    },
  });
});

exports.categories = asyncHandler(async (req, res) => {
  await ensureSeed();
  const filter = await accessibleBookFilter(req.user);
  const categories = await Book.distinct('category', filter);
  res.json({ success: true, data: { categories: categories.filter(Boolean).sort() } });
});

exports.subjects = asyncHandler(async (req, res) => {
  const filter = await accessibleBookFilter(req.user);
  const subjects = await Book.distinct('subject', filter);
  res.json({ success: true, data: { subjects: subjects.filter(Boolean).sort() } });
});

exports.authors = asyncHandler(async (req, res) => {
  const filter = await accessibleBookFilter(req.user);
  const authors = await Book.distinct('author', filter);
  res.json({ success: true, data: { authors: authors.filter(Boolean).sort() } });
});

exports.myLibrary = asyncHandler(async (req, res) => {
  const items = await UserBook.find({ user: req.user._id })
    .populate('book')
    .sort({ updatedAt: -1 })
    .limit(200);
  res.json({ success: true, data: { library: items } });
});

exports.libraryByScope = asyncHandler(async (req, res) => {
  await ensureSeed();
  const scope = req.params.scope;
  if (!['public', 'personal', 'institution', 'company'].includes(scope)) {
    throw new AppError('Invalid library scope', 400);
  }
  const filter = { scope };
  if (scope === 'personal') filter.uploadedBy = req.user._id;
  if (scope === 'institution' || scope === 'company') {
    if (!req.user.organizationId) throw new AppError('No organization on account', 400);
    filter.organizationId = req.user.organizationId;
  }
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 24, maxLimit: 50 });
  const [total, books] = await Promise.all([
    Book.countDocuments(filter),
    Book.find(filter)
      .select('-extractedText')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  const pagination = paginationMeta(page, limit, total);
  res.json({
    success: true,
    data: {
      books,
      scope,
      pagination,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
    },
  });
});

exports.favorites = asyncHandler(async (req, res) => {
  const items = await UserBook.find({ user: req.user._id, favorite: true })
    .populate('book')
    .sort({ updatedAt: -1 })
    .limit(100);
  res.json({ success: true, data: { favorites: items } });
});

exports.recentlyViewed = asyncHandler(async (req, res) => {
  const items = await UserBook.find({
    user: req.user._id,
    lastViewedAt: { $ne: null },
  })
    .populate('book')
    .sort({ lastViewedAt: -1 })
    .limit(30);
  res.json({ success: true, data: { recent: items } });
});

exports.getOne = asyncHandler(async (req, res) => {
  await ensureSeed();
  const book = await Book.findById(req.params.id).populate('relatedBooks', 'title author coverUrl');
  await assertCanAccessBook(req.user, book);
  const userMeta = await touchUserBook(req.user._id, book._id);
  const safe = book.toObject();
  delete safe.extractedText;
  res.json({ success: true, data: { book: { ...safe, userMeta } } });
});

exports.create = asyncHandler(async (req, res) => {
  const scopeInfo = await resolveScope(req.user, req.body.scope);
  if (!req.body.title?.trim() || !req.body.author?.trim()) {
    throw new AppError('Title and author are required', 400);
  }
  const book = await Book.create({
    ...pick(req.body, BOOK_FIELDS),
    category: req.body.category || 'General',
    ...scopeInfo,
    uploadedBy: req.user._id,
    searchIndex: '',
  });
  book.searchIndex = bookKnowledge.buildSearchIndex(book);
  await book.save();
  res.status(201).json({ success: true, data: { book } });
});

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('PDF or text file is required', 400);
  const scopeInfo = await resolveScope(req.user, req.body.scope || 'personal');
  const processed = await bookKnowledge.processBookFile(
    req.file.path,
    req.file.originalname,
    req.file.mimetype
  );
  const title =
    (req.body.title || processed.suggestedTitle || req.file.originalname).trim().slice(0, 240);
  const author = (req.body.author || 'Unknown').trim().slice(0, 160);
  const book = await Book.create({
    title,
    author,
    category: req.body.category || 'General',
    subject: req.body.subject || '',
    publisher: req.body.publisher || '',
    isbn: req.body.isbn || processed.isbn || '',
    version: req.body.version || '1.0',
    description: req.body.description || '',
    pages: Number(req.body.pages) || processed.pages || 0,
    tags: Array.isArray(req.body.tags)
      ? req.body.tags
      : String(req.body.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 20),
    ...scopeInfo,
    uploadedBy: req.user._id,
    fileUrl: toAssetUrl(req.file.filename),
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    extractedText: processed.extractedText,
    chapters: processed.chapters,
    topics: processed.topics,
    processingStatus: processed.processingStatus,
    aiPrepared: false,
  });
  book.searchIndex = bookKnowledge.buildSearchIndex(book);
  await book.save();
  await Notification.create({
    user: req.user._id,
    title: 'Book uploaded',
    message: `"${book.title}" is ready in your library`,
    type: 'success',
    link: '/books',
  });
  const safe = book.toObject();
  delete safe.extractedText;
  res.status(201).json({ success: true, data: { book: safe } });
});

exports.update = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanManageBook(req.user, book);
  Object.assign(book, pick(req.body, BOOK_FIELDS));
  if (req.body.category) book.category = req.body.category;
  if (Array.isArray(req.body.chapters)) book.chapters = req.body.chapters.slice(0, 80);
  if (Array.isArray(req.body.topics)) book.topics = req.body.topics.slice(0, 80);
  book.searchIndex = bookKnowledge.buildSearchIndex(book);
  await book.save();
  const safe = book.toObject();
  delete safe.extractedText;
  res.json({ success: true, data: { book: safe } });
});

exports.remove = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanManageBook(req.user, book);
  if (book.fileUrl) {
    const filename = path.basename(book.fileUrl);
    const full = path.join(__dirname, '..', 'uploads', filename);
    if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch {
        /* ignore */
      }
    }
  }
  await UserBook.deleteMany({ book: book._id });
  await book.deleteOne();
  res.json({ success: true, message: 'Book deleted' });
});

exports.listChapters = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).select('chapters title scope organizationId uploadedBy');
  await assertCanAccessBook(req.user, book);
  res.json({
    success: true,
    data: {
      chapters: (book.chapters || []).map((c) => ({
        id: c._id,
        title: c.title,
        order: c.order,
        startPage: c.startPage,
        endPage: c.endPage,
        summary: c.summary,
        keyConcepts: c.keyConcepts,
        hasContent: Boolean(c.content),
      })),
    },
  });
});

exports.getChapter = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  const chapter = book.chapters.id(req.params.chapterId);
  if (!chapter) throw new AppError('Chapter not found', 404);
  await touchUserBook(req.user._id, book._id, { currentChapter: chapter.order || 0 });
  res.json({ success: true, data: { chapter } });
});

exports.upsertChapter = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanManageBook(req.user, book);
  if (req.params.chapterId) {
    const chapter = book.chapters.id(req.params.chapterId);
    if (!chapter) throw new AppError('Chapter not found', 404);
    Object.assign(
      chapter,
      pick(req.body, ['title', 'order', 'startPage', 'endPage', 'content', 'summary', 'keyConcepts'])
    );
  } else {
    book.chapters.push({
      title: req.body.title || `Chapter ${(book.chapters?.length || 0) + 1}`,
      order: req.body.order || (book.chapters?.length || 0) + 1,
      startPage: req.body.startPage || 0,
      endPage: req.body.endPage || 0,
      content: req.body.content || '',
      summary: req.body.summary || '',
      keyConcepts: req.body.keyConcepts || [],
    });
  }
  book.searchIndex = bookKnowledge.buildSearchIndex(book);
  await book.save();
  res.json({ success: true, data: { chapters: book.chapters } });
});

exports.setTopics = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanManageBook(req.user, book);
  const topics = Array.isArray(req.body.topics) ? req.body.topics.slice(0, 80) : [];
  book.topics = topics.map((t) => ({
    name: String(t.name || t).slice(0, 120),
    chapterOrder: Number(t.chapterOrder) || 0,
  }));
  book.searchIndex = bookKnowledge.buildSearchIndex(book);
  await book.save();
  res.json({ success: true, data: { topics: book.topics } });
});

exports.setRelated = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanManageBook(req.user, book);
  book.relatedBooks = Array.isArray(req.body.relatedBooks)
    ? req.body.relatedBooks.slice(0, 20)
    : [];
  await book.save();
  res.json({ success: true, data: { relatedBooks: book.relatedBooks } });
});

exports.reprocess = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanManageBook(req.user, book);
  if (!book.fileUrl) throw new AppError('No uploaded file to process', 400);
  const filename = path.basename(book.fileUrl);
  const full = path.join(__dirname, '..', 'uploads', filename);
  if (!fs.existsSync(full)) throw new AppError('Source file missing on disk', 404);
  book.processingStatus = 'processing';
  await book.save();
  const processed = await bookKnowledge.processBookFile(full, book.fileName || filename, book.mimeType);
  book.extractedText = processed.extractedText;
  book.chapters = processed.chapters;
  book.topics = processed.topics;
  book.pages = book.pages || processed.pages;
  if (!book.isbn && processed.isbn) book.isbn = processed.isbn;
  book.processingStatus = processed.processingStatus;
  book.searchIndex = bookKnowledge.buildSearchIndex(book);
  await book.save();
  const safe = book.toObject();
  delete safe.extractedText;
  res.json({ success: true, data: { book: safe } });
});

exports.prepareAi = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  const knowledge = bookKnowledge.prepareAiKnowledge(book);
  const prompt = `Prepare structured study knowledge for this book as JSON with keys: overview, learningOutcomes[], prerequisiteTopics[], chapterGuides[{title,focus}].\n\n${JSON.stringify(knowledge)}`;
  const prepared = (await aiService.runMode('notes', [{ role: 'user', content: prompt }])).content;
  book.aiPrepared = true;
  await book.save();
  await recordBookAiUsage(req.user, 'notes');
  res.json({ success: true, data: { prepared, knowledge } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.bookmark = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  let ub = await UserBook.findOne({ user: req.user._id, book: book._id });
  if (ub) {
    ub.bookmarked = !ub.bookmarked;
    await ub.save();
  } else {
    ub = await UserBook.create({ user: req.user._id, book: book._id, bookmarked: true });
  }
  res.json({ success: true, data: { userBook: ub } });
});

exports.toggleFavorite = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  let ub = await UserBook.findOne({ user: req.user._id, book: book._id });
  if (!ub) ub = await UserBook.create({ user: req.user._id, book: book._id, favorite: true });
  else {
    ub.favorite = !ub.favorite;
    await ub.save();
  }
  res.json({ success: true, data: { userBook: ub } });
});

exports.updateProgress = asyncHandler(async (req, res) => {
  const { readingProgress, status, currentChapter } = req.body;
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  let ub = await UserBook.findOne({ user: req.user._id, book: book._id });
  if (!ub) {
    ub = await UserBook.create({
      user: req.user._id,
      book: book._id,
      bookmarked: true,
    });
  }
  const wasDone = ub.status === 'done';
  if (readingProgress !== undefined) ub.readingProgress = Math.min(100, Math.max(0, readingProgress));
  if (status) ub.status = status;
  if (currentChapter !== undefined) ub.currentChapter = Number(currentChapter) || 0;
  if (ub.readingProgress === 100) ub.status = 'done';
  else if (ub.readingProgress > 0 && ub.status === 'want') ub.status = 'reading';
  ub.lastViewedAt = new Date();
  await ub.save();
  if (!wasDone && ub.status === 'done') {
    await Notification.create({
      user: req.user._id,
      title: 'Book finished',
      message: `You finished "${book.title}"`,
      type: 'success',
      link: '/books',
    });
    const { safeEmit } = require('../utils/platformEvents');
    await safeEmit(req.user, {
      type: 'book_finished',
      module: 'books',
      title: book.title,
      refType: 'Book',
      refId: book._id,
      payload: { readingProgress: ub.readingProgress },
    });
  }
  res.json({ success: true, data: { userBook: ub } });
});

exports.addHighlight = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  if (!req.body.text?.trim()) throw new AppError('Highlight text required', 400);
  let ub = await UserBook.findOne({ user: req.user._id, book: book._id });
  if (!ub) ub = await UserBook.create({ user: req.user._id, book: book._id });
  ub.highlights.push({
    chapterId: req.body.chapterId || null,
    text: String(req.body.text).slice(0, 2000),
    color: String(req.body.color || 'yellow').slice(0, 20),
    page: Number(req.body.page) || 0,
    note: String(req.body.note || '').slice(0, 1000),
  });
  await ub.save();
  res.status(201).json({ success: true, data: { userBook: ub } });
});

exports.addNote = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  if (!req.body.body?.trim()) throw new AppError('Note body required', 400);
  let ub = await UserBook.findOne({ user: req.user._id, book: book._id });
  if (!ub) ub = await UserBook.create({ user: req.user._id, book: book._id });
  ub.notes.push({
    chapterId: req.body.chapterId || null,
    body: String(req.body.body).slice(0, 4000),
    page: Number(req.body.page) || 0,
  });
  await ub.save();
  res.status(201).json({ success: true, data: { userBook: ub } });
});

exports.removeAnnotation = asyncHandler(async (req, res) => {
  const ub = await UserBook.findOne({ user: req.user._id, book: req.params.id });
  if (!ub) throw new AppError('Not found', 404);
  if (req.params.kind === 'highlights') {
    ub.highlights = ub.highlights.filter((h) => String(h._id) !== String(req.params.annotationId));
  } else if (req.params.kind === 'notes') {
    ub.notes = ub.notes.filter((n) => String(n._id) !== String(req.params.annotationId));
  } else {
    throw new AppError('Invalid annotation kind', 400);
  }
  await ub.save();
  res.json({ success: true, data: { userBook: ub } });
});

exports.recommend = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  await ensureSeed();
  const filter = await accessibleBookFilter(req.user);
  const books = await Book.find(filter).limit(40).select('title author category description subject');
  const focus = req.body.focus || req.user.targetCareer || 'career growth';
  const catalog = books
    .map((b) => `${b.title} by ${b.author} [${b.category}/${b.subject || '-'}] — ${b.description}`)
    .join('\n');
  const prompt = `Recommend 4 books for: ${focus}. Prefer from this catalog when possible:\n${catalog}`;
  const recommendations = (await aiService.runMode('books', [{ role: 'user', content: prompt }])).content;
  await recordBookAiUsage(req.user, 'books');
  res.json({ success: true, data: { recommendations, focus } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.aiExplain = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  const ctx = bookKnowledge.chapterContext(book, req.body.chapterId);
  const question = String(req.body.question || 'Explain the main ideas clearly.').slice(0, 1000);
  const reply = (
    await aiService.runMode('pdf', [
      {
        role: 'user',
        content: `Book: ${book.title} by ${book.author}\n\nContext:\n${ctx}\n\nQuestion: ${question}`,
      },
    ])
  ).content;
  await recordBookAiUsage(req.user, 'pdf');
  res.json({ success: true, data: { reply } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.aiSummarizeChapter = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  const chapter = book.chapters.id(req.params.chapterId);
  if (!chapter) throw new AppError('Chapter not found', 404);
  const summary = (
    await aiService.runMode('notes', [
      {
        role: 'user',
        content: `Summarize this chapter into concise study notes with bullets.\n\nTitle: ${chapter.title}\n\n${(chapter.content || '').slice(0, 12000)}`,
      },
    ])
  ).content;
  chapter.summary = summary.slice(0, 5000);
  await book.save();
  await recordBookAiUsage(req.user, 'notes');
  res.json({ success: true, data: { summary, chapter } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.aiKeyConcepts = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  const ctx = bookKnowledge.chapterContext(book, req.body.chapterId || req.params.chapterId);
  const reply = (
    await aiService.runMode('notes', [
      {
        role: 'user',
        content: `Extract 8-12 key concepts as a markdown bullet list from:\n\n${ctx}`,
      },
    ])
  ).content;
  const concepts = reply
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 20);
  if (req.params.chapterId) {
    const chapter = book.chapters.id(req.params.chapterId);
    if (chapter) {
      chapter.keyConcepts = concepts;
      await book.save();
    }
  }
  await recordBookAiUsage(req.user, 'notes');
  res.json({ success: true, data: { concepts, reply } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.aiFlashcards = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  const ctx = bookKnowledge.chapterContext(book, req.body.chapterId);
  const reply = (
    await aiService.runMode('quiz', [
      {
        role: 'user',
        content: `Create 8 flashcards as markdown Q/A pairs from this content:\n\n${ctx}`,
      },
    ])
  ).content;
  await recordBookAiUsage(req.user, 'quiz');
  res.json({ success: true, data: { flashcards: reply } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.aiQuiz = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const book = await Book.findById(req.params.id);
  await assertCanAccessBook(req.user, book);
  const ctx = bookKnowledge.chapterContext(book, req.body.chapterId);
  const quiz = await aiService.generateQuiz(book.title, ctx);
  await recordBookAiUsage(req.user, 'quiz');
  res.json({ success: true, data: { quiz } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});
