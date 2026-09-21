const Institution = require('../models/Institution');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const InstitutionStudent = require('../models/InstitutionStudent');
const Placement = require('../models/Placement');
const PortalEvent = require('../models/PortalEvent');
const Promotion = require('../models/Promotion');
const Gallery = require('../models/Gallery');
const Admission = require('../models/Admission');
const PortalCertificate = require('../models/PortalCertificate');
const Scholarship = require('../models/Scholarship');
const Research = require('../models/Research');
const Application = require('../models/Application');
const Review = require('../models/Review');
const LibraryBook = require('../models/LibraryBook');
const { getInstitutionForUser, ensureUniqueSlug, paginate, cleanPromotionInput } = require('../utils/portalHelpers');
const { openai } = require('../utils/openaiClient');

const fail = (res, err, status = 500) => {
  const statusCode = err.statusCode || status;
  if (statusCode >= 500) console.error('[institution-portal]', err.message);
  return res.status(statusCode).json({
    success: false,
    code: err.code || (statusCode >= 500 ? 'INSTITUTION_PORTAL_ERROR' : 'REQUEST_FAILED'),
    message: statusCode >= 500 ? 'Institution portal request failed.' : err.message || 'Request failed.',
  });
};

async function requireInstitution(req) {
  let inst = await getInstitutionForUser(req.user._id);
  if (!inst && req.user.role === 'admin' && req.body?.institutionId) {
    inst = await Institution.findById(req.body.institutionId);
  }
  if (!inst) {
    const err = new Error('Institution profile not found. Complete registration first.');
    err.statusCode = 404;
    throw err;
  }
  if (inst.status === 'suspended' && req.user.role !== 'admin') {
    const err = new Error('Institution account is suspended.');
    err.statusCode = 403;
    throw err;
  }
  return inst;
}

exports.bootstrap = async (req, res) => {
  try {
    let inst = await getInstitutionForUser(req.user._id);
    if (inst) return res.json({ success: true, institution: inst });
    const name = req.body.name || req.user.organizationName || `${req.user.name}'s Institution`;
    inst = await Institution.create({
      ownerId: req.user._id,
      name,
      slug: await ensureUniqueSlug(Institution, name),
      contact: { email: req.user.email },
      status: 'pending',
      isPublic: false,
    });
    res.status(201).json({ success: true, institution: inst });
  } catch (err) { return fail(res, err); }
};

