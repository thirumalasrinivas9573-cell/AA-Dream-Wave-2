const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Resume = require('../models/Resume');
const Notification = require('../models/Notification');
const Organization = require('../models/Organization');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { pick, escapeRegex } = require('../utils/helpers');
const { writeAudit } = require('../utils/audit');
const { JOB_STATUS, APPLICATION_STATUS } = require('../config/constants');

const JOB_FIELDS = [
  'title',
  'description',
  'category',
  'skills',
  'salary',
  'location',
  'workMode',
  'openings',
  'experienceMinYears',
  'experienceMaxYears',
  'education',
  'closesAt',
];

async function findOwnedJob(orgId, jobId) {
  return Job.findOne({ _id: jobId, organizationId: orgId });
}

async function findOwnedApplication(orgId, applicationId) {
  return JobApplication.findOne({ _id: applicationId, organizationId: orgId });
}

exports.listJobs = asyncHandler(async (req, res) => {
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { organizationId: req.params.id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.workMode) filter.workMode = req.query.workMode;
  if (req.query.q) {
    const q = escapeRegex(String(req.query.q).slice(0, 80));
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
    ];
  }
  const [total, jobs] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);
  const pagination = paginationMeta(page, limit, total);
  res.json({
    success: true,
    data: {
      jobs,
      pagination,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
    },
  });
});

exports.createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({
    organizationId: req.params.id,
    createdBy: req.user._id,
    ...pick(req.body, JOB_FIELDS),
    status: req.body.status === 'published' ? 'published' : 'draft',
    publishedAt: req.body.status === 'published' ? new Date() : null,
  });
  await writeAudit({
    organizationId: req.params.id,
    actor: req.user._id,
    action: 'job.create',
    resource: 'job',
    resourceId: job._id,
    meta: { status: job.status },
    ip: req.ip,
  });
  res.status(201).json({ success: true, data: { job } });
});

