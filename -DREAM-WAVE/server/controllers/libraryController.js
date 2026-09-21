const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const LibraryBook = require('../models/LibraryBook');
const { CANONICAL_CATEGORIES } = LibraryBook;
const LibraryProgress = require('../models/LibraryProgress');
const LibraryCollection = require('../models/LibraryCollection');
const LibraryCategory = require('../models/LibraryCategory');
const LibraryAuthor = require('../models/LibraryAuthor');
const LibraryPublisher = require('../models/LibraryPublisher');
const LibraryTag = require('../models/LibraryTag');
const LibraryAnnotation = require('../models/LibraryAnnotation');
const LibraryReadingSession = require('../models/LibraryReadingSession');
const Goal = require('../models/Goal');
const { paginate } = require('../utils/portalHelpers');
const { openai } = require('../utils/openaiClient');
const { getInstitutionForUser, getCompanyForUser } = require('../utils/portalHelpers');

const fail = (res, err, status = 500) =>
  res.status(err.statusCode || status).json({ success: false, message: err.message || 'Server error' });

const BOOK_FIELDS = [
  'title', 'subtitle', 'author', 'authors', 'publisher', 'edition',
  'publicationYear', 'language', 'isbn', 'category', 'categories', 'tags',
  'subjects', 'description', 'coverUrl', 'pdfUrl', 'pages', 'estimatedMinutes',
  'difficulty', 'tableOfContents', 'license',
];
const COLLECTION_FIELDS = ['title', 'slug', 'description', 'coverUrl', 'type', 'bookIds', 'tags'];
const LEGAL_TYPES = ['public-domain', 'open-educational-resource', 'institution-licensed', 'external-legal-source', 'user-uploaded'];
const ANNOTATION_TYPES = ['bookmark', 'highlight', 'underline', 'note', 'quote', 'page-tag'];

function pick(source, fields) {
  return Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]));
}