exports.getMine = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    res.json({ success: true, institution: inst });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.updateMine = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const allowed = [
      'name', 'logo', 'banner', 'about', 'mission', 'vision', 'history', 'leadership', 'campus',
      'academicCalendar', 'placementTimeline', 'internshipsInfo', 'contact', 'social', 'location',
      'admissionInfo', 'scholarships', 'brochureUrl', 'facilities', 'achievements', 'research',
      'recruiters', 'isPublic', 'institutionType', 'establishedYear', 'ranking', 'verified',
    ];
    allowed.forEach((k) => { if (req.body[k] !== undefined) inst[k] = req.body[k]; });
    if (req.body.name && req.body.name !== inst.name) {
      inst.slug = await ensureUniqueSlug(Institution, req.body.name, inst._id);
    }
    await inst.save();
    res.json({ success: true, institution: inst });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.getDashboard = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const [
      students, faculty, courses, departments, admissions, placements,
      events, promotions, gallery, announcements, scholarships, research,
      inboundApps, libraryBooks, reviews,
    ] = await Promise.all([
      InstitutionStudent.countDocuments({ institutionId: inst._id, status: 'active' }),
      Faculty.countDocuments({ institutionId: inst._id, status: 'active' }),
      Course.countDocuments({ institutionId: inst._id, status: 'active' }),
      Department.countDocuments({ ownerType: 'institution', ownerId: inst._id }),
      Admission.countDocuments({ institutionId: inst._id, status: 'pending' }),
      Placement.countDocuments({ institutionId: inst._id }),
      PortalEvent.countDocuments({ ownerType: 'institution', ownerId: inst._id }),
      Promotion.countDocuments({ ownerType: 'institution', ownerId: inst._id, status: 'published' }),
      Gallery.countDocuments({ ownerType: 'institution', ownerId: inst._id, type: 'image' }),
      Promotion.countDocuments({ ownerType: 'institution', ownerId: inst._id, category: 'announcement' }),
      Scholarship.countDocuments({ institutionId: inst._id, status: 'open' }),
      Research.countDocuments({ institutionId: inst._id }),
      Application.countDocuments({ institutionId: inst._id, targetType: 'admission', status: 'pending' }),
      LibraryBook.countDocuments({ status: 'active' }).catch(() => 0),
      Review.find({ targetType: 'institution', targetId: inst._id, status: 'approved' }),
    ]);

    const avgRating = reviews.length
      ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10
      : (inst.stats?.aiRating || 0);

    const placementRows = await Placement.find({ institutionId: inst._id });
    const highestPackage = placementRows.reduce((m, p) => Math.max(m, p.package || 0), 0);
    const avgPackage = placementRows.length
      ? Math.round(placementRows.reduce((s, p) => s + (p.package || 0), 0) / placementRows.length)
      : 0;
    const placedStudents = placementRows.reduce((s, p) => s + (p.studentsPlaced || 0), 0);
    const placementRate = students > 0 ? Math.min(100, Math.round((placedStudents / students) * 100)) : 0;

    inst.stats.studentCount = students;
    inst.stats.facultyCount = faculty;
    inst.stats.highestPackage = highestPackage;
    inst.stats.averagePackage = avgPackage;
    inst.stats.placementRate = placementRate;
    inst.stats.aiRating = avgRating;
    await inst.save();

    const recentAdmissions = await Admission.find({ institutionId: inst._id }).sort('-createdAt').limit(5);
    const recentEvents = await PortalEvent.find({ ownerType: 'institution', ownerId: inst._id }).sort('-startDate').limit(5);
    const recentAnnouncements = await Promotion.find({
      ownerType: 'institution', ownerId: inst._id, category: 'announcement',
    }).sort('-createdAt').limit(5);

    res.json({
      success: true,
      stats: {
        students,
        faculty,
        courses,
        departments,
        admissions: admissions + inboundApps,
        placements,
        events,
        promotions,
        gallery,
        announcements,
        scholarships,
        research,
        library: libraryBooks,
        visitors: inst.stats.visitors || 0,
        rating: avgRating,
        highestPackage,
        averagePackage: avgPackage,
        placementRate,
        ...((inst.stats && typeof inst.stats.toObject === 'function') ? inst.stats.toObject() : (inst.stats || {})),
      },
      recentAdmissions,
      recentEvents,
      recentAnnouncements,
      quickActions: [
        { label: 'Add Student', to: 'students' },
        { label: 'Add Course', to: 'courses' },
        { label: 'Publish Promotion', to: 'promotions' },
        { label: 'Schedule Event', to: 'events' },
        { label: 'Edit Public Profile', to: 'profile' },
      ],
      institution: inst,
    });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.getAnalytics = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const courses = await Course.find({ institutionId: inst._id }).sort('-enrolled').limit(10);
    const admissionsByStatus = await Admission.aggregate([
      { $match: { institutionId: inst._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const appByStatus = await Application.aggregate([
      { $match: { institutionId: inst._id, targetType: 'admission' } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const placements = await Placement.find({ institutionId: inst._id }).sort('-package').limit(10);
    const reviews = await Review.find({ targetType: 'institution', targetId: inst._id, status: 'approved' });
    const avgRating = reviews.length
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : inst.stats.aiRating || 0;
    const promoEngagement = (await Promotion.aggregate([
      { $match: { ownerType: 'institution', ownerId: inst._id } },
      { $group: { _id: null, views: { $sum: '$views' }, engagement: { $sum: '$engagement' } } },
    ]))[0] || { views: 0, engagement: 0 };

    const students = await InstitutionStudent.countDocuments({ institutionId: inst._id, status: 'active' });
    const placed = (await Placement.find({ institutionId: inst._id })).reduce((s, p) => s + (p.studentsPlaced || 0), 0);
    const placementPct = students > 0 ? Math.min(100, Math.round((placed / students) * 100)) : 0;

    // Simple AI institution score from real metrics (0–100)
    const scoreParts = [
      Math.min(25, courses.length * 2),
      Math.min(25, Math.round(avgRating * 5)),
      Math.min(25, Math.round(placementPct / 4)),
      Math.min(25, Math.round((promoEngagement.views || 0) / 20)),
    ];
    const aiInstitutionScore = scoreParts.reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      analytics: {
        admissions: admissionsByStatus,
        applications: appByStatus,
        popularCourses: courses,
        placements,
        visitors: inst.stats.visitors || 0,
        followers: inst.stats.followers || 0,
        applicationsCount: inst.stats.applications || 0,
        courseViews: inst.stats.courseViews || 0,
        galleryViews: inst.stats.galleryViews || 0,
        placementViews: inst.stats.placementViews || 0,
        studentInterest: inst.stats.studentInterest || 0,
        engagement: promoEngagement,
        avgRating: Math.round(avgRating * 10) / 10,
        reviews: reviews.slice(0, 20),
        placementPct,
        aiInstitutionScore,
        growth: {
          students: inst.stats.studentCount,
          faculty: inst.stats.facultyCount,
          placementRate: placementPct,
        },
      },
    });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.getReports = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const [students, faculty, courses, admissions, placements, events, scholarships, research] = await Promise.all([
      InstitutionStudent.find({ institutionId: inst._id }).sort('-updatedAt').limit(50),
      Faculty.find({ institutionId: inst._id }).sort('-updatedAt').limit(50),
      Course.find({ institutionId: inst._id }).sort('-updatedAt').limit(50),
      Admission.find({ institutionId: inst._id }).sort('-createdAt').limit(50),
      Placement.find({ institutionId: inst._id }).sort('-package').limit(50),
      PortalEvent.find({ ownerType: 'institution', ownerId: inst._id }).sort('-startDate').limit(50),
      Scholarship.find({ institutionId: inst._id }).sort('-createdAt').limit(50),
      Research.find({ institutionId: inst._id }).sort('-createdAt').limit(50),
    ]);
    res.json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        institution: { name: inst.name, slug: inst.slug, status: inst.status },
        summaries: {
          students: students.length,
          faculty: faculty.length,
          courses: courses.length,
          admissions: admissions.length,
          placements: placements.length,
          events: events.length,
          scholarships: scholarships.length,
          research: research.length,
        },
        students,
        faculty,
        courses,
        admissions,
        placements,
        events,
        scholarships,
        research,
      },
    });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

// Generic list/create/update/delete factory
function crudList(Model, filterFn) {
  return async (req, res) => {
    try {
      const inst = await requireInstitution(req);
      const filter = filterFn(inst, req);
      const { page, limit } = req.query;
      const { query, page: p, limit: l } = paginate(Model.find(filter), { page, limit });
      const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
      res.json({ success: true, items, total, page: p, limit: l });
    } catch (err) { return fail(res, err, err.statusCode || 500); }
  };
}

function crudCreate(Model, mapFn) {
  return async (req, res) => {
    try {
      const inst = await requireInstitution(req);
      const item = await Model.create(mapFn(inst, req.body));
      res.status(201).json({ success: true, item });
    } catch (err) { return fail(res, err, err.statusCode || 500); }
  };
}

function crudUpdate(Model, filterFn) {
  return async (req, res) => {
    try {
      const inst = await requireInstitution(req);
      const item = await Model.findOneAndUpdate(
        { _id: req.params.id, ...filterFn(inst) },
        req.body,
        { new: true, runValidators: true },
      );
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, item });
    } catch (err) { return fail(res, err, err.statusCode || 500); }
  };
}

