const CompanyProfile = require('../models/CompanyProfile');
const Department = require('../models/Department');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const Employee = require('../models/Employee');
const PortalEvent = require('../models/PortalEvent');
const Promotion = require('../models/Promotion');
const Gallery = require('../models/Gallery');
const PortalCertificate = require('../models/PortalCertificate');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const CompanyProject = require('../models/CompanyProject');
const CompanyTraining = require('../models/CompanyTraining');
const Review = require('../models/Review');
const Follow = require('../models/Follow');
const HiringAnalytics = require('../models/HiringAnalytics');
const JobCategory = require('../models/JobCategory');
const InternshipCategory = require('../models/InternshipCategory');
const { getCompanyForUser, ensureUniqueSlug, paginate, cleanPromotionInput } = require('../utils/portalHelpers');
const { openai } = require('../utils/openaiClient');

const fail = (res, err, status = 500) => {
  const statusCode = err.statusCode || status;
  if (statusCode >= 500) console.error('[company-portal]', err.message);
  return res.status(statusCode).json({
    success: false,
    code: err.code || (statusCode >= 500 ? 'COMPANY_PORTAL_ERROR' : 'REQUEST_FAILED'),
    message: statusCode >= 500 ? 'Company portal request failed.' : err.message || 'Request failed.',
  });
};

async function requireCompany(req) {
  let company = await getCompanyForUser(req.user._id);
  if (!company && req.user.role === 'admin' && req.body?.companyId) {
    company = await CompanyProfile.findById(req.body.companyId);
  }
  if (!company) {
    const err = new Error('Company profile not found. Complete registration first.');
    err.statusCode = 404;
    throw err;
  }
  if (company.status === 'suspended' && req.user.role !== 'admin') {
    const err = new Error('Company account is suspended.');
    err.statusCode = 403;
    throw err;
  }
  return company;
}

