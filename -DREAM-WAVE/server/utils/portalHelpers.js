const Institution = require('../models/Institution');
const CompanyProfile = require('../models/CompanyProfile');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `org-${Date.now()}`;
}

async function ensureUniqueSlug(Model, base, excludeId = null) {
  let slug = slugify(base);
  let n = 0;
  while (true) {
    const candidate = n ? `${slug}-${n}` : slug;
    const q = { slug: candidate };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Model.findOne(q).select('_id');
    if (!exists) return candidate;
    n += 1;
  }
}

async function getInstitutionForUser(userId) {
  return Institution.findOne({ ownerId: userId });
}

async function getCompanyForUser(userId) {
  return CompanyProfile.findOne({ ownerId: userId });
}

function paginate(query, { page = 1, limit = 20, sort = '-createdAt' }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return {
    query: query.sort(sort).skip((p - 1) * l).limit(l),
    page: p,
    limit: l,
  };
}

function parseSort(sortBy, order = 'desc') {
  if (!sortBy) return '-createdAt';
  const dir = order === 'asc' ? 1 : -1;
  return { [sortBy]: dir };
}

function safeHttpUrl(value, { allowRelative = false, maxLength = 1000 } = {}) {
  const input = String(value || '').trim()
  if (!input) return ''
  if (allowRelative && input.startsWith('/') && !input.startsWith('//')) return input.slice(0, maxLength)
  try {
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return ''
    return url.toString().slice(0, maxLength)
  } catch {
    return ''
  }
}

function cleanPromotionInput(body = {}) {
  return {
    title: String(body.title || '').trim().slice(0, 200),
    content: String(body.content || '').trim().slice(0, 10000),
    category: String(body.category || 'news').trim(),
    image: safeHttpUrl(body.image, { allowRelative: true }),
    link: safeHttpUrl(body.link, { allowRelative: true }),
  }
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = {
  slugify,
  ensureUniqueSlug,
  getInstitutionForUser,
  getCompanyForUser,
  paginate,
  parseSort,
  safeHttpUrl,
  cleanPromotionInput,
  escapeRegex,
};