function validId(value) {
  return mongoose.isValidObjectId(value);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function activeBook(id) {
  if (!validId(id)) return null;
  return LibraryBook.findOne({ _id: id, status: 'active' });
}

function normalizeLicense(input = {}) {
  const type = input.type === 'licensed' ? 'institution-licensed' : input.type;
  if (!LEGAL_TYPES.includes(type)) {
    throw Object.assign(new Error('A supported legal rights basis is required'), { statusCode: 400 });
  }
  const sourceUrl = String(input.sourceUrl || '').trim();
  const attribution = String(input.attribution || '').trim();
  if (type !== 'institution-licensed' && type !== 'user-uploaded' && !sourceUrl) {
    throw Object.assign(new Error('A legal source URL is required'), { statusCode: 400 });
  }
  if (!attribution && type !== 'user-uploaded') {
    throw Object.assign(new Error('Rights attribution is required'), { statusCode: 400 });
  }
  return {
    type,
    licenseCode: String(input.licenseCode || '').trim().slice(0, 100),
    licenseUrl: String(input.licenseUrl || '').trim().slice(0, 1000),
    attribution: (attribution || 'Uploaded by student for personal study').slice(0, 1000),
    sourceUrl: sourceUrl.slice(0, 1000),
    rightsHolder: String(input.rightsHolder || '').trim().slice(0, 300),
    validUntil: input.validUntil || undefined,
    verificationStatus: 'pending',
    externalOnly: Boolean(input.externalOnly || type === 'external-legal-source'),
    allowDownload: Boolean(input.allowDownload),
    allowPrint: Boolean(input.allowPrint),
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function upsertAuthorPublisherTags(book) {
  if (book.author) {
    await LibraryAuthor.updateOne(
      { name: book.author },
      { $setOnInsert: { name: book.author }, $inc: { bookCount: 1 } },
      { upsert: true },
    );
  }
  if (book.publisher) {
    await LibraryPublisher.updateOne(
      { name: book.publisher },
      { $setOnInsert: { name: book.publisher }, $inc: { bookCount: 1 } },
      { upsert: true },
    );
  }
  for (const tag of book.tags || []) {
    const slug = String(tag).toLowerCase().replace(/\s+/g, '-');
    await LibraryTag.updateOne(
      { slug },
      { $setOnInsert: { name: tag, slug }, $inc: { usageCount: 1 } },
      { upsert: true },
    );
  }
}

exports.listCategories = async (req, res) => {
  try {
    await LibraryCategory.ensureCanonical().catch(() => {});
    const used = await LibraryBook.distinct('category', { status: 'active' });
    const catalog = await LibraryCategory.find({ active: true }).select('name slug').sort('name');
    const names = [...new Set([
      ...CANONICAL_CATEGORIES,
      ...catalog.map((c) => c.name),
      ...used.filter(Boolean),
    ])];
    res.json({ success: true, categories: names.sort(), canonical: CANONICAL_CATEGORIES });
  } catch (err) { return fail(res, err); }
};

exports.listBooks = async (req, res) => {
  try {
    const {
      q, category, tag, author, publisher, isbn, language, difficulty,
      subject, ownerType, institutionId, companyId, featured, editorsPick, aiPick,
      sort, page, limit,
    } = req.query;
    const filter = { status: 'active' };
    if (category) filter.$or = [{ category }, { categories: category }];
    if (tag) filter.tags = new RegExp(escapeRegex(String(tag).slice(0, 100)), 'i');
    if (author) filter.author = new RegExp(escapeRegex(String(author).trim().slice(0, 100)), 'i');
    if (publisher) filter.publisher = new RegExp(escapeRegex(String(publisher).trim().slice(0, 100)), 'i');
    if (isbn) filter.isbn = new RegExp(escapeRegex(String(isbn).trim().slice(0, 40)), 'i');
    if (language) filter.language = language;
    if (difficulty) filter.difficulty = difficulty;
    if (subject) filter.subjects = new RegExp(escapeRegex(String(subject).slice(0, 100)), 'i');
    if (req.query.maxMinutes) filter.estimatedMinutes = { $lte: Math.max(1, Math.min(100000, Number(req.query.maxMinutes) || 100000)) };
    if (ownerType) filter.ownerType = ownerType;
    if (institutionId) filter.institutionId = institutionId;
    if (companyId) filter.companyId = companyId;
    if (featured === 'true') filter.featured = true;
    if (editorsPick === 'true') filter.editorsPick = true;
    if (aiPick === 'true') filter.aiPick = true;
    if (q) filter.$text = { $search: String(q) };

    let sortSpec = { createdAt: -1 };
    if (sort === 'popular') sortSpec = { downloads: -1, views: -1 };
    else if (sort === 'trending') sortSpec = { views: -1, saves: -1 };
    else if (sort === 'title') sortSpec = { title: 1 };
    else if (sort === 'newest') sortSpec = { createdAt: -1 };

    const { query, page: p, limit: l } = paginate(LibraryBook.find(filter).sort(sortSpec), { page, limit });
    const [items, total] = await Promise.all([query, LibraryBook.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) { return fail(res, err); }
};

exports.searchBooks = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 120);
    if (!q) return res.json({ success: true, books: [], authors: [], publishers: [], tags: [], categories: [] });
    const textFilter = { status: 'active', $text: { $search: q } };
    const [books, authors, publishers, tags] = await Promise.all([
      LibraryBook.find(textFilter).limit(24),
      LibraryAuthor.find({ name: new RegExp(escapeRegex(q), 'i') }).limit(10),
      LibraryPublisher.find({ name: new RegExp(escapeRegex(q), 'i') }).limit(10),
      LibraryTag.find({ name: new RegExp(escapeRegex(q), 'i') }).limit(10),
    ]);
    const categories = CANONICAL_CATEGORIES.filter((c) => c.toLowerCase().includes(q.toLowerCase()));
    res.json({ success: true, books, authors, publishers, tags, categories });
  } catch (err) { return fail(res, err); }
};

exports.getHome = async (req, res) => {
  try {
    const base = { status: 'active' };
    const [
      recentlyAdded, trending, popular, featured, editorsPicks, aiPicks,
      careerCols, courseCols, researchCols, institutionCols, companyCols,
    ] = await Promise.all([
      LibraryBook.find(base).sort('-createdAt').limit(12),
      LibraryBook.find(base).sort('-views').limit(12),
      LibraryBook.find(base).sort('-downloads').limit(12),
      LibraryBook.find({ ...base, featured: true }).limit(12),
      LibraryBook.find({ ...base, editorsPick: true }).limit(12),
      LibraryBook.find({ ...base, aiPick: true }).limit(12),
      LibraryCollection.find({ status: 'published', type: 'career' }).populate({ path: 'bookIds', match: { status: 'active' } }).limit(8),
      LibraryCollection.find({ status: 'published', type: 'course' }).populate({ path: 'bookIds', match: { status: 'active' } }).limit(8),
      LibraryCollection.find({ status: 'published', type: 'research' }).populate({ path: 'bookIds', match: { status: 'active' } }).limit(8),
      LibraryCollection.find({ status: 'published', ownerType: 'institution' }).populate({ path: 'bookIds', match: { status: 'active' } }).limit(8),
      LibraryCollection.find({ status: 'published', ownerType: 'company' }).populate({ path: 'bookIds', match: { status: 'active' } }).limit(8),
    ]);

    let continueReading = [];
    let recommended = [];
    let saved = [];
    let history = [];
    if (req.user) {
      const [cont, rec, fav, hist] = await Promise.all([
        LibraryProgress.find({ userId: req.user._id, percent: { $lt: 100 } }).sort('-lastReadAt').limit(10).populate('bookId'),
        exports._recommendForUser(req.user._id),
        LibraryProgress.find({ userId: req.user._id, favorite: true }).sort('-updatedAt').limit(12).populate('bookId'),
        LibraryProgress.find({ userId: req.user._id }).sort('-lastReadAt').limit(20).populate('bookId'),
      ]);
      continueReading = cont;
      recommended = rec;
      saved = fav;
      history = hist;
    }

    res.json({
      success: true,
      home: {
        continueReading,
        recommended,
        recentlyAdded,
        trending,
        popular,
        featured: featured.length ? featured : recentlyAdded.slice(0, 8),
        editorsPicks: editorsPicks.length ? editorsPicks : popular.slice(0, 8),
        aiPicks: aiPicks.length ? aiPicks : trending.slice(0, 8),
        saved,
        bookmarks: saved,
        history,
        collections: {
          career: careerCols,
          course: courseCols,
          research: researchCols,
          institution: institutionCols,
          company: companyCols,
        },
        categories: CANONICAL_CATEGORIES,
      },
    });
  } catch (err) { return fail(res, err); }
};

exports._recommendForUser = async (userId) => {
  const recent = await LibraryProgress.find({ userId }).sort('-lastReadAt').limit(8).populate('bookId');
  const cats = [...new Set(recent.map((r) => r.bookId?.category).filter(Boolean))];
  const tags = [...new Set(recent.flatMap((r) => r.bookId?.tags || []))].slice(0, 12);
  const readIds = recent.map((r) => r.bookId?._id).filter(Boolean);

  let goalKeywords = [];
  try {
    const goals = await Goal.find({ userId }).sort('-updatedAt').limit(5);
    goalKeywords = goals.flatMap((g) => [g.title, g.category, g.description, ...(g.aiPlan || [])]).filter(Boolean);
  } catch { /* Goal shape may vary */ }

  const filter = { status: 'active', _id: { $nin: readIds } };
  if (cats.length) filter.category = { $in: cats };

  let items = await LibraryBook.find(filter).sort('-views').limit(12);
  if (items.length < 6 && tags.length) {
    const more = await LibraryBook.find({
      status: 'active',
      _id: { $nin: [...readIds, ...items.map((i) => i._id)] },
      tags: { $in: tags },
    }).limit(8);
    items = [...items, ...more];
  }
  if (items.length < 6) {
    const more = await LibraryBook.find({ status: 'active', _id: { $nin: [...readIds, ...items.map((i) => i._id)] } })
      .sort('-downloads')
      .limit(12 - items.length);
    items = [...items, ...more];
  }

  if (goalKeywords.length) {
    const q = goalKeywords.slice(0, 5).join(' ');
    try {
      const goalBooks = await LibraryBook.find({
        status: 'active',
        $text: { $search: q },
        _id: { $nin: [...readIds, ...items.map((i) => i._id)] },
      }).limit(6);
      items = [...goalBooks, ...items];
    } catch { /* text index miss */ }
  }
  return items.slice(0, 12);
};

exports.getBook = async (req, res) => {
  try {
    const book = await activeBook(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    await LibraryBook.findByIdAndUpdate(book._id, { $inc: { views: 1 } });
    const related = await LibraryBook.find({
      status: 'active',
      _id: { $ne: book._id },
      $or: [
        { category: book.category },
        { tags: { $in: book.tags || [] } },
        { author: book.author },
      ],
    }).limit(8);
    res.json({ success: true, book, related });
  } catch (err) { return fail(res, err); }
};

exports.getPdf = async (req, res) => {
  try {
    const book = await activeBook(req.params.id);
    if (!book?.pdfUrl) return res.status(404).json({ success: false, message: 'PDF not found' });
    if (book.ownerType === 'student' && String(book.uploadedBy || book.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to private document.' });
    }
    if (/^https?:\/\//i.test(book.pdfUrl)) {
      const target = new URL(book.pdfUrl);
      if (target.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, message: 'Only secure legal sources are permitted' });
      }
      return res.redirect(target.toString());
    }
    const storageRoot = path.resolve(process.env.LIBRARY_STORAGE_ROOT || path.join(process.cwd(), 'uploads', 'library'));
    const abs = path.resolve(storageRoot, book.pdfUrl);
    if (abs !== storageRoot && !abs.startsWith(`${storageRoot}${path.sep}`)) {
      return res.status(403).json({ success: false, message: 'Invalid library asset path' });
    }
    if (!fs.existsSync(abs)) return res.status(404).json({ success: false, message: 'File missing on server' });
    res.setHeader('Content-Type', 'application/pdf');
    if (book.license?.allowDownload === false) {
      res.setHeader('Content-Disposition', 'inline');
    }
    fs.createReadStream(abs).pipe(res);
  } catch (err) { return fail(res, err); }
};

exports.trackDownload = async (req, res) => {
  try {
    const book = await LibraryBook.findById(req.params.id);
    if (!book || book.status !== 'active') return res.status(404).json({ success: false, message: 'Not found' });
    if (!book.license?.allowDownload) {
      return res.status(403).json({ success: false, message: 'Download not permitted for this title' });
    }
    await LibraryBook.findByIdAndUpdate(book._id, { $inc: { downloads: 1 } });
    await LibraryProgress.findOneAndUpdate(
      { userId: req.user._id, bookId: book._id },
      { $set: { 'offline.status': 'requested', 'offline.requestedAt': new Date() } },
      { upsert: true },
    );
    res.json({ success: true, pdfUrl: book.pdfUrl.startsWith('http') ? book.pdfUrl : `/api/library/books/${book._id}/pdf` });
  } catch (err) { return fail(res, err); }
};

exports.getProgress = async (req, res) => {
  try {
    const book = await activeBook(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    let progress = await LibraryProgress.findOne({ userId: req.user._id, bookId: req.params.id });
    if (!progress) {
      progress = await LibraryProgress.create({ userId: req.user._id, bookId: req.params.id });
    }
    res.json({ success: true, progress });
  } catch (err) { return fail(res, err); }
};

exports.saveProgress = async (req, res) => {
  try {
    const book = await activeBook(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    const body = {};
    const totalPages = Math.max(0, Math.min(100000, Number(req.body.totalPages || book.pages || 0)));
    const maxPage = totalPages || 100000;
    if (req.body.currentPage !== undefined) body.currentPage = Math.max(1, Math.min(maxPage, Math.round(Number(req.body.currentPage) || 1)));
    body.totalPages = totalPages;
    if (req.body.percent !== undefined || body.currentPage) {
      body.percent = totalPages
        ? Math.min(100, Math.max(0, Math.round((body.currentPage || 1) / totalPages * 100)))
        : Math.min(100, Math.max(0, Number(req.body.percent) || 0));
    }
    if (req.body.dailyGoalPages !== undefined) body.dailyGoalPages = Math.max(1, Math.min(500, Math.round(Number(req.body.dailyGoalPages) || 10)));
    const existing = await LibraryProgress.findOne({ userId: req.user._id, bookId: req.params.id });
    const today = todayKey();
    if (existing) {
      if (body.currentPage && body.currentPage > (existing.currentPage || 0)) {
        const delta = body.currentPage - (existing.currentPage || 0);
        if (existing.lastStreakDate === today) {
          body.pagesReadToday = (existing.pagesReadToday || 0) + delta;
        } else {
          body.pagesReadToday = delta;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = yesterday.toISOString().slice(0, 10);
          body.streakDays = existing.lastStreakDate === yKey ? (existing.streakDays || 0) + 1 : 1;
          body.lastStreakDate = today;
        }
      }
      if (req.body.readingMinutesDelta) {
        const delta = Math.max(0, Math.min(720, Number(req.body.readingMinutesDelta) || 0));
        body.readingMinutes = (existing.readingMinutes || 0) + delta;
      }
    } else {
      body.lastStreakDate = today;
      body.streakDays = 1;
      if (req.body.readingMinutesDelta) {
        body.readingMinutes = Math.max(0, Math.min(720, Number(req.body.readingMinutesDelta) || 0));
      }
    }
    body.lastReadAt = body.lastReadAt || new Date();
    if (body.percent >= 100) {
      body.completedAt = existing?.completedAt || new Date();
      body.readingStatus = 'completed';
    } else if ((body.percent || 0) > 0) {
      body.readingStatus = 'reading';
    }
    const progress = await LibraryProgress.findOneAndUpdate(
      { userId: req.user._id, bookId: req.params.id },
      body,
      { new: true, upsert: true, runValidators: true },
    );
    res.json({ success: true, progress });
  } catch (err) { return fail(res, err); }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const book = await activeBook(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    let progress = await LibraryProgress.findOne({ userId: req.user._id, bookId: req.params.id });
    if (!progress) {
      progress = await LibraryProgress.create({ userId: req.user._id, bookId: req.params.id, favorite: true });
      await LibraryBook.findByIdAndUpdate(req.params.id, { $inc: { saves: 1 } });
    } else {
      progress.favorite = !progress.favorite;
      await progress.save();
      await LibraryBook.findByIdAndUpdate(req.params.id, [
        { $set: { saves: { $max: [0, { $add: ['$saves', progress.favorite ? 1 : -1] }] } } },
      ]);
    }
    res.json({ success: true, progress });
  } catch (err) { return fail(res, err); }
};

exports.continueReading = async (req, res) => {
  try {
    const items = await LibraryProgress.find({ userId: req.user._id, percent: { $lt: 100 } })
      .sort('-lastReadAt')
      .limit(10)
      .populate('bookId');
    res.json({ success: true, items });
  } catch (err) { return fail(res, err); }
};

exports.readingHistory = async (req, res) => {
  try {
    const items = await LibraryProgress.find({ userId: req.user._id })
      .sort('-lastReadAt')
      .limit(50)
      .populate('bookId');
    res.json({ success: true, items });
  } catch (err) { return fail(res, err); }
};

exports.savedBooks = async (req, res) => {
  try {
    const items = await LibraryProgress.find({ userId: req.user._id, favorite: true })
      .sort('-updatedAt')
      .limit(50)
      .populate('bookId');
    res.json({ success: true, items });
  } catch (err) { return fail(res, err); }
};

exports.recommendations = async (req, res) => {
  try {
    const items = await exports._recommendForUser(req.user._id);
    res.json({ success: true, items });
  } catch (err) { return fail(res, err); }
};

exports.listAnnotations = async (req, res) => {
  try {
    if (!await activeBook(req.params.id)) return res.status(404).json({ success: false, message: 'Book not found' });
    const filter = { userId: req.user._id, bookId: req.params.id };
    if (req.query.page) filter.page = Math.max(1, Number(req.query.page) || 1);
    if (req.query.type && ANNOTATION_TYPES.includes(req.query.type)) filter.type = req.query.type;
    const items = await LibraryAnnotation.find(filter).sort({ page: 1, createdAt: -1 }).limit(500);
    res.json({ success: true, items });
  } catch (err) { return fail(res, err); }
};

exports.createAnnotation = async (req, res) => {
  try {
    const book = await activeBook(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    if (!ANNOTATION_TYPES.includes(req.body.type)) {
      return res.status(400).json({ success: false, message: 'Invalid annotation type' });
    }
    const page = Math.max(1, Math.round(Number(req.body.page) || 1));
    if (book.pages && page > book.pages) return res.status(400).json({ success: false, message: 'Page is outside this book' });
    const tags = Array.isArray(req.body.tags)
      ? req.body.tags.slice(0, 20).map((tag) => String(tag).trim().toLowerCase().slice(0, 40)).filter(Boolean)
      : [];
    const item = await LibraryAnnotation.create({
      userId: req.user._id,
      bookId: book._id,
      type: req.body.type,
      page,
      text: String(req.body.text || '').trim().slice(0, 5000),
      content: String(req.body.content || '').trim().slice(0, 10000),
      label: String(req.body.label || '').trim().slice(0, 200),
      color: ['yellow', 'green', 'blue', 'pink', 'purple'].includes(req.body.color) ? req.body.color : 'yellow',
      tags,
      anchor: {
        exact: String(req.body.anchor?.exact || '').slice(0, 5000),
        prefix: String(req.body.anchor?.prefix || '').slice(0, 500),
        suffix: String(req.body.anchor?.suffix || '').slice(0, 500),
      },
    });
    res.status(201).json({ success: true, item });
  } catch (err) { return fail(res, err); }
};

exports.updateAnnotation = async (req, res) => {
  try {
    if (!validId(req.params.annotationId)) return res.status(400).json({ success: false, message: 'Invalid annotation ID' });
    const item = await LibraryAnnotation.findOne({
      _id: req.params.annotationId,
      bookId: req.params.id,
      userId: req.user._id,
    });
    if (!item) return res.status(404).json({ success: false, message: 'Annotation not found' });
    if (req.body.revision && Number(req.body.revision) !== item.revision) {
      return res.status(409).json({ success: false, message: 'Annotation changed in another session' });
    }
    if (req.body.text !== undefined) item.text = String(req.body.text).trim().slice(0, 5000);
    if (req.body.content !== undefined) item.content = String(req.body.content).trim().slice(0, 10000);
    if (req.body.label !== undefined) item.label = String(req.body.label).trim().slice(0, 200);
    if (req.body.tags !== undefined) {
      item.tags = Array.isArray(req.body.tags)
        ? req.body.tags.slice(0, 20).map((tag) => String(tag).trim().toLowerCase().slice(0, 40)).filter(Boolean)
        : [];
    }
    item.revision += 1;
    await item.save();
    res.json({ success: true, item });
  } catch (err) { return fail(res, err); }
};

exports.deleteAnnotation = async (req, res) => {
  try {
    if (!validId(req.params.annotationId)) return res.status(400).json({ success: false, message: 'Invalid annotation ID' });
    const item = await LibraryAnnotation.findOneAndDelete({
      _id: req.params.annotationId,
      bookId: req.params.id,
      userId: req.user._id,
    });
    if (!item) return res.status(404).json({ success: false, message: 'Annotation not found' });
    res.json({ success: true });
  } catch (err) { return fail(res, err); }
};

exports.recordReadingSession = async (req, res) => {
  try {
    const book = await activeBook(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    const clientEventId = String(req.body.clientEventId || '').trim().slice(0, 120);
    if (!clientEventId) return res.status(400).json({ success: false, message: 'Session event ID is required' });
    const previousSession = await LibraryReadingSession.findOne({ userId: req.user._id, clientEventId });
    if (previousSession) return res.json({ success: true, session: previousSession, duplicate: true });
    const startedAt = new Date(req.body.startedAt);
    const endedAt = new Date(req.body.endedAt);
    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime()) || endedAt <= startedAt) {
      return res.status(400).json({ success: false, message: 'Invalid reading session dates' });
    }
    const elapsed = Math.round((endedAt - startedAt) / 1000);
    const durationSeconds = Math.max(0, Math.min(12 * 60 * 60, elapsed, Number(req.body.durationSeconds) || elapsed));
    const startPage = Math.max(1, Math.round(Number(req.body.startPage) || 1));
    const endPage = Math.max(1, Math.min(book.pages || 100000, Math.round(Number(req.body.endPage) || startPage)));
    const pagesRead = Math.max(0, Math.min(1000, Number(req.body.pagesRead) || Math.abs(endPage - startPage)));
    let session;
    try {
      session = await LibraryReadingSession.create({
        userId: req.user._id,
        bookId: book._id,
        clientEventId,
        startedAt,
        endedAt,
        startPage,
        endPage,
        pagesRead,
        durationSeconds,
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      session = await LibraryReadingSession.findOne({ userId: req.user._id, clientEventId });
      return res.json({ success: true, session, duplicate: true });
    }
    const minutes = Math.floor(durationSeconds / 60);
    const totalPages = book.pages || 0;
    const percent = totalPages ? Math.min(100, Math.round(endPage / totalPages * 100)) : 0;
    const progressSet = { currentPage: endPage, totalPages, percent, lastReadAt: endedAt };
    if (percent >= 100) progressSet.completedAt = endedAt;
    await LibraryProgress.findOneAndUpdate(
      { userId: req.user._id, bookId: book._id },
      {
        $set: progressSet,
        $inc: { readingMinutes: minutes },
      },
      { upsert: true, runValidators: true },
    );
    res.status(201).json({ success: true, session });
  } catch (err) { return fail(res, err); }
};

exports.libraryDashboard = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(week.getDate() - 6);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const [progress, sessions, continueReading, annotationCount] = await Promise.all([
      LibraryProgress.find({ userId: req.user._id }).lean(),
      LibraryReadingSession.find({ userId: req.user._id, startedAt: { $gte: month } }).sort('-startedAt').lean(),
      LibraryProgress.find({ userId: req.user._id, percent: { $gt: 0, $lt: 100 } }).sort('-lastReadAt').limit(5).populate('bookId'),
      LibraryAnnotation.countDocuments({ userId: req.user._id }),
    ]);
    const todaySessions = sessions.filter((session) => session.startedAt >= today);
    const weekSessions = sessions.filter((session) => session.startedAt >= week);
    const totals = (items) => ({
      pages: items.reduce((sum, item) => sum + item.pagesRead, 0),
      minutes: Math.round(items.reduce((sum, item) => sum + item.durationSeconds, 0) / 60),
    });
    res.json({
      success: true,
      dashboard: {
        booksStarted: progress.filter((item) => item.percent > 0).length,
        booksCompleted: progress.filter((item) => item.percent >= 100).length,
        savedBooks: progress.filter((item) => item.favorite).length,
        readingMinutes: progress.reduce((sum, item) => sum + item.readingMinutes, 0),
        currentStreak: Math.max(0, ...progress.map((item) => item.streakDays || 0)),
        pagesReadToday: totals(todaySessions).pages,
        minutesToday: totals(todaySessions).minutes,
        pagesReadWeek: totals(weekSessions).pages,
        minutesWeek: totals(weekSessions).minutes,
        pagesReadMonth: totals(sessions).pages,
        minutesMonth: totals(sessions).minutes,
        annotationCount,
        continueReading,
        recentSessions: sessions.slice(0, 8),
      },
    });
  } catch (err) { return fail(res, err); }
};

async function runBookAi(book, mode, focus = '') {
  const cacheKey = {
    summary: 'aiSummary',
    keypoints: 'aiKeyPoints',
    flashcards: 'aiFlashcards',
    questions: 'aiQuestions',
    roadmap: 'aiRoadmap',
  }[mode];

  if (mode === 'summary' && book.aiSummary) return { summary: book.aiSummary };
  if (mode === 'keypoints' && book.aiKeyPoints?.length) return { keyPoints: book.aiKeyPoints };
  if (mode === 'flashcards' && book.aiFlashcards?.length) return { flashcards: book.aiFlashcards };
  if (mode === 'questions' && book.aiQuestions?.length) return { questions: book.aiQuestions };
  if (mode === 'roadmap' && book.aiRoadmap?.length) return { roadmap: book.aiRoadmap };

  const base = `Book: ${book.title}. Author: ${book.author}. Category: ${book.category}. Description: ${(book.description || '').slice(0, 800)}`;
  const prompts = {
    summary: `${base}\nWrite a clear 3-paragraph student summary. No invented citations.`,
    keypoints: `${base}\nReturn JSON { "keyPoints": string[8] } of key learning points.`,
    flashcards: `${base}\nReturn JSON { "flashcards": [{ "question", "answer" }] } with 8 flashcards.`,
    questions: `${base}\nReturn JSON { "questions": [{ "question", "answer" }] } with 6 practice questions.`,
    roadmap: `${base}\nReturn JSON { "roadmap": [{ "step", "topic" }] } a 6-step learning roadmap related to this book.`,
    chapter: `${base}\nChapter focus: ${focus || 'main themes'}. Summarize this chapter focus in 2 paragraphs for students.`,
    definitions: `${base}\nReturn JSON { "definitions": [{ "term", "definition" }] } for 8 core terms.`,
    topics: `${base}\nReturn JSON { "topics": string[10] } related topics to study next.`,
    explain: `${base}\nExplain the concept "${focus || 'core idea'}" in simple language for students (1-2 paragraphs).`,
  };

  let result = {};
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompts[mode] || prompts.summary }],
      max_tokens: 700,
      temperature: 0.4,
    });
    const raw = completion.choices[0]?.message?.content || '';
    if (mode === 'summary' || mode === 'chapter' || mode === 'explain') {
      result = mode === 'summary' ? { summary: raw } : mode === 'chapter' ? { chapterSummary: raw } : { explanation: raw };
      if (mode === 'summary') {
        book.aiSummary = raw;
        await book.save();
      }
    } else {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : {};
      result = parsed;
      if (cacheKey && parsed) {
        if (mode === 'keypoints') book.aiKeyPoints = parsed.keyPoints || [];
        if (mode === 'flashcards') book.aiFlashcards = parsed.flashcards || [];
        if (mode === 'questions') book.aiQuestions = parsed.questions || [];
        if (mode === 'roadmap') book.aiRoadmap = parsed.roadmap || [];
        await book.save();
      }
    }
  } catch {
    if (mode === 'summary') result = { summary: book.description || 'Summary unavailable.' };
    else result = { error: 'AI unavailable', fallback: book.description || '' };
  }
  return result;
}