exports.getJob = asyncHandler(async (req, res) => {
  const job = await findOwnedJob(req.params.id, req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  res.json({ success: true, data: { job } });
});

exports.updateJob = asyncHandler(async (req, res) => {
  const job = await findOwnedJob(req.params.id, req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  Object.assign(job, pick(req.body, JOB_FIELDS));
  await job.save();
  await writeAudit({
    organizationId: req.params.id,
    actor: req.user._id,
    action: 'job.update',
    resource: 'job',
    resourceId: job._id,
    ip: req.ip,
  });
  res.json({ success: true, data: { job } });
});

exports.publishJob = asyncHandler(async (req, res) => {
  const job = await findOwnedJob(req.params.id, req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  job.status = 'published';
  job.publishedAt = new Date();
  await job.save();
  await writeAudit({
    organizationId: req.params.id,
    actor: req.user._id,
    action: 'job.publish',
    resource: 'job',
    resourceId: job._id,
    ip: req.ip,
  });
  res.json({ success: true, data: { job } });
});

exports.draftJob = asyncHandler(async (req, res) => {
  const job = await findOwnedJob(req.params.id, req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  job.status = 'draft';
  await job.save();
  res.json({ success: true, data: { job } });
});

exports.archiveJob = asyncHandler(async (req, res) => {
  const job = await findOwnedJob(req.params.id, req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  job.status = 'archived';
  await job.save();
  await writeAudit({
    organizationId: req.params.id,
    actor: req.user._id,
    action: 'job.archive',
    resource: 'job',
    resourceId: job._id,
    ip: req.ip,
  });
  res.json({ success: true, data: { job } });
});

exports.removeJob = asyncHandler(async (req, res) => {
  const job = await findOwnedJob(req.params.id, req.params.jobId);
  if (!job) throw new AppError('Job not found', 404);
  await JobApplication.deleteMany({ job: job._id });
  await job.deleteOne();
  await writeAudit({
    organizationId: req.params.id,
    actor: req.user._id,
    action: 'job.delete',
    resource: 'job',
    resourceId: job._id,
    ip: req.ip,
  });
  res.json({ success: true, message: 'Job deleted' });
});

exports.listApplications = asyncHandler(async (req, res) => {
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { organizationId: req.params.id };
  if (req.query.job) filter.job = req.query.job;
  if (req.query.status) filter.status = req.query.status;
  const [total, applications] = await Promise.all([
    JobApplication.countDocuments(filter),
    JobApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('applicant', 'name email aaid profileImage targetCareer')
      .populate('job', 'title status location workMode'),
  ]);
  const pagination = paginationMeta(page, limit, total);
  res.json({
    success: true,
    data: {
      applications,
      pagination,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
    },
  });
});

exports.getApplication = asyncHandler(async (req, res) => {
  const application = await findOwnedApplication(req.params.id, req.params.applicationId);
  if (!application) throw new AppError('Application not found', 404);
  await application.populate('applicant', 'name email aaid profileImage bio targetCareer');
  await application.populate('job', 'title status skills location workMode');
  res.json({ success: true, data: { application } });
});

exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const application = await findOwnedApplication(req.params.id, req.params.applicationId);
  if (!application) throw new AppError('Application not found', 404);
  const status = String(req.body.status || '').toLowerCase();
  if (!APPLICATION_STATUS.includes(status)) throw new AppError('Invalid application status', 400);
  if (status === 'withdrawn') throw new AppError('Cannot set withdrawn from company side', 400);

  application.status = status;
  application.reviewedBy = req.user._id;
  application.statusHistory.push({
    status,
    note: String(req.body.note || '').slice(0, 500),
    changedBy: req.user._id,
    at: new Date(),
  });
  await application.save();

  const job = await Job.findById(application.job).select('title');
  await Notification.create({
    user: application.applicant,
    title: `Application ${status}`,
    message: `Your application for "${job?.title || 'a role'}" is now ${status}`,
    type: status === 'hired' || status === 'shortlisted' ? 'success' : 'info',
    link: '/jobs',
  });

  await writeAudit({
    organizationId: req.params.id,
    actor: req.user._id,
    action: `application.${status}`,
    resource: 'application',
    resourceId: application._id,
    ip: req.ip,
  });

  res.json({ success: true, data: { application } });
});

exports.scheduleInterview = asyncHandler(async (req, res) => {
  const application = await findOwnedApplication(req.params.id, req.params.applicationId);
  if (!application) throw new AppError('Application not found', 404);
  if (!req.body.scheduledAt) throw new AppError('scheduledAt is required', 400);

  application.interview = {
    scheduledAt: new Date(req.body.scheduledAt),
    mode: req.body.mode || 'online',
    location: String(req.body.location || '').slice(0, 200),
    notes: String(req.body.notes || '').slice(0, 1000),
    meetingUrl: String(req.body.meetingUrl || '').slice(0, 300),
  };
  application.status = 'interview';
  application.statusHistory.push({
    status: 'interview',
    note: 'Interview scheduled',
    changedBy: req.user._id,
    at: new Date(),
  });
  await application.save();

  const job = await Job.findById(application.job).select('title');
  await Notification.create({
    user: application.applicant,
    title: 'Interview scheduled',
    message: `Interview for "${job?.title || 'role'}" on ${new Date(req.body.scheduledAt).toLocaleString()}`,
    type: 'info',
    link: '/jobs',
  });

  await writeAudit({
    organizationId: req.params.id,
    actor: req.user._id,
    action: 'application.interview.schedule',
    resource: 'application',
    resourceId: application._id,
    ip: req.ip,
  });

  res.json({ success: true, data: { application } });
});

/* ——— Student-facing careers APIs ——— */
exports.listPublishedJobs = asyncHandler(async (req, res) => {
  const { parsePagination, paginationMeta } = require('../utils/pagination');
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { status: 'published' };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.workMode) filter.workMode = req.query.workMode;
  if (req.query.location) {
    filter.location = { $regex: String(req.query.location).slice(0, 80), $options: 'i' };
  }
  if (req.query.q) {
    const q = escapeRegex(String(req.query.q).slice(0, 80));
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
    ];
  }
  if (req.query.skill) filter.skills = { $in: [String(req.query.skill).slice(0, 60)] };

  const [total, jobs] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const orgIds = [...new Set(jobs.map((j) => String(j.organizationId)))];
  const orgs = await Organization.find({ _id: { $in: orgIds } })
    .select('name slug profile.logoUrl company.industry company.verificationStatus')
    .lean();
  const orgMap = Object.fromEntries(orgs.map((o) => [String(o._id), o]));
  const pagination = paginationMeta(page, limit, total);

  res.json({
    success: true,
    data: {
      jobs: jobs.map((j) => ({
        ...j,
        company: orgMap[String(j.organizationId)]
          ? {
              id: orgMap[String(j.organizationId)]._id,
              name: orgMap[String(j.organizationId)].name,
              slug: orgMap[String(j.organizationId)].slug,
              logoUrl: orgMap[String(j.organizationId)].profile?.logoUrl || '',
              industry: orgMap[String(j.organizationId)].company?.industry || '',
              verified:
                orgMap[String(j.organizationId)].company?.verificationStatus === 'verified',
            }
          : null,
      })),
      pagination,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
    },
  });
});

exports.getPublishedJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, status: 'published' }).lean();
  if (!job) throw new AppError('Job not found', 404);
  const org = await Organization.findById(job.organizationId)
    .select('name slug profile company')
    .lean();
  res.json({
    success: true,
    data: {
      job: {
        ...job,
        company: org
          ? {
              id: org._id,
              name: org.name,
              slug: org.slug,
              logoUrl: org.profile?.logoUrl || '',
              website: org.profile?.website || '',
              industry: org.company?.industry || '',
              size: org.company?.size || '',
              verified: org.company?.verificationStatus === 'verified',
            }
          : null,
      },
    },
  });
});

