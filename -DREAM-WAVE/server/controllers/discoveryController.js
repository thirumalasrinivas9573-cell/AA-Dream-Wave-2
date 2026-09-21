const Promotion = require('../models/Promotion');
const Institution = require('../models/Institution');
const CompanyProfile = require('../models/CompanyProfile');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const LibraryBook = require('../models/LibraryBook');
const Course = require('../models/Course');
const PortalEvent = require('../models/PortalEvent');
const Scholarship = require('../models/Scholarship');
const Research = require('../models/Research');
const LibraryCollection = require('../models/LibraryCollection');
const Faculty = require('../models/Faculty');
const PlatformAnalytics = require('../models/PlatformAnalytics');
const StudentProfile = require('../models/StudentProfile');
const { paginate } = require('../utils/portalHelpers');
const { searchCompanies, searchInstitutions } = require('../services/partnershipService');

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function trackDiscovery(req, path) {
  try {
    await PlatformAnalytics.create({
      eventType: 'discovery',
      path: path || '/discover',
      userId: req.user?._id,
      day: dayKey(),
    });
  } catch { /* non-blocking */ }
}

async function visibleOrganizationIds() {
  const [institutions, companies] = await Promise.all([
    Institution.find({ status: 'approved', isPublic: true }).distinct('_id'),
    CompanyProfile.find({ status: 'approved', isPublic: true }).distinct('_id'),
  ]);
  return { institutions, companies };
}

const organizationFilter = ({ institutions, companies }) => ({
  $or: [
    { ownerType: 'institution', ownerId: { $in: institutions } },
    { ownerType: 'company', ownerId: { $in: companies } },
  ],
});

const discoveryFailure = (res, error, source) => {
  console.error(`[discovery.${source}]`, error.message);
  return res.status(500).json({ success: false, code: 'DISCOVERY_ERROR', message: 'Discovery content is temporarily unavailable.' });
};

// ── Public / student discovery (integration-v1) ────────────────────────────────