exports.aiSummary = async (req, res) => {
  try {
    const book = await LibraryBook.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    const data = await runBookAi(book, 'summary');
    res.json({ success: true, ...data });
  } catch (err) { return fail(res, err); }
};

exports.aiTools = async (req, res) => {
  try {
    const book = await LibraryBook.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    const mode = req.query.mode || req.body.mode || 'summary';
    const focus = req.query.focus || req.body.focus || '';
    const data = await runBookAi(book, mode, focus);
    res.json({ success: true, mode, ...data });
  } catch (err) { return fail(res, err); }
};

exports.listCollections = async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.ownerType) filter.ownerType = req.query.ownerType;
    const items = await LibraryCollection.find(filter).populate({ path: 'bookIds', match: { status: 'active' } }).sort('-updatedAt').limit(40);
    res.json({ success: true, items });
  } catch (err) { return fail(res, err); }
};

exports.getCollection = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    const item = await LibraryCollection.findById(req.params.id).populate({ path: 'bookIds', match: { status: 'active' } });
    if (!item || item.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    res.json({ success: true, item });
  } catch (err) { return fail(res, err); }
};

exports.createCollection = async (req, res) => {
  try {
    const role = req.user.role;
    const body = { ...pick(req.body, COLLECTION_FIELDS), status: role === 'admin' && req.body.status === 'draft' ? 'draft' : 'published' };
    if (role === 'institution') {
      const inst = await getInstitutionForUser(req.user._id);
      body.ownerType = 'institution';
      body.ownerId = inst?._id;
      body.institutionId = inst?._id;
      body.type = body.type || 'institution';
    } else if (role === 'company') {
      const company = await getCompanyForUser(req.user._id);
      body.ownerType = 'company';
      body.ownerId = company?._id;
      body.companyId = company?._id;
      body.type = body.type || 'company';
    } else {
      body.ownerType = body.ownerType || 'admin';
    }
    if (!body.slug && body.title) {
      body.slug = String(body.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const item = await LibraryCollection.create(body);
    res.status(201).json({ success: true, item });
  } catch (err) { return fail(res, err); }
};

exports.updateCollection = async (req, res) => {
  try {
    const item = await LibraryCollection.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'institution') {
      const inst = await getInstitutionForUser(req.user._id);
      if (String(item.institutionId) !== String(inst?._id)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    if (req.user.role === 'company') {
      const company = await getCompanyForUser(req.user._id);
      if (String(item.companyId) !== String(company?._id)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    Object.assign(item, pick(req.body, COLLECTION_FIELDS));
    if (req.user.role === 'admin' && ['draft', 'published'].includes(req.body.status)) item.status = req.body.status;
    await item.save();
    res.json({ success: true, item });
  } catch (err) { return fail(res, err); }
};

exports.createBook = async (req, res) => {
  try {
    const body = pick(req.body, BOOK_FIELDS);
    if (!body.title || !body.pdfUrl) return res.status(400).json({ success: false, message: 'Title and legal PDF source are required' });
    body.license = normalizeLicense(body.license);
    body.status = 'pending';
    if (req.user.role === 'institution') {
      const inst = await getInstitutionForUser(req.user._id);
      body.ownerType = 'institution';
      body.ownerId = inst?._id;
      body.institutionId = inst?._id;
    } else if (req.user.role === 'company') {
      const company = await getCompanyForUser(req.user._id);
      body.ownerType = 'company';
      body.ownerId = company?._id;
      body.companyId = company?._id;
    } else {
      body.ownerType = body.ownerType || 'admin';
    }
    const book = await LibraryBook.create(body);
    await upsertAuthorPublisherTags(book).catch(() => {});
    res.status(201).json({ success: true, book });
  } catch (err) { return fail(res, err); }
};

exports.updateBook = async (req, res) => {
  try {
    const book = await LibraryBook.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'institution') {
      const inst = await getInstitutionForUser(req.user._id);
      if (String(book.institutionId) !== String(inst?._id)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    if (req.user.role === 'company') {
      const company = await getCompanyForUser(req.user._id);
      if (String(book.companyId) !== String(company?._id)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    const updates = pick(req.body, BOOK_FIELDS);
    if (updates.license) {
      updates.license = normalizeLicense({ ...book.license?.toObject?.(), ...updates.license });
      book.status = 'pending';
    }
    if (updates.pdfUrl && updates.pdfUrl !== book.pdfUrl) {
      book.status = 'pending';
      book.license.verificationStatus = 'pending';
      book.license.verifiedAt = undefined;
    }
    Object.assign(book, updates);
    if (req.user.role === 'admin' && ['active', 'archived', 'pending'].includes(req.body.status)) {
      book.status = req.body.status;
      if (req.body.status === 'active') {
        book.license.verificationStatus = 'verified';
        book.license.verifiedAt = new Date();
      }
    }
    await book.save();
    res.json({ success: true, book });
  } catch (err) { return fail(res, err); }
};

exports.myOrgBooks = async (req, res) => {
  try {
    const filter = { status: { $ne: 'archived' } };
    if (req.user.role === 'institution') {
      const inst = await getInstitutionForUser(req.user._id);
      filter.institutionId = inst?._id;
    } else if (req.user.role === 'company') {
      const company = await getCompanyForUser(req.user._id);
      filter.companyId = company?._id;
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const items = await LibraryBook.find(filter).sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) { return fail(res, err); }
};

exports.myOrgCollections = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'institution') {
      const inst = await getInstitutionForUser(req.user._id);
      filter.institutionId = inst?._id;
    } else if (req.user.role === 'company') {
      const company = await getCompanyForUser(req.user._id);
      filter.companyId = company?._id;
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const items = await LibraryCollection.find(filter).populate('bookIds').sort('-updatedAt');
    res.json({ success: true, items });
  } catch (err) { return fail(res, err); }
};

exports.filterOptions = async (req, res) => {
  try {
    const [authors, publishers, tags, languages] = await Promise.all([
      LibraryBook.distinct('author', { status: 'active', author: { $nin: [null, ''] } }),
      LibraryBook.distinct('publisher', { status: 'active', publisher: { $nin: [null, ''] } }),
      LibraryBook.distinct('tags', { status: 'active' }),
      LibraryBook.distinct('language', { status: 'active' }),
    ]);
    res.json({
      success: true,
      options: {
        categories: CANONICAL_CATEGORIES,
        authors: authors.filter(Boolean).sort().slice(0, 100),
        publishers: publishers.filter(Boolean).sort().slice(0, 100),
        tags: tags.flat().filter(Boolean).sort().slice(0, 100),
        languages: languages.filter(Boolean).sort(),
        difficulties: ['beginner', 'intermediate', 'advanced'],
      },
    });
  } catch (err) { return fail(res, err); }
};
