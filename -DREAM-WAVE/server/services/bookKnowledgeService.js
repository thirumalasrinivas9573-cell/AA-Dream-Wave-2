const { extractText, detectFileType } = require('./documentService');

/**
 * Build searchable denormalized text for a book document.
 */
function buildSearchIndex(book) {
  const parts = [
    book.title,
    book.author,
    book.category,
    book.subject,
    book.publisher,
    book.isbn,
    book.description,
    ...(book.tags || []),
    ...(book.topics || []).map((t) => t.name),
    ...(book.chapters || []).map((c) => `${c.title} ${c.summary || ''} ${(c.keyConcepts || []).join(' ')}`),
  ];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 50000);
}

/**
 * Heuristic chapter extraction from plain text (PDF extract).
 * Splits on common chapter headings; falls back to sized chunks.
 */
function extractChaptersFromText(text = '', maxChapters = 40) {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (!clean) return [];

  const headingRe = /(?:^|\n)\s*(?:chapter|unit|part|section)\s+(\d+[a-z]?|[ivxlcdm]+|[A-Z])[\s.:\-–—]+([^\n]{3,120})/gi;
  const matches = [...clean.matchAll(headingRe)];

  if (matches.length >= 2) {
    const chapters = [];
    for (let i = 0; i < matches.length && chapters.length < maxChapters; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : clean.length;
      const title = `${matches[i][0].replace(/^\n/, '').trim()}`.slice(0, 200);
      const content = clean.slice(start, end).trim().slice(0, 20000);
      chapters.push({
        title: title || `Chapter ${i + 1}`,
        order: i + 1,
        startPage: 0,
        endPage: 0,
        content,
        summary: '',
        keyConcepts: [],
      });
    }
    return chapters;
  }

  const chunkSize = 3500;
  const chapters = [];
  for (let i = 0; i < clean.length && chapters.length < maxChapters; i += chunkSize) {
    const content = clean.slice(i, i + chunkSize).trim();
    if (!content) continue;
    chapters.push({
      title: `Section ${chapters.length + 1}`,
      order: chapters.length + 1,
      startPage: 0,
      endPage: 0,
      content: content.slice(0, 20000),
      summary: '',
      keyConcepts: [],
    });
  }
  return chapters;
}

function extractTopicsFromChapters(chapters = [], maxTopics = 40) {
  const topics = [];
  const seen = new Set();
  for (const ch of chapters) {
    const words = String(ch.title || '')
      .replace(/chapter\s+\d+/i, '')
      .split(/[\s,:;\-–—/]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 3 && w.length < 40);
    for (const w of words.slice(0, 3)) {
      const key = w.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      topics.push({ name: w, chapterOrder: ch.order || 0 });
      if (topics.length >= maxTopics) return topics;
    }
  }
  return topics;
}

function extractMetadataFromText(text = '', originalName = '') {
  const sample = String(text || '').slice(0, 4000);
  const isbnMatch = sample.match(/ISBN(?:-1[03])?[:\s]*([0-9\-Xx]{10,17})/i);
  const pagesEstimate = Math.max(1, Math.ceil(String(text || '').length / 1800));
  return {
    isbn: isbnMatch ? isbnMatch[1].replace(/[^0-9Xx-]/g, '').slice(0, 32) : '',
    pages: pagesEstimate,
    suggestedTitle: originalName
      ? originalName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 240)
      : '',
  };
}

/**
 * Process an uploaded PDF/text file into book knowledge fields.
 */
async function processBookFile(filePath, originalName, mimeType) {
  const fileType = detectFileType(originalName, mimeType);
  if (!['pdf', 'text'].includes(fileType)) {
    const err = new Error('Only PDF or text files are supported for book processing');
    err.statusCode = 400;
    throw err;
  }
  const extractedText = await extractText(filePath, fileType, originalName);
  const meta = extractMetadataFromText(extractedText, originalName);
  const chapters = extractChaptersFromText(extractedText);
  const topics = extractTopicsFromChapters(chapters);
  return {
    fileType,
    extractedText: (extractedText || '').slice(0, 200000),
    chapters,
    topics,
    pages: meta.pages,
    isbn: meta.isbn,
    suggestedTitle: meta.suggestedTitle,
    processingStatus: extractedText ? 'ready' : 'failed',
  };
}

function chapterContext(book, chapterId) {
  if (!chapterId) {
    return (book.extractedText || book.description || '').slice(0, 12000);
  }
  const chapter = (book.chapters || []).id
    ? book.chapters.id(chapterId)
    : (book.chapters || []).find((c) => String(c._id) === String(chapterId));
  if (!chapter) return (book.extractedText || '').slice(0, 12000);
  return `${chapter.title}\n\n${chapter.content || chapter.summary || ''}`.slice(0, 12000);
}

function prepareAiKnowledge(book) {
  return {
    title: book.title,
    author: book.author,
    category: book.category,
    subject: book.subject,
    topics: (book.topics || []).map((t) => t.name),
    chapterTitles: (book.chapters || []).map((c) => c.title),
    excerpt: (book.extractedText || book.description || '').slice(0, 4000),
  };
}

module.exports = {
  buildSearchIndex,
  extractChaptersFromText,
  extractTopicsFromChapters,
  extractMetadataFromText,
  processBookFile,
  chapterContext,
  prepareAiKnowledge,
};