function profileCompletion(company) {
  const checks = [
    company.name, company.logo, company.banner, company.about, company.mission, company.vision,
    company.industry, company.businessType, company.foundedYear, company.companySize,
    company.contact?.email, company.contact?.phone, company.contact?.website,
    company.contact?.city, (company.social?.linkedin || company.contact?.linkedin),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

exports.bootstrap = async (req, res) => {
  try {
    let company = await getCompanyForUser(req.user._id);
    if (company) return res.json({ success: true, company });
    const name = req.body.name || req.user.organizationName || `${req.user.name}'s Company`;
    company = await CompanyProfile.create({
      ownerId: req.user._id,
      name,
      slug: await ensureUniqueSlug(CompanyProfile, name),
      contact: { email: req.user.email },
      status: 'pending',
      isPublic: false,
    });
    res.status(201).json({ success: true, company });
  } catch (err) { return fail(res, err); }
};

exports.getMine = async (req, res) => {
  try {
    const company = await requireCompany(req);
    res.json({ success: true, company, profileCompletion: profileCompletion(company) });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.updateMine = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const allowed = [
      'name', 'logo', 'banner', 'about', 'mission', 'vision', 'history', 'founderMessage', 'ceoMessage',
      'culture', 'businessType', 'industry', 'companySize', 'foundedYear', 'products', 'services',
      'projectsShowcase', 'caseStudies', 'techStack', 'offices', 'branches', 'officeTour',
      'awards', 'certifications', 'achievements', 'careers', 'contact', 'social', 'isPublic', 'verified',
    ];
    allowed.forEach((k) => { if (req.body[k] !== undefined) company[k] = req.body[k]; });
    if (req.body.name && req.body.name !== company.name) {
      company.slug = await ensureUniqueSlug(CompanyProfile, req.body.name, company._id);
    }
    await company.save();
    res.json({ success: true, company, profileCompletion: profileCompletion(company) });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.getDashboard = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const [
      employees, jobs, internships, departments, applications,
      interviews, offers, recentApps, recentInterviews,
    ] = await Promise.all([
      Employee.countDocuments({ companyId: company._id, status: 'active' }),
      Job.countDocuments({ companyId: company._id, status: 'open' }),
      Internship.countDocuments({ companyId: company._id, status: 'open' }),
      Department.countDocuments({ ownerType: 'company', ownerId: company._id }),
      Application.countDocuments({ companyId: company._id }),
      Interview.countDocuments({ companyId: company._id, status: 'scheduled' }),
      Application.countDocuments({ companyId: company._id, status: 'accepted' }),
      Application.find({ companyId: company._id }).sort('-createdAt').limit(8).populate('studentId', 'name email'),
      Interview.find({ companyId: company._id }).sort('scheduledAt').limit(8),
    ]);

    const hired = offers;
    const hiringRate = applications > 0 ? Math.round((hired / applications) * 100) : 0;
    const reviews = await Review.find({ targetType: 'company', targetId: company._id, status: 'approved' });
    const rating = reviews.length
      ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    company.stats.employeeCount = employees;
    company.stats.jobOpenings = jobs;
    company.stats.internshipCount = internships;
    company.stats.applications = applications;
    company.stats.hiringRate = hiringRate;
    company.stats.interviewsScheduled = interviews;
    company.stats.offersReleased = offers;
    company.stats.aiScore = Math.min(100, Math.round(
      profileCompletion(company) * 0.35
      + Math.min(jobs + internships, 20) * 2
      + Math.min(applications, 40)
      + rating * 5,
    ));
    await company.save();

    const notifications = [
      ...recentApps.slice(0, 4).map((a) => ({
        type: 'application',
        text: `New ${a.targetType} application from ${a.studentId?.name || 'candidate'}`,
        at: a.createdAt,
      })),
      ...recentInterviews.filter((i) => i.status === 'scheduled').slice(0, 3).map((i) => ({
        type: 'interview',
        text: `Interview with ${i.candidateName || 'candidate'} on ${new Date(i.scheduledAt).toLocaleString()}`,
        at: i.scheduledAt,
      })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

    res.json({
      success: true,
      stats: {
        employees,
        jobs,
        internships,
        departments,
        applications,
        interviews,
        offers,
        followers: company.stats.followers || 0,
        rating,
        profileCompletion: profileCompletion(company),
        aiScore: company.stats.aiScore,
        ...((company.stats && company.stats.toObject) ? company.stats.toObject() : company.stats),
      },
      notifications,
      quickActions: [
        { label: 'Post Job', to: 'jobs' },
        { label: 'Post Internship', to: 'internships' },
        { label: 'Review Applications', to: 'applications' },
        { label: 'Schedule Interview', to: 'interviews' },
        { label: 'Edit Profile', to: 'profile' },
      ],
      company,
    });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.getAnalytics = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const appsByStatus = await Application.aggregate([
      { $match: { companyId: company._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const topJobs = await Job.find({ companyId: company._id }).sort('-applicationsCount').limit(10);
    const internships = await Internship.find({ companyId: company._id }).sort('-applicationsCount').limit(10);
    const reviews = await Review.find({ targetType: 'company', targetId: company._id, status: 'approved' });
    const avgRating = reviews.length
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : 0;
    const totalApps = await Application.countDocuments({ companyId: company._id });
    const hired = await Application.countDocuments({ companyId: company._id, status: 'accepted' });
    const hiringRate = totalApps > 0 ? Math.round((hired / totalApps) * 100) : 0;
    const jobViews = (await Job.aggregate([
      { $match: { companyId: company._id } },
      { $group: { _id: null, views: { $sum: '$views' } } },
    ]))[0]?.views || company.stats.jobViews || 0;

    const aiCompanyScore = Math.min(100, Math.round(
      profileCompletion(company) * 0.3
      + Math.min(hiringRate, 100) * 0.25
      + Math.min(company.stats.followers || 0, 100) * 0.2
      + Math.min(avgRating * 10, 25)
      + Math.min(jobViews / 10, 20),
    ));

    res.json({
      success: true,
      analytics: {
        applications: appsByStatus,
        topJobs,
        internships,
        visitors: company.stats.visitors || 0,
        followers: company.stats.followers || 0,
        hiringRate,
        jobViews,
        websiteClicks: company.stats.websiteClicks || 0,
        studentEngagement: company.stats.studentEngagement || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        aiCompanyScore,
        growth: {
          employees: company.stats.employeeCount,
          jobs: company.stats.jobOpenings,
          followers: company.stats.followers,
        },
      },
    });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.getReports = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const [jobs, internships, applications, interviews, employees] = await Promise.all([
      Job.find({ companyId: company._id }).sort('-createdAt').limit(50),
      Internship.find({ companyId: company._id }).sort('-createdAt').limit(50),
      Application.find({ companyId: company._id }).sort('-createdAt').limit(100).populate('studentId', 'name email'),
      Interview.find({ companyId: company._id }).sort('-scheduledAt').limit(50),
      Employee.find({ companyId: company._id }).sort('-updatedAt').limit(50),
    ]);
    res.json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        company: { name: company.name, slug: company.slug },
        summaries: {
          jobs: jobs.length,
          internships: internships.length,
          applications: applications.length,
          interviews: interviews.length,
          employees: employees.length,
          hired: applications.filter((a) => a.status === 'accepted').length,
          rejected: applications.filter((a) => a.status === 'rejected').length,
        },
        jobs,
        internships,
        applications,
        interviews,
        employees,
      },
    });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

function crudList(Model, filterFn) {
  return async (req, res) => {
    try {
      const company = await requireCompany(req);
      const filter = filterFn(company, req);
      if (req.query.status) filter.status = req.query.status;
      if (req.query.q && Model.schema.paths.title) filter.$text = { $search: String(req.query.q) };
      const { page, limit } = req.query;
      const { query, page: p, limit: l } = paginate(Model.find(filter).sort('-createdAt'), { page, limit });
      const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
      res.json({ success: true, items, total, page: p, limit: l });
    } catch (err) { return fail(res, err, err.statusCode || 500); }
  };
}

function crudCreate(Model, mapFn) {
  return async (req, res) => {
    try {
      const company = await requireCompany(req);
      const item = await Model.create(mapFn(company, req.body));
      res.status(201).json({ success: true, item });
    } catch (err) { return fail(res, err, err.statusCode || 500); }
  };
}

function crudUpdate(Model, filterFn) {
  return async (req, res) => {
    try {
      const company = await requireCompany(req);
      const item = await Model.findOneAndUpdate(
        { _id: req.params.id, ...filterFn(company) },
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
      const company = await requireCompany(req);
      const item = await Model.findOneAndDelete({ _id: req.params.id, ...filterFn(company) });
      if (!item) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, message: 'Deleted' });
    } catch (err) { return fail(res, err, err.statusCode || 500); }
  };
}

exports.listDepartments = crudList(Department, (c) => ({ ownerType: 'company', ownerId: c._id }));
exports.createDepartment = crudCreate(Department, (c, body) => ({ ...body, ownerType: 'company', ownerId: c._id }));
exports.updateDepartment = crudUpdate(Department, (c) => ({ ownerType: 'company', ownerId: c._id }));
exports.deleteDepartment = crudDelete(Department, (c) => ({ ownerType: 'company', ownerId: c._id }));

exports.listJobs = crudList(Job, (c) => ({ companyId: c._id }));
exports.createJob = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const body = { ...req.body };
    if (typeof body.skills === 'string') {
      body.skills = body.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const item = await Job.create({ ...body, companyId: company._id });
    res.status(201).json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.updateJob = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const body = { ...req.body };
    if (typeof body.skills === 'string') {
      body.skills = body.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const item = await Job.findOneAndUpdate({ _id: req.params.id, companyId: company._id }, body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.deleteJob = crudDelete(Job, (c) => ({ companyId: c._id }));

exports.listInternships = crudList(Internship, (c) => ({ companyId: c._id }));
exports.createInternship = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const body = { ...req.body };
    if (typeof body.skills === 'string') {
      body.skills = body.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const item = await Internship.create({ ...body, companyId: company._id });
    res.status(201).json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.updateInternship = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const body = { ...req.body };
    if (typeof body.skills === 'string') {
      body.skills = body.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const item = await Internship.findOneAndUpdate({ _id: req.params.id, companyId: company._id }, body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.deleteInternship = crudDelete(Internship, (c) => ({ companyId: c._id }));

exports.listEmployees = crudList(Employee, (c) => ({ companyId: c._id }));
exports.createEmployee = crudCreate(Employee, (c, body) => ({ ...body, companyId: c._id }));
exports.updateEmployee = crudUpdate(Employee, (c) => ({ companyId: c._id }));
exports.deleteEmployee = crudDelete(Employee, (c) => ({ companyId: c._id }));

exports.listProjects = crudList(CompanyProject, (c) => ({ companyId: c._id }));
exports.createProject = crudCreate(CompanyProject, (c, body) => ({ ...body, companyId: c._id }));
exports.updateProject = crudUpdate(CompanyProject, (c) => ({ companyId: c._id }));
exports.deleteProject = crudDelete(CompanyProject, (c) => ({ companyId: c._id }));

exports.listTraining = crudList(CompanyTraining, (c) => ({ companyId: c._id }));
exports.createTraining = crudCreate(CompanyTraining, (c, body) => ({ ...body, companyId: c._id }));
exports.updateTraining = crudUpdate(CompanyTraining, (c) => ({ companyId: c._id }));
exports.deleteTraining = crudDelete(CompanyTraining, (c) => ({ companyId: c._id }));

exports.listEvents = crudList(PortalEvent, (c) => ({ ownerType: 'company', ownerId: c._id }));
exports.createEvent = crudCreate(PortalEvent, (c, body) => ({ ...body, ownerType: 'company', ownerId: c._id }));
exports.updateEvent = crudUpdate(PortalEvent, (c) => ({ ownerType: 'company', ownerId: c._id }));
exports.deleteEvent = crudDelete(PortalEvent, (c) => ({ ownerType: 'company', ownerId: c._id }));

exports.listPromotions = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const filter = { ownerType: 'company', ownerId: company._id };
    if (req.query.category) filter.category = req.query.category;
    const { page, limit } = req.query;
    const { query, page: p, limit: l } = paginate(Promotion.find(filter).sort('-createdAt'), { page, limit });
    const [items, total] = await Promise.all([query, Promotion.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.createPromotion = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const payload = cleanPromotionInput(req.body);
    if (!payload.title) return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Promotion title is required.' });
    const item = await Promotion.create({
      ...payload,
      ownerType: 'company',
      ownerId: company._id,
      ownerName: company.name,
      status: 'pending',
      publishedAt: null,
    });
    res.status(201).json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.updatePromotion = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const payload = cleanPromotionInput(req.body);
    if (!payload.title) return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Promotion title is required.' });
    const item = await Promotion.findOneAndUpdate(
      { _id: req.params.id, ownerType: 'company', ownerId: company._id },
      { $set: { ...payload, status: 'pending', publishedAt: null } },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Promotion not found.' });
    return res.json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.deletePromotion = crudDelete(Promotion, (c) => ({ ownerType: 'company', ownerId: c._id }));

exports.listGallery = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const filter = { ownerType: 'company', ownerId: company._id };
    if (req.query.type) filter.type = req.query.type;
    const { page, limit } = req.query;
    const { query, page: p, limit: l } = paginate(Gallery.find(filter).sort('order'), { page, limit });
    const [items, total] = await Promise.all([query, Gallery.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.createGallery = crudCreate(Gallery, (c, body) => ({ ...body, ownerType: 'company', ownerId: c._id }));
exports.deleteGallery = crudDelete(Gallery, (c) => ({ ownerType: 'company', ownerId: c._id }));

exports.listCertificates = crudList(PortalCertificate, (c) => ({ ownerType: 'company', ownerId: c._id }));
exports.createCertificate = crudCreate(PortalCertificate, (c, body) => ({ ...body, ownerType: 'company', ownerId: c._id }));

exports.listApplications = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const filter = { companyId: company._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.targetType) filter.targetType = req.query.targetType;
    const { page, limit } = req.query;
    const { query, page: p, limit: l } = paginate(
      Application.find(filter).populate('studentId', 'name email phone aaid').sort('-createdAt'),
      { page, limit },
    );
    const [items, total] = await Promise.all([query, Application.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.updateApplication = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const item = await Application.findOneAndUpdate(
      { _id: req.params.id, companyId: company._id },
      { status: req.body.status, notes: req.body.notes },
      { new: true },
    ).populate('studentId', 'name email');
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.body.status === 'accepted') {
      await CompanyProfile.findByIdAndUpdate(company._id, { $inc: { 'stats.offersReleased': 1 } });
    }
    if (req.body.status === 'interview') {
      await CompanyProfile.findByIdAndUpdate(company._id, { $inc: { 'stats.interviewsScheduled': 1 } });
    }
    res.json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.listInterviews = crudList(Interview, (c) => ({ companyId: c._id }));
exports.createInterview = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const item = await Interview.create({ ...req.body, companyId: company._id });
    if (req.body.applicationId) {
      await Application.findOneAndUpdate(
        { _id: req.body.applicationId, companyId: company._id },
        { status: 'interview' },
      );
    }
    await CompanyProfile.findByIdAndUpdate(company._id, { $inc: { 'stats.interviewsScheduled': 1 } });
    res.status(201).json({ success: true, item });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};
exports.updateInterview = crudUpdate(Interview, (c) => ({ companyId: c._id }));
exports.deleteInterview = crudDelete(Interview, (c) => ({ companyId: c._id }));

exports.listFollowers = async (req, res) => {
  try {
    const company = await requireCompany(req);
    const items = await Follow.find({ targetType: 'company', targetId: company._id })
      .populate('studentId', 'name email')
      .sort('-createdAt')
      .limit(200);
    res.json({ success: true, items, total: items.length });
  } catch (err) { return fail(res, err, err.statusCode || 500); }
};

exports.getPublicProfile = async (req, res) => {
  try {
    const q = req.params.slug
      ? { slug: req.params.slug, status: 'approved', isPublic: true }
      : { _id: req.params.id, status: 'approved', isPublic: true };
    const company = await CompanyProfile.findOne(q);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    company.stats.visitors = (company.stats.visitors || 0) + 1;
    await company.save();
    await HiringAnalytics.create({ companyId: company._id, eventType: 'profile_view' }).catch(() => {});

    const [jobs, internships, gallery, events, promotions, projects, training] = await Promise.all([
      Job.find({ companyId: company._id, status: 'open' }).sort('-createdAt').limit(40),
      Internship.find({ companyId: company._id, status: 'open' }).sort('-createdAt').limit(40),
      Gallery.find({ ownerType: 'company', ownerId: company._id }).sort('order'),
      PortalEvent.find({ ownerType: 'company', ownerId: company._id, status: 'published' }).sort('startDate').limit(30),
      Promotion.find({ ownerType: 'company', ownerId: company._id, status: 'published' }).sort('-publishedAt').limit(20),
      CompanyProject.find({ companyId: company._id }).limit(20),
      CompanyTraining.find({ companyId: company._id }).limit(20),
    ]);
    const reviews = await Review.find({ targetType: 'company', targetId: company._id, status: 'approved' })
      .populate('studentId', 'name')
      .sort('-createdAt')
      .limit(30);

    const avgRating = reviews.length
      ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    const seo = {
      title: `${company.name} Careers & Jobs | Dream Wave`,
      description: (company.about || `${company.name} — ${company.industry || 'company'} hiring on Dream Wave`).slice(0, 160),
      canonical: `/companies/${company.slug}`,
      ogImage: company.banner || company.logo || '',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: company.name,
        url: company.contact?.website || undefined,
        logo: company.logo || undefined,
        sameAs: Object.values(company.social || {}).filter(Boolean),
        address: {
          '@type': 'PostalAddress',
          addressLocality: company.contact?.city,
          addressRegion: company.contact?.state,
          addressCountry: company.contact?.country,
          streetAddress: company.contact?.address,
        },
        foundingDate: company.foundedYear ? String(company.foundedYear) : undefined,
        numberOfEmployees: company.companySize || undefined,
        aggregateRating: reviews.length ? {
          '@type': 'AggregateRating',
          ratingValue: avgRating,
          reviewCount: reviews.length,
        } : undefined,
      },
    };

    res.json({
      success: true,
      company,
      jobs,
      internships,
      gallery,
      events,
      promotions,
      projects,
      training,
      reviews,
      derived: { avgRating, openJobs: jobs.length, openInternships: internships.length },
      seo,
    });
  } catch (err) { return fail(res, err); }
};

exports.listPublic = async (req, res) => {
  try {
    const {
      q, page, limit, industry, city, state, size, companySize, technology, tech,
      hiring, internships, minSalary, maxSalary, minRating, workMode, sort,
    } = req.query;

    const filter = { status: 'approved', isPublic: true };
    if (q) filter.$text = { $search: String(q) };
    if (industry) filter.industry = new RegExp(String(industry).trim(), 'i');
    if (state) filter['contact.state'] = new RegExp(`^${String(state).trim()}$`, 'i');
    if (city) filter['contact.city'] = new RegExp(`^${String(city).trim()}$`, 'i');
    const sizeVal = companySize || size;
    if (sizeVal) filter.companySize = sizeVal;
    const techVal = technology || tech;
    if (techVal) filter.techStack = new RegExp(String(techVal).trim(), 'i');
    if (minRating) filter['stats.aiScore'] = { $gte: Number(minRating) };

    let companyIds = null;
    if (hiring === 'true' || hiring === '1' || internships === 'true' || internships === '1' || workMode || minSalary || maxSalary) {
      const ids = new Set();
      if (hiring === 'true' || hiring === '1' || workMode || minSalary || maxSalary) {
        const jobFilter = { status: 'open' };
        if (workMode) jobFilter.workMode = workMode;
        if (minSalary) jobFilter.salaryMax = { $gte: Number(minSalary) };
        if (maxSalary) jobFilter.salaryMin = { $lte: Number(maxSalary) };
        const jobs = await Job.find(jobFilter).select('companyId').limit(800);
        jobs.forEach((j) => ids.add(String(j.companyId)));
      }
      if (internships === 'true' || internships === '1') {
        const ints = await Internship.find({ status: 'open' }).select('companyId').limit(800);
        ints.forEach((i) => ids.add(String(i.companyId)));
      }
      companyIds = [...ids];
      filter._id = { $in: companyIds };
    }

    let sortSpec = { 'stats.followers': -1, 'stats.visitors': -1 };
    if (sort === 'rating' || sort === 'ai') sortSpec = { 'stats.aiScore': -1 };
    else if (sort === 'jobs') sortSpec = { 'stats.jobOpenings': -1 };
    else if (sort === 'name') sortSpec = { name: 1 };
    else if (sort === 'newest') sortSpec = { createdAt: -1 };
    else if (sort === 'salary') sortSpec = { 'stats.avgSalary': -1 };

    const { query, page: p, limit: l } = paginate(CompanyProfile.find(filter).sort(sortSpec), { page, limit });
    const [items, total] = await Promise.all([query, CompanyProfile.countDocuments(filter)]);
    res.json({ success: true, items, total, page: p, limit: l });
  } catch (err) { return fail(res, err); }
};

exports.compareCompanies = async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (ids.length < 2) {
      return res.status(400).json({ success: false, message: 'Provide at least two company ids' });
    }
    const companies = await CompanyProfile.find({
      _id: { $in: ids },
      status: 'approved',
      isPublic: true,
    });
    const enriched = await Promise.all(companies.map(async (company) => {
      const [jobs, internships, reviews] = await Promise.all([
        Job.find({ companyId: company._id, status: 'open' }).limit(15),
        Internship.find({ companyId: company._id, status: 'open' }).limit(15),
        Review.find({ targetType: 'company', targetId: company._id, status: 'approved' }).limit(50),
      ]);
      const salaries = jobs.filter((j) => j.salaryMax > 0).map((j) => j.salaryMax);
      const avgSalary = salaries.length
        ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length)
        : company.stats?.avgSalary || 0;
      const avgRating = reviews.length
        ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10
        : 0;
      return {
        company,
        jobs: jobs.map((j) => ({
          title: j.title, location: j.location, workMode: j.workMode, type: j.type,
          salaryMin: j.salaryMin, salaryMax: j.salaryMax,
        })),
        internships: internships.map((i) => ({
          title: i.title, stipend: i.stipend, duration: i.duration, location: i.location,
        })),
        openJobs: jobs.length,
        openInternships: internships.length,
        avgSalary,
        avgRating,
        benefits: company.careers?.benefits || '',
        culture: company.culture || '',
        growth: company.careers?.employeeGrowth || company.aiInsights?.careerGrowth || '',
        aiScore: company.stats?.aiScore || 0,
      };
    }));
    res.json({ success: true, items: enriched });
  } catch (err) { return fail(res, err); }
};

exports.getPublicInsights = async (req, res) => {
  try {
    const company = await CompanyProfile.findOne({ slug: req.params.slug, status: 'approved', isPublic: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const fresh = company.aiInsights?.generatedAt
      && (Date.now() - new Date(company.aiInsights.generatedAt).getTime() < 7 * 24 * 3600 * 1000)
      && company.aiInsights?.summary;
    if (fresh) {
      return res.json({ success: true, insights: company.aiInsights, cached: true });
    }

    const [jobs, internships, apps] = await Promise.all([
      Job.find({ companyId: company._id, status: 'open' }).limit(30),
      Internship.find({ companyId: company._id, status: 'open' }).limit(20),
      Application.countDocuments({ companyId: company._id }),
    ]);
    const skillFreq = {};
    jobs.forEach((j) => (j.skills || []).forEach((s) => { skillFreq[s] = (skillFreq[s] || 0) + 1; }));
    const popularSkills = Object.entries(skillFreq).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 10);
    const salaries = jobs.filter((j) => j.salaryMax > 0);
    const avgSal = salaries.length
      ? Math.round(salaries.reduce((a, j) => a + j.salaryMax, 0) / salaries.length)
      : 0;

    let insights = {
      companyGrowth: company.stats.followers || company.stats.visitors
        ? `${company.name} has ${company.stats.followers || 0} followers and ${company.stats.visitors || 0} profile visitors on Dream Wave.`
        : 'Growth signals will strengthen as followers and visitors increase.',
      hiringTrends: `${jobs.length} open roles and ${internships.length} open internships; ${apps} applications recorded.`,
      popularSkills,
      futureHiring: jobs.some((j) => ['graduate', 'campus', 'apprenticeship'].includes(j.type))
        ? 'Campus, graduate, or apprenticeship hiring is active.'
        : 'Future hiring will reflect new open roles posted by the company.',
      technologyTrends: (company.techStack || []).slice(0, 8).join(', ') || 'Technology stack not listed yet.',
      salaryTrends: avgSal
        ? `Average listed max salary across open roles: ₹${avgSal.toLocaleString()}.`
        : 'Salary trends appear once roles include salary ranges.',
      careerGrowth: company.careers?.employeeGrowth || company.careers?.learningPrograms
        || 'Career growth details appear when the company publishes careers content.',
      aiCompanyRating: company.stats.aiScore || 0,
      industryRanking: company.stats.industryRank
        ? `Industry rank signal: #${company.stats.industryRank}`
        : `${company.industry || 'Industry'} ranking will improve with hiring volume and engagement.`,
      summary: `${company.name} (${company.industry || 'company'}) — ${jobs.length} jobs, ${internships.length} internships on Dream Wave.`,
      generatedAt: new Date(),
    };

    try {
      const prompt = `Company: ${company.name}. Industry: ${company.industry}. Tech: ${(company.techStack || []).join(', ')}. Open jobs: ${jobs.map((j) => j.title).slice(0, 8).join(', ')}. Skills: ${popularSkills.join(', ')}. Return JSON keys: companyGrowth, hiringTrends, popularSkills (array), futureHiring, technologyTrends, salaryTrends, careerGrowth, industryRanking, summary (2 sentences). No invented statistics.`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 700,
      });
      const raw = completion.choices[0]?.message?.content || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) insights = { ...insights, ...JSON.parse(jsonMatch[0]), generatedAt: new Date() };
    } catch { /* keep heuristic insights */ }

    const score = Math.min(100, Math.round(
      (Math.min(jobs.length, 15) * 3)
      + (Math.min(internships.length, 10) * 2)
      + (Math.min(company.stats.followers || 0, 100) * 0.25)
      + (Math.min(company.stats.visitors || 0, 200) * 0.1)
      + (company.about ? 10 : 0)
      + (popularSkills.length ? 10 : 0),
    ));
    insights.aiCompanyRating = score;
    company.aiInsights = insights;
    company.stats.aiScore = score;
    company.stats.aiRating = Math.round((score / 20) * 10) / 10;
    if (avgSal) company.stats.avgSalary = avgSal;
    company.stats.jobOpenings = jobs.length;
    company.stats.internshipCount = internships.length;
    await company.save();
    res.json({ success: true, insights, cached: false });
  } catch (err) { return fail(res, err); }
};

exports.trackPublicView = async (req, res) => {
  try {
    const company = await CompanyProfile.findOne({ slug: req.params.slug, status: 'approved', isPublic: true });
    if (!company) return res.status(404).json({ success: false, message: 'Not found' });
    const type = req.body.type || 'interest';
    const map = {
      website: 'stats.websiteClicks',
      job: 'stats.jobViews',
      internship: 'stats.internshipViews',
      interest: 'stats.studentEngagement',
      gallery: 'stats.studentEngagement',
    };
    const field = map[type] || map.interest;
    await CompanyProfile.findByIdAndUpdate(company._id, { $inc: { [field]: 1 } });
    const eventMap = {
      website: 'website_click', job: 'job_view', internship: 'internship_view',
      gallery: 'gallery', interest: 'interest',
    };
    await HiringAnalytics.create({
      companyId: company._id,
      eventType: eventMap[type] || 'interest',
      targetId: req.body.targetId || undefined,
    }).catch(() => {});
    if (type === 'job' && req.body.targetId) {
      await Job.findByIdAndUpdate(req.body.targetId, { $inc: { views: 1 } }).catch(() => {});
    }
    if (type === 'internship' && req.body.targetId) {
      await Internship.findByIdAndUpdate(req.body.targetId, { $inc: { views: 1 } }).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) { return fail(res, err); }
};

exports.publicContact = async (req, res) => {
  try {
    const ContactInquiry = require('../models/ContactInquiry');
    const company = await CompanyProfile.findOne({ slug: req.params.slug, status: 'approved', isPublic: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'name, email, and message are required' });
    }
    const item = await ContactInquiry.create({
      companyId: company._id,
      name,
      email,
      phone: phone || '',
      subject: subject || 'Career inquiry',
      message,
    });
    await CompanyProfile.findByIdAndUpdate(company._id, { $inc: { 'stats.studentEngagement': 1 } });
    res.status(201).json({ success: true, item: { _id: item._id } });
  } catch (err) { return fail(res, err); }
};

exports.getPublicJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || job.status !== 'open') return res.status(404).json({ success: false, message: 'Job not found' });
    const company = await CompanyProfile.findOne({ _id: job.companyId, status: 'approved', isPublic: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    await Job.findByIdAndUpdate(job._id, { $inc: { views: 1 } });
    await CompanyProfile.findByIdAndUpdate(company._id, { $inc: { 'stats.jobViews': 1 } });
    res.json({ success: true, job, company: { _id: company._id, name: company.name, slug: company.slug, logo: company.logo } });
  } catch (err) { return fail(res, err); }
};

exports.getPublicInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.internshipId);
    if (!internship || internship.status !== 'open') {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }
    const company = await CompanyProfile.findOne({ _id: internship.companyId, status: 'approved', isPublic: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    await Internship.findByIdAndUpdate(internship._id, { $inc: { views: 1 } });
    await CompanyProfile.findByIdAndUpdate(company._id, { $inc: { 'stats.internshipViews': 1 } });
    res.json({ success: true, internship, company: { _id: company._id, name: company.name, slug: company.slug, logo: company.logo } });
  } catch (err) { return fail(res, err); }
};

exports.sitemap = async (req, res) => {
  try {
    const base = process.env.PUBLIC_APP_URL || 'https://dreamwave.ai';
    const items = await CompanyProfile.find({ status: 'approved', isPublic: true, slug: { $ne: null } })
      .select('slug updatedAt')
      .limit(5000);
    const urls = [
      `${base}/companies`,
      `${base}/discover`,
      `${base}/search`,
      ...items.map((c) => `${base}/companies/${c.slug}`),
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
    const [industries, cities, states, sizes, tech, jobCats, intCats] = await Promise.all([
      CompanyProfile.distinct('industry', { status: 'approved', isPublic: true, industry: { $nin: [null, ''] } }),
      CompanyProfile.distinct('contact.city', { status: 'approved', isPublic: true, 'contact.city': { $nin: [null, ''] } }),
      CompanyProfile.distinct('contact.state', { status: 'approved', isPublic: true, 'contact.state': { $nin: [null, ''] } }),
      CompanyProfile.distinct('companySize', { status: 'approved', isPublic: true, companySize: { $nin: [null, ''] } }),
      CompanyProfile.distinct('techStack', { status: 'approved', isPublic: true }),
      Job.distinct('category', { status: 'open' }),
      Internship.distinct('category', { status: 'open' }),
    ]);
    const catalog = await Promise.all([
      JobCategory.find({ active: true }).select('name slug').limit(50),
      InternshipCategory.find({ active: true }).select('name slug').limit(50),
    ]);
    res.json({
      success: true,
      options: {
        industries: industries.filter(Boolean).sort(),
        cities: cities.filter(Boolean).sort(),
        states: states.filter(Boolean).sort(),
        sizes: sizes.filter(Boolean).sort(),
        technologies: tech.flat().filter(Boolean).sort(),
        jobCategories: [...new Set([...(jobCats || []), ...catalog[0].map((c) => c.name)])].filter(Boolean).sort(),
        internshipCategories: [...new Set([...(intCats || []), ...catalog[1].map((c) => c.name)])].filter(Boolean).sort(),
      },
    });
  } catch (err) { return fail(res, err); }
};
