const Organization = require('../models/Organization');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const CompanyMessage = require('../models/CompanyMessage');
const AuditLog = require('../models/AuditLog');
const OrgNotification = require('../models/OrgNotification');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Resume = require('../models/Resume');
const StudyPlan = require('../models/StudyPlan');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { pick, escapeRegex } = require('../utils/helpers');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { toAssetUrl } = require('../utils/assetUrl');
const { writeAudit } = require('../utils/audit');
const {
  COMPANY_SIZES,
  VERIFICATION_STATUS,
  ORG_TYPES,
} = require('../config/constants');
const analyticsService = require('../services/analyticsService');

function publicCompany(org) {
  return {
    id: org._id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    plan: org.plan,
    owner: org.owner,
    profile: org.profile || {},
    company: org.company || {},
    settings: org.settings || {},
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

exports.getProfile = asyncHandler(async (req, res) => {
  const org = req.organization || (await Organization.findById(req.params.id));
  if (!org) throw new AppError('Organization not found', 404);
  res.json({
    success: true,
    data: {
      organization: publicCompany(org),
      membership: {
        role: req.orgMembership.role,
        memberKind: req.orgMembership.memberKind,
      },
    },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (req.body.name) {
    const name = String(req.body.name).trim();
    if (name.length < 2 || name.length > 120) {
      throw new AppError('Company name must be 2–120 characters', 400);
    }
    org.name = name;
  }
  if (req.body.profile && typeof req.body.profile === 'object') {
    org.profile = {
      ...(org.profile?.toObject?.() || org.profile || {}),
      ...pick(req.body.profile, [
        'description',
        'website',
        'phone',
        'email',
        'address',
        'city',
        'state',
        'country',
        'logoUrl',
      ]),
    };
  }
  if (req.body.company && typeof req.body.company === 'object') {
    const next = { ...(org.company?.toObject?.() || org.company || {}) };
    if (req.body.company.industry !== undefined) {
      next.industry = String(req.body.company.industry).slice(0, 120);
    }
    if (req.body.company.size !== undefined) {
      const size = String(req.body.company.size);
      if (size && !COMPANY_SIZES.includes(size)) throw new AppError('Invalid company size', 400);
      next.size = size;
    }
    if (Array.isArray(req.body.company.locations)) {
      next.locations = req.body.company.locations.slice(0, 20).map((l) => ({
        label: String(l.label || '').slice(0, 80),
        city: String(l.city || '').slice(0, 80),
        state: String(l.state || '').slice(0, 80),
        country: String(l.country || '').slice(0, 80),
        isPrimary: Boolean(l.isPrimary),
      }));
    }
    org.company = next;
  }
  await org.save();
  await writeAudit({
    organizationId: org._id,
    actor: req.user._id,
    action: 'company.profile.update',
    resource: 'organization',
    resourceId: org._id,
    ip: req.ip,
  });
  res.json({ success: true, data: { organization: publicCompany(org) } });
});

exports.uploadLogo = asyncHandler(async (req, res) => {
  const org = req.organization;
  if (!req.file) throw new AppError('Logo file is required', 400);
  org.profile = {
    ...(org.profile?.toObject?.() || org.profile || {}),
    logoUrl: toAssetUrl(req.file.filename),
  };
  await org.save();
  await writeAudit({
    organizationId: org._id,
    actor: req.user._id,
    action: 'company.logo.upload',
    resource: 'organization',
    resourceId: org._id,
    ip: req.ip,
  });
  res.json({ success: true, data: { organization: publicCompany(org) } });
});

exports.requestVerification = asyncHandler(async (req, res) => {
  const org = req.organization;
  const status = org.company?.verificationStatus || 'unverified';
  if (status === 'verified') throw new AppError('Company is already verified', 400);
  if (status === 'pending') throw new AppError('Verification already pending', 400);
  org.company = {
    ...(org.company?.toObject?.() || org.company || {}),
    verificationStatus: 'pending',
    verificationNotes: String(req.body.notes || '').slice(0, 500),
  };
  await org.save();
  await writeAudit({
    organizationId: org._id,
    actor: req.user._id,
    action: 'company.verification.request',
    resource: 'organization',
    resourceId: org._id,
    ip: req.ip,
  });
  res.json({
    success: true,
    data: { verificationStatus: 'pending', organization: publicCompany(org) },
  });
});

exports.dashboard = asyncHandler(async (req, res) => {
  const orgId = req.params.id;
  const data = await analyticsService.getCompanyAnalytics(orgId);
  const recentApps = await JobApplication.find({ organizationId: orgId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('applicant', 'name email aaid')
    .populate('job', 'title status')
    .lean();
  const recentJobs = await Job.find({ organizationId: orgId })
    .sort({ updatedAt: -1 })
    .limit(8)
    .select('title status applicationCount publishedAt updatedAt workMode location')
    .lean();
  const activity = await AuditLog.find({ organizationId: orgId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('actor', 'name email')
    .lean();

  res.json({
    success: true,
    data: {
      organization: publicCompany(req.organization),
      analytics: data,
      hiringOverview: {
        recentApplications: recentApps,
        recentJobs,
      },
      activityFeed: activity.map((a) => ({
        id: a._id,
        action: a.action,
        resource: a.resource,
        resourceId: a.resourceId,
        actor: a.actor
          ? { id: a.actor._id, name: a.actor.name, email: a.actor.email }
          : null,
        createdAt: a.createdAt,
      })),
      viewerRole: req.orgMembership?.role || null,
    },
  });
});

exports.analytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getCompanyAnalytics(req.params.id);
  res.json({ success: true, data });
});

exports.talentSearch = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const empty = () => {
    const pagination = paginationMeta(page, limit, 0);
    return res.json({
      success: true,
      data: {
        talent: [],
        pagination,
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
      },
    });
  };

  const skillsFilter = String(req.query.skills || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  const education = String(req.query.education || '').trim().slice(0, 80);
  const course = String(req.query.course || '').trim().slice(0, 80);
  const experienceMin = Number(req.query.experienceMin);
  const q = String(req.query.q || '').trim().slice(0, 80);

  let userIds = null;

  if (skillsFilter.length) {
    const skillUsers = await Skill.distinct('user', {
      name: { $in: skillsFilter.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')) },
      mastery: { $gte: Number(req.query.minMastery) || 0 },
    });
    userIds = skillUsers.map(String);
    if (!userIds.length) {
      return empty();
    }
  }

  if (course) {
    const planUsers = await StudyPlan.distinct('user', {
      topic: { $regex: escapeRegex(course), $options: 'i' },
    });
    const ids = planUsers.map(String);
    userIds = userIds ? userIds.filter((id) => ids.includes(id)) : ids;
    if (!userIds.length) {
      return empty();
    }
  }

  if (education || (Number.isFinite(experienceMin) && experienceMin > 0)) {
    const resumeFilter = {};
    if (userIds) {
      resumeFilter.user = { $in: userIds };
    }
    if (education) {
      resumeFilter['education.degree'] = { $regex: escapeRegex(education), $options: 'i' };
    }
    const resumes = await Resume.find(resumeFilter)
      .select('user experience education skills headline')
      .limit(userIds ? Math.max(userIds.length, 200) : 500)
      .lean();
    let filtered = resumes;
    if (Number.isFinite(experienceMin) && experienceMin > 0) {
      filtered = resumes.filter((r) => (r.experience || []).length >= experienceMin);
    }
    const ids = filtered.map((r) => String(r.user));
    userIds = userIds ? userIds.filter((id) => ids.includes(id)) : ids;
    if (!userIds.length) {
      return empty();
    }
  }

  const talentFilter = {
    role: 'user',
  };
  if (q) {
    talentFilter.$or = [
      { name: { $regex: escapeRegex(q), $options: 'i' } },
      { email: { $regex: escapeRegex(q), $options: 'i' } },
      { targetCareer: { $regex: escapeRegex(q), $options: 'i' } },
    ];
  }

  // Prefer excluding this company's own members from talent results
  const OrgMembership = require('../models/OrgMembership');
  const companyMemberIds = await OrgMembership.find({ org: req.params.id }).distinct('user');
  const exclude = new Set(companyMemberIds.map(String));

  if (userIds) {
    userIds = userIds.filter((id) => !exclude.has(String(id)));
    if (!userIds.length) {
      return empty();
    }
    talentFilter._id = { $in: userIds };
  } else {
    talentFilter._id = { $nin: [...exclude] };
  }

  const [total, users] = await Promise.all([
    User.countDocuments(talentFilter),
    User.find(talentFilter)
      .select('name email aaid bio targetCareer profileImage level plan certificates')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const ids = users.map((u) => u._id);
  const [skills, resumes] = await Promise.all([
    Skill.find({ user: { $in: ids } }).select('user name mastery level').lean(),
    Resume.find({ user: { $in: ids } })
      .select('user headline summary skills education experience')
      .lean(),
  ]);
  const skillsByUser = {};
  skills.forEach((s) => {
    const key = String(s.user);
    if (!skillsByUser[key]) skillsByUser[key] = [];
    skillsByUser[key].push(s);
  });
  const resumeByUser = Object.fromEntries(resumes.map((r) => [String(r.user), r]));

  const pagination = paginationMeta(page, limit, total);
  res.json({
    success: true,
    data: {
      talent: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        aaid: u.aaid,
        bio: u.bio,
        targetCareer: u.targetCareer,
        profileImage: u.profileImage,
        level: u.level,
        plan: u.plan,
        certificates: u.certificates || [],
        skills: skillsByUser[String(u._id)] || [],
        resume: resumeByUser[String(u._id)] || null,
      })),
      pagination,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
    },
  });
});

exports.listMessages = asyncHandler(async (req, res) => {
  const filter = { organizationId: req.params.id };
  if (req.query.application) filter.application = req.query.application;
  const messages = await CompanyMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 50, 100))
    .populate('fromUser', 'name email')
    .populate('toUser', 'name email');
  res.json({ success: true, data: { messages } });
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const toUser = await User.findById(req.body.toUser);
  if (!toUser) throw new AppError('Recipient not found', 404);
  const message = await CompanyMessage.create({
    organizationId: req.params.id,
    job: req.body.job || null,
    application: req.body.application || null,
    fromUser: req.user._id,
    toUser: toUser._id,
    body: String(req.body.body || '').trim(),
  });
  await Notification.create({
    user: toUser._id,
    title: `Message from ${req.organization.name}`,
    message: String(req.body.body || '').slice(0, 200),
    type: 'info',
    link: '/jobs',
  });
  await writeAudit({
    organizationId: req.params.id,
    actor: req.user._id,
    action: 'company.message.send',
    resource: 'message',
    resourceId: message._id,
    ip: req.ip,
  });
  res.status(201).json({ success: true, data: { message } });
});

exports.listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 30, maxLimit: 100 });
  const filter = { organizationId: req.params.id };
  if (req.query.action) filter.action = req.query.action;
  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name email'),
  ]);
  const pagination = paginationMeta(page, limit, total);
  res.json({
    success: true,
    data: {
      logs,
      pagination,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
    },
  });
});

exports.createNotification = asyncHandler(async (req, res) => {
  const note = await OrgNotification.create({
    organizationId: req.params.id,
    title: req.body.title,
    message: req.body.message,
    type: req.body.type || 'info',
    audience: req.body.audience || 'all',
    link: req.body.link || '/company',
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { notification: note } });
});

/** Platform admin: set company verification status */
exports.adminSetVerification = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) throw new AppError('Organization not found', 404);
  if (org.type !== ORG_TYPES.COMPANY) throw new AppError('Not a company organization', 400);
  const status = String(req.body.status || '').toLowerCase();
  if (!VERIFICATION_STATUS.includes(status)) throw new AppError('Invalid verification status', 400);
  org.company = {
    ...(org.company?.toObject?.() || org.company || {}),
    verificationStatus: status,
    verificationNotes: String(req.body.notes || '').slice(0, 500),
    verifiedAt: status === 'verified' ? new Date() : null,
    verifiedBy: status === 'verified' ? req.user._id : null,
  };
  await org.save();
  res.json({ success: true, data: { organization: publicCompany(org) } });
});
