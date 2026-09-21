const User = require('../models/User');
const Institution = require('../models/Institution');
const CompanyProfile = require('../models/CompanyProfile');
const Promotion = require('../models/Promotion');
const Review = require('../models/Review');
const LibraryBook = require('../models/LibraryBook');
const CareerReport = require('../models/Report');
const ContentReport = require('../models/ContentReport');
const AdminLog = require('../models/AdminLog');
const Notification = require('../models/Notification');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const Course = require('../models/Course');
const PortalEvent = require('../models/PortalEvent');
const Scholarship = require('../models/Scholarship');
const PlatformAnalytics = require('../models/PlatformAnalytics');
const SearchIndex = require('../models/SearchIndex');
const { createForUser } = require('./notificationController');
const { escapeRegex } = require('../utils/portalHelpers');

async function logAdmin(adminId, action, targetType, targetId, details = '') {
  try {
    await AdminLog.create({ adminId, action, targetType, targetId, details });
  } catch { /* non-blocking */ }
}

exports.getOverview = async (req, res) => {
  try {
    const sinceDay = new Date();
    sinceDay.setDate(sinceDay.getDate() - 30);
    const day30 = sinceDay.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const [
      users, students, institutions, companies, books, jobs, internships, events,
      pendingPromotions, pendingReviews, openReports, scholarships, courses,
      dau, mau, searches, verifiedUsers, recentLogins, suspendedUsers, institutionUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Institution.countDocuments(),
      CompanyProfile.countDocuments(),
      LibraryBook.countDocuments({ status: 'active' }),
      Job.countDocuments({ status: 'open' }),
      Internship.countDocuments({ status: 'open' }),
      PortalEvent.countDocuments({ status: 'published' }),
      Promotion.countDocuments({ status: 'pending' }),
      Review.countDocuments({ status: 'pending' }),
      ContentReport.countDocuments({ status: 'open' }),
      Scholarship.countDocuments({ status: 'open' }),
      Course.countDocuments({ status: 'active' }),
      PlatformAnalytics.distinct('userId', { day: today, userId: { $ne: null } }),
      PlatformAnalytics.distinct('userId', { day: { $gte: day30 }, userId: { $ne: null } }),
      SearchIndex.countDocuments({ day: today }),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ lastLoginAt: { $gte: sinceDay } }),
      User.countDocuments({ $or: [{ suspended: true }, { accountStatus: { $in: ['SUSPENDED', 'DISABLED'] } }] }),
      User.countDocuments({ role: 'institution' }),
    ]);

    res.json({
      success: true,
      stats: {
        users,
        students,
        institutions,
        companies,
        books,
        jobs,
        internships,
        events,
        courses,
        scholarships,
        pendingPromotions,
        pendingReviews,
        openReports,
        dailyActiveUsers: dau.length,
        monthlyActiveUsers: mau.length,
        searchesToday: searches,
        verifiedUsers,
        recentSignIns30d: recentLogins,
        suspendedUsers,
        institutionUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const days = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const traffic = await Promise.all(days.map(async (day) => {
      const [views, searches, logins] = await Promise.all([
        PlatformAnalytics.countDocuments({ day, eventType: { $in: ['page_view', 'discovery'] } }),
        PlatformAnalytics.countDocuments({ day, eventType: 'search' }),
        PlatformAnalytics.countDocuments({ day, eventType: 'login' }),
      ]);
      return { day, views, searches, logins };
    }));

    const [students, institutions, companies, books, jobs, internships] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Institution.countDocuments({ status: 'approved' }),
      CompanyProfile.countDocuments({ status: 'approved' }),
      LibraryBook.countDocuments({ status: 'active' }),
      Job.countDocuments({ status: 'open' }),
      Internship.countDocuments({ status: 'open' }),
    ]);
    const growth = { students, institutions, companies, books, jobs, internships };

    const topQueries = await SearchIndex.aggregate([
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    res.json({ success: true, analytics: { traffic, growth, topQueries } });
  } catch (err) {
    console.error('[admin.analytics]', err.message);
    res.status(500).json({ success: false, code: 'ADMIN_ANALYTICS_ERROR', message: 'Unable to load analytics.' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role && ['student', 'institution', 'company', 'admin'].includes(req.query.role)) {
      filter.role = req.query.role;
    }
    if (req.query.accountStatus && ['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_VERIFICATION'].includes(req.query.accountStatus)) {
      filter.accountStatus = req.query.accountStatus;
    }
    if (req.query.emailVerified === 'true') filter.emailVerified = true;
    if (req.query.emailVerified === 'false') filter.emailVerified = false;
    if (req.query.q) {
      const query = new RegExp(escapeRegex(String(req.query.q).slice(0, 120)), 'i');
      filter.$or = [
        { name: query },
        { email: query },
        { organizationName: query },
      ];
    }
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role organizationName institutionId emailVerified emailVerifiedAt accountStatus suspended createdAt lastLoginAt')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const institutionIds = [...new Set(users.map((u) => u.institutionId).filter(Boolean).map(String))];
    const ownedInstitutionUserIds = users.filter((u) => u.role === 'institution').map((u) => u._id);
    const [linkedInstitutions, ownedInstitutions] = await Promise.all([
      institutionIds.length
        ? Institution.find({ _id: { $in: institutionIds } }).select('name status verified').lean()
        : [],
      ownedInstitutionUserIds.length
        ? Institution.find({
          $or: [
            { ownerId: { $in: ownedInstitutionUserIds } },
            { ownerUserId: { $in: ownedInstitutionUserIds } },
          ],
        }).select('name status verified ownerId ownerUserId').lean()
        : [],
    ]);
    const linkedById = Object.fromEntries(linkedInstitutions.map((i) => [String(i._id), i]));
    const ownedByUser = {};
    for (const inst of ownedInstitutions) {
      const key = String(inst.ownerUserId || inst.ownerId);
      ownedByUser[key] = inst;
    }

    const items = users.map((u) => {
      const owned = ownedByUser[String(u._id)];
      const linked = u.institutionId ? linkedById[String(u.institutionId)] : null;
      const institution = owned || linked || null;
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        organizationName: u.organizationName || '',
        institutionId: institution?._id || u.institutionId || null,
        institutionName: institution?.name || u.organizationName || '',
        institutionStatus: institution?.status || null,
        emailVerified: Boolean(u.emailVerified),
        emailVerifiedAt: u.emailVerifiedAt || null,
        accountStatus: u.accountStatus || (u.suspended ? 'SUSPENDED' : 'ACTIVE'),
        suspended: Boolean(u.suspended),
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt || null,
      };
    });

    // Optional institution-name filter after enrichment (bounded list only).
    const institutionFilter = String(req.query.institution || '').trim().toLowerCase();
    const filtered = institutionFilter
      ? items.filter((item) => String(item.institutionName || '').toLowerCase().includes(institutionFilter))
      : items;

    res.json({
      success: true,
      items: filtered,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const suspended = req.body.suspended !== false;
    const accountStatus = suspended ? 'SUSPENDED' : 'ACTIVE';
    if (String(req.params.id) === String(req.user._id) && suspended) {
      return res.status(400).json({ success: false, message: 'Admins cannot suspend their own account.' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { suspended, accountStatus },
      { new: true },
    ).select('-password -verificationOTP -resetPasswordOTP -phoneOTP -passwordHistory');
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(
      req.user._id,
      suspended ? 'suspend_user' : 'unsuspend_user',
      'user',
      user._id,
      `accountStatus=${accountStatus}`,
    );
    if (suspended) {
      await createForUser(user._id, { title: 'Account suspended', body: 'Your Dream Wave account was suspended by an admin.', type: 'system' }).catch(() => {});
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUserAccess = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Admins cannot change their own access here.' });
    }

    const allowedRoles = ['student', 'institution', 'company', 'admin'];
    const allowedStatuses = ['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_VERIFICATION'];
    const updates = [];

    if (req.body.role !== undefined) {
      if (!allowedRoles.includes(req.body.role)) {
        return res.status(400).json({ success: false, message: 'Invalid role.' });
      }
      // Frontend/self-signup never grants admin; only Dream Wave admins can assign it here.
      if (user.role !== req.body.role) {
        updates.push(`role:${user.role}->${req.body.role}`);
        user.role = req.body.role;
      }
    }

    if (req.body.accountStatus !== undefined) {
      if (!allowedStatuses.includes(req.body.accountStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid account status.' });
      }
      updates.push(`accountStatus:${user.accountStatus}->${req.body.accountStatus}`);
      user.accountStatus = req.body.accountStatus;
      user.suspended = req.body.accountStatus === 'SUSPENDED' || req.body.accountStatus === 'DISABLED';
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No valid access fields provided.' });
    }

    await user.save();
    await logAdmin(req.user._id, 'update_user_access', 'user', user._id, updates.join('; '));
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        suspended: user.suspended,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listInstitutions = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const items = await Institution.find(filter).sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveInstitution = async (req, res) => {
  try {
    const inst = await Institution.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', verified: true },
      { new: true },
    );
    if (!inst) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, 'approve_institution', 'institution', inst._id, 'verified=true');
    if (inst.ownerId) {
      await createForUser(inst.ownerId, {
        title: 'Institution approved',
        body: `${inst.name} is now live on Dream Wave Discovery.`,
        link: `/institutions/${inst.slug}`,
        type: 'approval',
      }).catch(() => {});
    }
    res.json({ success: true, institution: inst });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.suspendInstitution = async (req, res) => {
  try {
    const inst = await Institution.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended', verified: false },
      { new: true },
    );
    if (!inst) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, 'suspend_institution', 'institution', inst._id);
    res.json({ success: true, institution: inst });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listCompanies = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const items = await CompanyProfile.find(filter).sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveCompany = async (req, res) => {
  try {
    const company = await CompanyProfile.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!company) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, 'approve_company', 'company', company._id);
    if (company.ownerId) {
      await createForUser(company.ownerId, {
        title: 'Company approved',
        body: `${company.name} is now live on Dream Wave Discovery.`,
        link: `/companies/${company.slug}`,
        type: 'approval',
      }).catch(() => {});
    }
    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.suspendCompany = async (req, res) => {
  try {
    const company = await CompanyProfile.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    if (!company) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, 'suspend_company', 'company', company._id);
    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listPromotions = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : { status: 'pending' };
    const items = await Promotion.find(filter).sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approvePromotion = async (req, res) => {
  try {
    const item = await Promotion.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date() },
      { new: true },
    );
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, 'approve_promotion', 'promotion', item._id);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectPromotion = async (req, res) => {
  try {
    const item = await Promotion.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, 'reject_promotion', 'promotion', item._id);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listReviews = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    else filter.$or = [{ status: 'pending' }, { reportCount: { $gte: 1 } }];
    const items = await Review.find(filter).sort('-createdAt').limit(100).populate('studentId', 'name email');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.moderateReview = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }
    const item = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, `review_${status}`, 'review', item._id);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listBooks = async (req, res) => {
  try {
    const items = await LibraryBook.find().sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.archiveBook = async (req, res) => {
  try {
    const item = await LibraryBook.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, 'archive_book', 'book', item._id);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listJobs = async (req, res) => {
  try {
    const items = await Job.find().sort('-createdAt').limit(100).populate('companyId', 'name');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.closeJob = async (req, res) => {
  try {
    const item = await Job.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, 'close_job', 'job', item._id);
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listInternships = async (req, res) => {
  try {
    const items = await Internship.find().sort('-createdAt').limit(100).populate('companyId', 'name');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listCourses = async (req, res) => {
  try {
    const items = await Course.find().sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listEvents = async (req, res) => {
  try {
    const items = await PortalEvent.find().sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listScholarships = async (req, res) => {
  try {
    const items = await Scholarship.find().sort('-createdAt').limit(100);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listContentReports = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const items = await ContentReport.find(filter).sort('-createdAt').limit(100).populate('reporterId', 'name email');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resolveContentReport = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    if (!['resolved', 'dismissed', 'reviewing'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const item = await ContentReport.findByIdAndUpdate(
      req.params.id,
      { status, resolution: resolution || '', resolvedBy: req.user._id, resolvedAt: new Date() },
      { new: true },
    );
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    await logAdmin(req.user._id, `report_${status}`, 'content_report', item._id, resolution || '');
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Legacy career AI reports (student intelligence reports). */
exports.listCareerReports = async (req, res) => {
  try {
    const items = await CareerReport.find().sort('-createdAt').limit(50).populate('user', 'name email');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listReports = exports.listContentReports;

exports.listLogs = async (req, res) => {
  try {
    const items = await AdminLog.find().sort('-createdAt').limit(100).populate('adminId', 'name email');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const { title, body, link, role } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title required' });
    const filter = role ? { role } : { role: { $in: ['student', 'institution', 'company'] } };
    const users = await User.find(filter).select('_id').limit(500);
    await Promise.all(users.map((u) => createForUser(u._id, {
      title, body: body || '', link: link || '', type: 'system', channel: 'in-app',
    })));
    await logAdmin(req.user._id, 'broadcast_notification', 'notification', null, title);
    res.json({ success: true, sent: users.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