function crudDelete(Model, filterFn) {
  return async (req, res) => {
    try {
      const inst = await requireInstitution(req);
      const item = await Model.findOneAndDelete({ _id: req.params.id, ...filterFn(inst) });
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, message: 'Deleted' });
    } catch (err) { return fail(res, err, err.statusCode || 500); }
  };
}

exports.listDepartments = crudList(Department, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));
exports.createDepartment = crudCreate(Department, (inst, body) => ({ ...body, ownerType: 'institution', ownerId: inst._id }));
exports.updateDepartment = crudUpdate(Department, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));
exports.deleteDepartment = crudDelete(Department, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));

exports.listCourses = crudList(Course, (inst) => ({ institutionId: inst._id }));
exports.createCourse = crudCreate(Course, (inst, body) => ({ ...body, institutionId: inst._id }));
exports.updateCourse = crudUpdate(Course, (inst) => ({ institutionId: inst._id }));
exports.deleteCourse = crudDelete(Course, (inst) => ({ institutionId: inst._id }));

exports.listFaculty = crudList(Faculty, (inst) => ({ institutionId: inst._id }));
exports.createFaculty = crudCreate(Faculty, (inst, body) => ({ ...body, institutionId: inst._id }));
exports.updateFaculty = crudUpdate(Faculty, (inst) => ({ institutionId: inst._id }));
exports.deleteFaculty = crudDelete(Faculty, (inst) => ({ institutionId: inst._id }));