exports.applyToJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, status: 'published' });
  if (!job) throw new AppError('Job not found or not open', 404);
  if (job.closesAt && new Date(job.closesAt) < new Date()) {
    throw new AppError('Applications are closed for this job', 400);
  }

  const existing = await JobApplication.findOne({ job: job._id, applicant: req.user._id });
  if (existing) throw new AppError('You already applied to this job', 400);

  const resume = await Resume.findOne({ user: req.user._id }).sort({ updatedAt: -1 });
  const application = await JobApplication.create({
    organizationId: job.organizationId,
    job: job._id,
    applicant: req.user._id,
    coverLetter: String(req.body.coverLetter || '').slice(0, 5000),
    resumeSnapshot: resume
      ? {
          headline: resume.headline,
          summary: resume.summary,
          skills: resume.skills,
          experience: resume.experience,
          education: resume.education,
        }
      : {},
    statusHistory: [{ status: 'applied', note: 'Application submitted', changedBy: req.user._id }],
  });

  job.applicationCount = (job.applicationCount || 0) + 1;
  await job.save();

  await Notification.create({
    user: req.user._id,
    title: 'Application submitted',
    message: `You applied to "${job.title}"`,
    type: 'success',
    link: '/jobs',
  });

  res.status(201).json({ success: true, data: { application } });
});

exports.myApplications = asyncHandler(async (req, res) => {
  const applications = await JobApplication.find({ applicant: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('job', 'title status location workMode organizationId')
    .lean();
  const orgIds = [...new Set(applications.map((a) => String(a.job?.organizationId || a.organizationId)))];
  const orgs = await Organization.find({ _id: { $in: orgIds } }).select('name slug').lean();
  const orgMap = Object.fromEntries(orgs.map((o) => [String(o._id), o]));
  res.json({
    success: true,
    data: {
      applications: applications.map((a) => ({
        ...a,
        company: orgMap[String(a.organizationId)] || null,
      })),
    },
  });
});

exports.withdrawApplication = asyncHandler(async (req, res) => {
  const application = await JobApplication.findOne({
    _id: req.params.applicationId,
    applicant: req.user._id,
  });
  if (!application) throw new AppError('Application not found', 404);
  if (['hired', 'withdrawn'].includes(application.status)) {
    throw new AppError('Cannot withdraw this application', 400);
  }
  application.status = 'withdrawn';
  application.statusHistory.push({
    status: 'withdrawn',
    note: 'Withdrawn by applicant',
    changedBy: req.user._id,
    at: new Date(),
  });
  await application.save();
  res.json({ success: true, data: { application } });
});

exports.listCategories = asyncHandler(async (_req, res) => {
  const categories = await Job.distinct('category', { status: 'published' });
  res.json({ success: true, data: { categories: categories.filter(Boolean).sort() } });
});