exports.getFeed = async (req, res) => {
  try {
    const visible = await visibleOrganizationIds();
    const { category, type, q, page, limit } = req.query;
    const filter = { status: 'published', ...organizationFilter(visible) };
    if (category || type) filter.category = category || type;
    if (q) filter.$text = { $search: q };
    const { query, page: p, limit: l } = paginate(Promotion.find(filter), { page, limit, sort: '-publishedAt' });
    const [items, total] = await Promise.all([query, Promotion.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) {
    return discoveryFailure(res, err, 'feed');
  }
};

exports.getPromotion = async (req, res) => {
  try {
    const item = await Promotion.findById(req.params.id);
    if (!item || item.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const ownerVisible = item.ownerType === 'institution'
      ? await Institution.exists({ _id: item.ownerId, status: 'approved', isPublic: true })
      : await CompanyProfile.exists({ _id: item.ownerId, status: 'approved', isPublic: true });
    if (!ownerVisible) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Not found' });
    item.views += 1;
    await item.save();
    res.json({ success: true, item });
  } catch (err) {
    return discoveryFailure(res, err, 'promotion');
  }
};

exports.getFeatured = async (req, res) => {
  try {
    const visible = await visibleOrganizationIds();
    const [promotions, institutions, companies] = await Promise.all([
      Promotion.find({ status: 'published', ...organizationFilter(visible) }).sort('-engagement').limit(12),
      Institution.find({ status: 'approved', isPublic: true }).sort('-stats.followers').limit(6),
      CompanyProfile.find({ status: 'approved', isPublic: true }).sort('-stats.followers').limit(6),
    ]);
    res.json({ success: true, promotions, institutions, companies });
  } catch (err) {
    return discoveryFailure(res, err, 'featured');
  }
};

/** Full Discovery home — live aggregates only, no fake rows. */
exports.getHome = async (req, res) => {
  try {
    await trackDiscovery(req, '/discover');
    const visible = await visibleOrganizationIds();
    const eventVisibility = organizationFilter(visible);

    const [
      trendingInstitutions,
      trendingCompanies,
      latestJobs,
      latestInternships,
      featuredBooks,
      popularCourses,
      upcomingEvents,
      scholarships,
      hackathons,
      competitions,
      research,
      learningPaths,
      recentlyAddedPromos,
      editorsPicks,
      students,
      faculty,
    ] = await Promise.all([
      Institution.find({ status: 'approved', isPublic: true }).sort('-stats.followers -stats.visitors').limit(10),
      CompanyProfile.find({ status: 'approved', isPublic: true }).sort('-stats.followers -stats.visitors').limit(10),
      Job.find({ status: 'open', companyId: { $in: visible.companies } }).sort('-createdAt').limit(12).populate('companyId', 'name slug logo'),
      Internship.find({ status: 'open', companyId: { $in: visible.companies } }).sort('-createdAt').limit(12).populate('companyId', 'name slug logo'),
      LibraryBook.find({ status: 'active', $or: [{ featured: true }, { editorsPick: true }] }).sort('-views').limit(12)
        .then(async (rows) => (rows.length ? rows : LibraryBook.find({ status: 'active' }).sort('-views').limit(12))),
      Course.find({ status: 'active', institutionId: { $in: visible.institutions } }).sort('-createdAt').limit(12),
      PortalEvent.find({ status: 'published', startDate: { $gte: new Date(Date.now() - 86400000) }, ...eventVisibility }).sort('startDate').limit(12),
      Scholarship.find({ status: 'open', institutionId: { $in: visible.institutions } }).sort('deadline').limit(12),
      PortalEvent.find({ status: 'published', type: 'hackathon', ...eventVisibility }).sort('startDate').limit(10),
      PortalEvent.find({ status: 'published', type: { $in: ['competition', 'coding-challenge'] }, ...eventVisibility }).sort('startDate').limit(10),
      Research.find({ status: { $ne: 'draft' }, institutionId: { $in: visible.institutions } }).sort('-createdAt').limit(10),
      LibraryCollection.find({ status: 'published', type: { $in: ['learning-path', 'career', 'course'] } }).populate('bookIds').limit(10),
      Promotion.find({ status: 'published', ...organizationFilter(visible) }).sort('-publishedAt').limit(12),
      Promotion.find({ status: 'published', ...organizationFilter(visible) }).sort('-engagement').limit(8),
      StudentProfile.find({ 'privacy.visibility': 'public', 'privacy.discoverable': true }).select('userId displayName profilePhoto createdAt').sort('-createdAt').limit(8).lean(),
      Faculty.find({ status: 'active', institutionId: { $in: visible.institutions } }).select('name designation subjects institutionId').limit(8),
    ]);

    res.json({
      success: true,
      home: {
        trendingInstitutions,
        trendingCompanies,
        latestJobs,
        latestInternships,
        featuredBooks,
        popularCourses,
        upcomingEvents,
        scholarships,
        hackathons,
        competitions,
        research,
        learningPaths,
        recentlyAdded: recentlyAddedPromos,
        editorsPicks,
        students: students.map((student) => ({ _id: student.userId, name: student.displayName, profileImage: student.profilePhoto, createdAt: student.createdAt })),
        faculty,
        feedCategories: ['news', 'event', 'job', 'internship', 'hackathon', 'admission', 'scholarship', 'announcement'],
      },
    });
  } catch (err) {
    return discoveryFailure(res, err, 'home');
  }
};

// ── Institution ↔ Company partnership discovery (feature/ui-threejs) ───────────

/** GET /api/discovery/companies */
exports.searchCompanies = async (req, res) => {
  try {
    if (req.user.role !== 'institution') {
      return res.status(403).json({ success: false, message: 'Institution access required' });
    }

    const result = await searchCompanies({
      q: req.query.q,
      industry: req.query.industry,
      location: req.query.location,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.json({
      success: true,
      companies: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pageCount: result.pageCount,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Company search failed',
    });
  }
};

/** GET /api/discovery/institutions */
exports.searchInstitutions = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ success: false, message: 'Company access required' });
    }

    const result = await searchInstitutions({
      q: req.query.q,
      type: req.query.type,
      location: req.query.location,
      department: req.query.department,
      program: req.query.program,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.json({
      success: true,
      institutions: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pageCount: result.pageCount,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Institution search failed',
    });
  }
};

/** GET /api/discovery/companies/:id */
exports.getCompany = async (req, res) => {
  try {
    const Company = require('../models/Company')
    const company = await Company.findOne({ _id: req.params.id, isPublic: true })
      .select(PUBLIC_COMPANY_FIELDS)
      .lean()
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    res.json({ success: true, company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** GET /api/discovery/institutions/:id */
exports.getInstitution = async (req, res) => {
  try {
    const Institution = require('../models/Institution')
    const institution = await Institution.findOne({ _id: req.params.id, isPublic: true })
      .select(PUBLIC_INSTITUTION_FIELDS)
      .lean()
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution not found' });
    }
    res.json({ success: true, institution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