exports.listStudents = crudList(InstitutionStudent, (inst) => ({ institutionId: inst._id }));
exports.createStudent = crudCreate(InstitutionStudent, (inst, body) => ({ ...body, institutionId: inst._id }));
exports.updateStudent = crudUpdate(InstitutionStudent, (inst) => ({ institutionId: inst._id }));
exports.deleteStudent = crudDelete(InstitutionStudent, (inst) => ({ institutionId: inst._id }));

exports.listPlacements = crudList(Placement, (inst) => ({ institutionId: inst._id }));
exports.createPlacement = crudCreate(Placement, (inst, body) => ({ ...body, institutionId: inst._id }));
exports.updatePlacement = crudUpdate(Placement, (inst) => ({ institutionId: inst._id }));
exports.deletePlacement = crudDelete(Placement, (inst) => ({ institutionId: inst._id }));

exports.listEvents = crudList(PortalEvent, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));
exports.createEvent = crudCreate(PortalEvent, (inst, body) => ({ ...body, ownerType: 'institution', ownerId: inst._id }));
exports.updateEvent = crudUpdate(PortalEvent, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));
exports.deleteEvent = crudDelete(PortalEvent, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));

exports.listPromotions = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const filter = { ownerType: 'institution', ownerId: inst._id };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) filter.$text = { $search: String(req.query.q) };
    const { page, limit } = req.query;
    const { query, page: p, limit: l } = paginate(Promotion.find(filter).sort('-createdAt'), { page, limit });
    const [items, total] = await Promise.all([query, Promotion.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.createPromotion = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const payload = cleanPromotionInput(req.body);
    if (!payload.title) return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Promotion title is required.' });
    const item = await Promotion.create({
      ...payload,
      ownerType: 'institution',
      ownerId: inst._id,
      ownerName: inst.name,
      status: 'pending',
      publishedAt: null,
    });
    res.status(201).json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.updatePromotion = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const payload = cleanPromotionInput(req.body);
    if (!payload.title) return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Promotion title is required.' });
    const item = await Promotion.findOneAndUpdate(
      { _id: req.params.id, ownerType: 'institution', ownerId: inst._id },
      { $set: { ...payload, status: 'pending', publishedAt: null } },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Promotion not found.' });
    return res.json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.deletePromotion = crudDelete(Promotion, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));

exports.listGallery = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const filter = { ownerType: 'institution', ownerId: inst._id };
    if (req.query.type) filter.type = req.query.type;
    const { page, limit } = req.query;
    const { query, page: p, limit: l } = paginate(Gallery.find(filter).sort('order'), { page, limit });
    const [items, total] = await Promise.all([query, Gallery.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.createGallery = crudCreate(Gallery, (inst, body) => ({ ...body, ownerType: 'institution', ownerId: inst._id }));
exports.deleteGallery = crudDelete(Gallery, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));

exports.listAdmissions = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const filter = { institutionId: inst._id };
    if (req.query.status) filter.status = req.query.status;
    const { page, limit } = req.query;
    const { query, page: p, limit: l } = paginate(Admission.find(filter).sort('-createdAt'), { page, limit });
    const [items, total] = await Promise.all([query, Admission.countDocuments(filter)]);

    // Inbound student portal applications (Application model)
    const apps = await Application.find({ institutionId: inst._id, targetType: 'admission' })
      .populate('studentId', 'name email')
      .sort('-createdAt')
      .limit(100);
    const inbound = apps.map((a) => ({
      _id: a._id,
      source: 'student_portal',
      applicantName: a.studentId?.name || 'Student',
      applicantEmail: a.studentId?.email || '',
      applicantPhone: '',
      status: a.status === 'accepted' ? 'accepted' : a.status === 'rejected' ? 'rejected' : a.status === 'reviewing' || a.status === 'shortlisted' ? 'reviewing' : 'pending',
      notes: a.coverLetter || a.notes || '',
      createdAt: a.createdAt,
      applicationId: a._id,
    }));

    res.json({ success: true, items, inbound, total, page: p, limit: l });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.createAdmission = crudCreate(Admission, (inst, body) => ({ ...body, institutionId: inst._id }));
exports.updateAdmission = crudUpdate(Admission, (inst) => ({ institutionId: inst._id }));
exports.deleteAdmission = crudDelete(Admission, (inst) => ({ institutionId: inst._id }));

exports.updateInboundApplication = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const item = await Application.findOneAndUpdate(
      { _id: req.params.id, institutionId: inst._id, targetType: 'admission' },
      { status: req.body.status, notes: req.body.notes },
      { new: true },
    );
    if (!item) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.listCertificates = crudList(PortalCertificate, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));
exports.createCertificate = crudCreate(PortalCertificate, (inst, body) => ({ ...body, ownerType: 'institution', ownerId: inst._id }));
exports.deleteCertificate = crudDelete(PortalCertificate, (inst) => ({ ownerType: 'institution', ownerId: inst._id }));

exports.listScholarships = crudList(Scholarship, (inst) => ({ institutionId: inst._id }));
exports.createScholarship = crudCreate(Scholarship, (inst, body) => ({ ...body, institutionId: inst._id }));
exports.updateScholarship = crudUpdate(Scholarship, (inst) => ({ institutionId: inst._id }));
exports.deleteScholarship = crudDelete(Scholarship, (inst) => ({ institutionId: inst._id }));

exports.listResearch = crudList(Research, (inst) => ({ institutionId: inst._id }));
exports.createResearch = crudCreate(Research, (inst, body) => ({ ...body, institutionId: inst._id }));
exports.updateResearch = crudUpdate(Research, (inst) => ({ institutionId: inst._id }));
exports.deleteResearch = crudDelete(Research, (inst) => ({ institutionId: inst._id }));

exports.getCourseInsights = async (req, res) => {
  try {
    const inst = await requireInstitution(req);
    const course = await Course.findOne({ _id: req.params.id, institutionId: inst._id });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.aiInsights?.summary) {
      return res.json({ success: true, insights: course.aiInsights, course });
    }
    const prompt = `Analyze this academic course for career insights. Course: ${course.title}. Description: ${course.description}. Skills: ${(course.skills || []).join(', ')}. Return JSON with: popularity (0-100), salaryRank (0-100), demandScore (0-100), summary (2 sentences), industryDemand, futureScope, competitionLevel, careerPaths (array), requiredSkills (array).`;
    let insights = { popularity: 50, salaryRank: 50, demandScore: 50, summary: 'AI insights pending configuration.' };
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
      });
      const raw = completion.choices[0]?.message?.content || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) insights = { ...insights, ...JSON.parse(jsonMatch[0]) };
      else insights.summary = raw.slice(0, 300);
    } catch { /* fallback */ }
    course.aiInsights = insights;
    course.industryDemand = insights.industryDemand || course.industryDemand;
    course.futureScope = insights.futureScope || course.futureScope;
    course.competitionLevel = insights.competitionLevel || course.competitionLevel;
    if (insights.careerPaths) course.careerPaths = insights.careerPaths;
    if (insights.requiredSkills) course.skills = insights.requiredSkills;
    await course.save();
    res.json({ success: true, insights: course.aiInsights, course });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

