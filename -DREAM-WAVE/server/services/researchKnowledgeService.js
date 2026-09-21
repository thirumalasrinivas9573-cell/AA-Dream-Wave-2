const bookKnowledge = require('./bookKnowledgeService');
const logger = require('../utils/logger');

const STOP = new Set(
  'a an the and or but if in on at to for of as is was are were be been being this that these those it its with from by into about over after before between under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just should now also into through during before after above below'.split(
    ' '
  )
);

function extractKeywords(text = '', max = 40) {
  const freq = new Map();
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && w.length < 40 && !STOP.has(w) && !/^\d+$/.test(w));
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function extractConcepts(chapters = [], topics = [], keywords = [], max = 50) {
  const seen = new Set();
  const concepts = [];
  const push = (name) => {
    const key = String(name || '')
      .trim()
      .toLowerCase();
    if (!key || key.length < 3 || seen.has(key)) return;
    seen.add(key);
    concepts.push(String(name).trim().slice(0, 120));
  };
  for (const t of topics) push(t.name || t);
  for (const ch of chapters) {
    for (const c of ch.keyConcepts || []) push(c);
    const titleBits = String(ch.title || '')
      .replace(/^(chapter|unit|part|section)\s+[\w.]+\s*/i, '')
      .split(/[:\-–—]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);
    for (const b of titleBits.slice(0, 2)) push(b);
  }
  for (const k of keywords.slice(0, 20)) push(k);
  return concepts.slice(0, max);
}

function buildRelationships(concepts = [], topics = [], max = 60) {
  const nodes = [...new Set([...(concepts || []), ...(topics || []).map((t) => t.name || t)])].filter(
    Boolean
  );
  const edges = [];
  for (let i = 0; i < nodes.length && edges.length < max; i++) {
    for (let j = i + 1; j < Math.min(nodes.length, i + 4) && edges.length < max; j++) {
      edges.push({
        from: String(nodes[i]).slice(0, 160),
        to: String(nodes[j]).slice(0, 160),
        type: 'related',
        weight: Math.max(1, 4 - (j - i)),
      });
    }
  }
  return edges;
}

function buildKnowledgeGraph(concepts = [], topics = [], relationships = []) {
  const nodes = [];
  const seen = new Set();
  const add = (label, kind) => {
    const id = String(label || '')
      .trim()
      .toLowerCase()
      .slice(0, 80);
    if (!id || seen.has(id)) return;
    seen.add(id);
    nodes.push({ id, label: String(label).slice(0, 120), kind });
  };
  for (const c of concepts) add(c, 'concept');
  for (const t of topics) add(t.name || t, 'topic');
  const edges = (relationships || []).slice(0, 80).map((r) => ({
    from: String(r.from).toLowerCase().slice(0, 80),
    to: String(r.to).toLowerCase().slice(0, 80),
    type: r.type || 'related',
  }));
  return { nodes: nodes.slice(0, 100), edges };
}

function buildDocumentSearchIndex(doc) {
  const parts = [
    doc.title,
    doc.originalName,
    doc.summary,
    ...(doc.tags || []),
    ...(doc.keywords || []),
    ...(doc.concepts || []),
    ...(doc.topics || []).map((t) => t.name),
    ...(doc.chapters || []).map((c) => `${c.title} ${c.summary || ''}`),
    (doc.extractedText || '').slice(0, 8000),
  ];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 50000);
}

/**
 * Enrich a Document with knowledge-engine fields from extracted text.
 */
function enrichDocumentKnowledge(doc) {
  const text = doc.extractedText || '';
  const chapters = bookKnowledge.extractChaptersFromText(text);
  const topics = bookKnowledge.extractTopicsFromChapters(chapters);
  const keywords = extractKeywords(text);
  const concepts = extractConcepts(chapters, topics, keywords);
  const relationships = buildRelationships(concepts, topics);
  const knowledgeGraph = buildKnowledgeGraph(concepts, topics, relationships);
  const meta = bookKnowledge.extractMetadataFromText(text, doc.originalName || doc.title || '');

  doc.chapters = chapters;
  doc.topics = topics;
  doc.keywords = keywords;
  doc.concepts = concepts;
  doc.relationships = relationships;
  doc.knowledgeGraph = knowledgeGraph;
  doc.searchIndex = buildDocumentSearchIndex(doc);
  doc.processingStatus = text ? 'ready' : 'failed';
  doc.status = text ? 'processed' : doc.status || 'uploaded';
  if (!doc.summary && text) {
    doc.summary = text.slice(0, 600).replace(/\s+/g, ' ').trim();
  }
  return { meta, nodeCount: knowledgeGraph.nodes.length };
}

async function processDocumentAsync(docId) {
  try {
    const Document = require('../models/Document');
    const doc = await Document.findById(docId);
    if (!doc) return;
    doc.processingStatus = 'processing';
    await doc.save();
    enrichDocumentKnowledge(doc);
    await doc.save();

    if (doc.researchProject) {
      const ResearchProject = require('../models/ResearchProject');
      const project = await ResearchProject.findById(doc.researchProject);
      if (project) {
        const nodeCount = (doc.knowledgeGraph?.nodes || []).length;
        project.stats = project.stats || {};
        project.stats.knowledgeNodes = (project.stats.knowledgeNodes || 0) + nodeCount;
        project.stats.lastActivityAt = new Date();
        project.pushHistory('document_processed', { documentId: String(doc._id), nodeCount });
        await project.save();
      }
    }
  } catch (err) {
    logger.warn('research knowledge processing failed', { error: err.message, docId: String(docId) });
    try {
      const Document = require('../models/Document');
      await Document.findByIdAndUpdate(docId, { processingStatus: 'failed' });
    } catch (_) {
      /* ignore */
    }
  }
}

function scheduleDocumentProcessing(docId) {
  setImmediate(() => {
    processDocumentAsync(docId).catch((err) =>
      logger.warn('scheduleDocumentProcessing', { error: err.message })
    );
  });
}

function scoreTextMatch(haystack, query) {
  const h = String(haystack || '').toLowerCase();
  const terms = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (!terms.length) return 0;
  let score = 0;
  for (const t of terms) {
    if (h.includes(t)) score += 2;
    if (h.startsWith(t)) score += 1;
  }
  return score;
}

function chapterContext(doc, chapterId) {
  return bookKnowledge.chapterContext(
    { chapters: doc.chapters, extractedText: doc.extractedText },
    chapterId
  );
}

module.exports = {
  extractKeywords,
  extractConcepts,
  buildRelationships,
  buildKnowledgeGraph,
  buildDocumentSearchIndex,
  enrichDocumentKnowledge,
  processDocumentAsync,
  scheduleDocumentProcessing,
  scoreTextMatch,
  chapterContext,
};