// Public profile
exports.getPublicProfile = async (req, res) => {
  try {
    const q = req.params.slug
      ? { slug: req.params.slug, status: 'approved', isPublic: true }
      : { _id: req.params.id, status: 'approved', isPublic: true };
    const inst = await Institution.findOne(q);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found' });
    inst.stats.visitors = (inst.stats.visitors || 0) + 1;
    await inst.save();
    const [courses, departments, placements, gallery, events, promotions, scholarships, research, faculty] = await Promise.all([
      Course.find({ institutionId: inst._id, status: 'active' }).limit(40),
      Department.find({ ownerType: 'institution', ownerId: inst._id }),
      Placement.find({ institutionId: inst._id }).sort('-package').limit(20),
      Gallery.find({ ownerType: 'institution', ownerId: inst._id }).sort('order'),
      PortalEvent.find({ ownerType: 'institution', ownerId: inst._id, status: 'published' }).sort('startDate').limit(20),
      Promotion.find({ ownerType: 'institution', ownerId: inst._id, status: 'published' }).sort('-publishedAt').limit(20),
      Scholarship.find({ institutionId: inst._id }).limit(30),
      Research.find({ institutionId: inst._id, status: { $ne: 'draft' } }).limit(20),
      Faculty.find({ institutionId: inst._id, status: 'active' }).limit(40),
    ]);
    const reviews = await Review.find({ targetType: 'institution', targetId: inst._id, status: 'approved' })
      .populate('studentId', 'name')
      .sort('-createdAt')
      .limit(30);

    const avgFee = courses.length
      ? Math.round(courses.reduce((s, c) => s + (c.fees || 0), 0) / courses.length)
      : 0;

    const seo = {
      title: `${inst.name} | Dream Wave Institutions`,
      description: (inst.about || `${inst.name} — ${inst.institutionType || 'institution'} on Dream Wave`).slice(0, 160),
      canonical: `/institutions/${inst.slug}`,
      ogImage: inst.banner || inst.logo || '',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: inst.name,
        url: inst.contact?.website || undefined,
        logo: inst.logo || undefined,
        address: {
          '@type': 'PostalAddress',
          addressLocality: inst.contact?.city,
          addressRegion: inst.contact?.state,
          addressCountry: inst.contact?.country,
          streetAddress: inst.contact?.address,
        },
        foundingDate: inst.establishedYear ? String(inst.establishedYear) : undefined,
        aggregateRating: reviews.length ? {
          '@type': 'AggregateRating',
          ratingValue: (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1),
          reviewCount: reviews.length,
        } : undefined,
      },
    };

    res.json({
      success: true,
      institution: inst,
      courses,
      departments,
      placements,
      gallery,
      events,
      promotions,
      scholarships,
      research,
      faculty,
      reviews,
      derived: { avgFee },
      seo,
    });
  } catch (err) { return fail(res, err); }
};

exports.listPublic = async (req, res) => {
  try {
    const {
      q, page, limit, state, city, type, institutionType,
      minFees, maxFees, minPlacement, maxPlacement, minRating, maxRating,
      rankingMax, course, hostel, sort,
    } = req.query;

    const filter = { status: 'approved', isPublic: true };
    if (q) filter.$text = { $search: String(q) };
    if (state) filter['contact.state'] = new RegExp(`^${String(state).trim()}$`, 'i');
    if (city) filter['contact.city'] = new RegExp(`^${String(city).trim()}$`, 'i');
    const typeVal = institutionType || type;
    if (typeVal) filter.institutionType = typeVal;
    if (minPlacement || maxPlacement) {
      filter['stats.placementRate'] = {};
      if (minPlacement) filter['stats.placementRate'].$gte = Number(minPlacement);
      if (maxPlacement) filter['stats.placementRate'].$lte = Number(maxPlacement);
    }
    if (minRating || maxRating) {
      filter['stats.aiRating'] = {};
      if (minRating) filter['stats.aiRating'].$gte = Number(minRating);
      if (maxRating) filter['stats.aiRating'].$lte = Number(maxRating);
    }
    if (rankingMax) filter.ranking = { $lte: Number(rankingMax), $ne: null };
    if (hostel === 'true' || hostel === '1') filter['campus.hostelAvailable'] = true;

    let institutionIds = null;
    if (course || minFees || maxFees) {
      const courseFilter = { status: 'active' };
      if (course) courseFilter.$text = { $search: String(course) };
      if (minFees || maxFees) {
        courseFilter.fees = {};
        if (minFees) courseFilter.fees.$gte = Number(minFees);
        if (maxFees) courseFilter.fees.$lte = Number(maxFees);
      }
      const matchingCourses = await Course.find(courseFilter).select('institutionId').limit(500);
      institutionIds = [...new Set(matchingCourses.map((c) => String(c.institutionId)))];
      filter._id = { $in: institutionIds };
    }

    let sortSpec = { 'stats.followers': -1, 'stats.visitors': -1 };
    if (sort === 'rating') sortSpec = { 'stats.aiRating': -1 };
    else if (sort === 'placement') sortSpec = { 'stats.placementRate': -1 };
    else if (sort === 'ranking') sortSpec = { ranking: 1 };
    else if (sort === 'name') sortSpec = { name: 1 };
    else if (sort === 'newest') sortSpec = { createdAt: -1 };

    const { query, page: p, limit: l } = paginate(Institution.find(filter).sort(sortSpec), { page, limit });
    const [items, total] = await Promise.all([query, Institution.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) { return fail(res, err); }
};

exports.compareInstitutions = async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (ids.length < 2) {
      return res.status(400).json({ success: false, message: 'Provide at least two institution ids' });
    }
    const institutions = await Institution.find({
      _id: { $in: ids },
      status: 'approved',
      isPublic: true,
    });
    const enriched = await Promise.all(institutions.map(async (inst) => {
      const [courses, faculty, placements] = await Promise.all([
        Course.find({ institutionId: inst._id, status: 'active' }).limit(20),
        Faculty.countDocuments({ institutionId: inst._id, status: 'active' }),
        Placement.find({ institutionId: inst._id }).sort('-package').limit(5),
      ]);
      const avgFee = courses.length
        ? Math.round(courses.reduce((s, c) => s + (c.fees || 0), 0) / courses.length)
        : 0;
      return {
        institution: inst,
        courses: courses.map((c) => ({ title: c.title, fees: c.fees, duration: c.duration, level: c.level })),
        facultyCount: faculty,
        placements,
        avgFee,
        hostel: Boolean(inst.campus?.hostelAvailable || (inst.campus?.hostels || '').trim()),
        campusSummary: inst.campus || {},
        aiScore: inst.stats?.aiRating || 0,
      };
    }));
    res.json({ success: true, items: enriched });
  } catch (err) { return fail(res, err); }
};

exports.getPublicInsights = async (req, res) => {
  try {
    const inst = await Institution.findOne({ slug: req.params.slug, status: 'approved', isPublic: true });
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found' });

    const courses = await Course.find({ institutionId: inst._id, status: 'active' }).limit(20);
    const placements = await Placement.find({ institutionId: inst._id }).sort('-package').limit(10);

    // Reuse cached insights if fresh (< 7 days)
    const fresh = inst.aiInsights?.generatedAt
      && (Date.now() - new Date(inst.aiInsights.generatedAt).getTime() < 7 * 24 * 3600 * 1000)
      && inst.aiInsights?.summary;
    if (fresh) {
      return res.json({ success: true, insights: inst.aiInsights, cached: true });
    }

    const courseTitles = courses.map((c) => c.title).slice(0, 8);
    const topPackages = placements.map((p) => `${p.company}: ₹${p.package}`).slice(0, 5);
    let insights = {
      bestCourses: courseTitles.slice(0, 5),
      trendingPrograms: courseTitles.slice(0, 3),
      industryDemand: courses[0]?.industryDemand || 'Based on enrolled programs and placement partners.',
      placementForecast: inst.stats.placementRate
        ? `Current recorded placement rate is ${inst.stats.placementRate}%. Highest package ₹${inst.stats.highestPackage || 0}.`
        : 'Placement forecast will improve as placement records are added.',
      salaryOutlook: inst.stats.averagePackage
        ? `Average package on record: ₹${inst.stats.averagePackage}. Top: ${topPackages.join('; ') || 'n/a'}.`
        : 'Salary outlook unavailable until placement packages are recorded.',
      futureSkills: [...new Set(courses.flatMap((c) => c.skills || []))].slice(0, 8),
      admissionCompetition: courses.some((c) => c.competitionLevel)
        ? courses.map((c) => `${c.title}: ${c.competitionLevel}`).slice(0, 5).join('; ')
        : 'Competition levels appear as courses add eligibility and seat data.',
      careerOpportunities: [...new Set(courses.flatMap((c) => c.careerPaths || []))].slice(0, 8),
      summary: `${inst.name} offers ${courses.length} active programs with ${placements.length} placement records on Dream Wave.`,
      generatedAt: new Date(),
    };

    try {
      const prompt = `Institution: ${inst.name}. Type: ${inst.institutionType}. Courses: ${courseTitles.join(', ')}. Placements: ${topPackages.join(', ')}. Placement rate: ${inst.stats.placementRate}%. Return JSON with keys: bestCourses (array), trendingPrograms (array), industryDemand, placementForecast, salaryOutlook, futureSkills (array), admissionCompetition, careerOpportunities (array), summary (2 sentences).`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 700,
      });
      const raw = completion.choices[0]?.message?.content || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) insights = { ...insights, ...JSON.parse(jsonMatch[0]), generatedAt: new Date() };
    } catch { /* keep heuristic insights — no fake numbers */ }

    inst.aiInsights = insights;
    // AI rating from real metrics
    const score = Math.min(100, Math.round(
      (Math.min(courses.length, 10) * 4)
      + (Math.min(inst.stats.placementRate || 0, 100) * 0.3)
      + (Math.min(inst.stats.followers || 0, 50) * 0.4)
      + (placements.length ? 15 : 0),
    ));
    inst.stats.aiRating = Math.round((score / 20) * 10) / 10; // 0–5 scale-ish
    await inst.save();
    res.json({ success: true, insights, cached: false });
  } catch (err) { return fail(res, err); }
};

exports.trackPublicView = async (req, res) => {
  try {
    const inst = await Institution.findOne({ slug: req.params.slug, status: 'approved', isPublic: true });
    if (!inst) return res.status(404).json({ success: false, message: 'Not found' });
    const type = req.body.type || 'interest';
    const map = {
      gallery: 'stats.galleryViews',
      course: 'stats.courseViews',
      placement: 'stats.placementViews',
      interest: 'stats.studentInterest',
    };
    const field = map[type] || map.interest;
    await Institution.findByIdAndUpdate(inst._id, { $inc: { [field]: 1 } });
    res.json({ success: true });
  } catch (err) { return fail(res, err); }
};

exports.publicContact = async (req, res) => {
  try {
    const ContactInquiry = require('../models/ContactInquiry');
    const inst = await Institution.findOne({ slug: req.params.slug, status: 'approved', isPublic: true });
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found' });
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'name, email, and message are required' });
    }
    const item = await ContactInquiry.create({
      institutionId: inst._id,
      name,
      email,
      phone: phone || '',
      subject: subject || 'General inquiry',
      message,
    });
    await Institution.findByIdAndUpdate(inst._id, { $inc: { 'stats.studentInterest': 1 } });
    res.status(201).json({ success: true, item: { _id: item._id } });
  } catch (err) { return fail(res, err); }
};

exports.listContactInquiries = async (req, res) => {
  try {
    const ContactInquiry = require('../models/ContactInquiry');
    const inst = await requireInstitution(req);
    const items = await ContactInquiry.find({ institutionId: inst._id }).sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.sitemap = async (req, res) => {
  try {
    const base = process.env.PUBLIC_APP_URL || 'https://dreamwave.ai';
    const items = await Institution.find({ status: 'approved', isPublic: true, slug: { $ne: null } })
      .select('slug updatedAt')
      .limit(5000);
    const urls = [
      `${base}/institutions`,
      `${base}/discover`,
      `${base}/search`,
      ...items.map((i) => `${base}/institutions/${i.slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u, idx) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>${idx < 3 ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) { return fail(res, err); }
};

exports.filterOptions = async (req, res) => {
  try {
    const [states, cities, types] = await Promise.all([
      Institution.distinct('contact.state', { status: 'approved', isPublic: true, 'contact.state': { $nin: [null, ''] } }),
      Institution.distinct('contact.city', { status: 'approved', isPublic: true, 'contact.city': { $nin: [null, ''] } }),
      Institution.distinct('institutionType', { status: 'approved', isPublic: true }),
    ]);
    res.json({
      success: true,
      options: {
        states: states.filter(Boolean).sort(),
        cities: cities.filter(Boolean).sort(),
        types: types.filter(Boolean).sort(),
      },
    });
  } catch (err) { return fail(res, err); }
};
