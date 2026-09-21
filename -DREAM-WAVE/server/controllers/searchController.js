const Institution = require('../models/Institution');
const CompanyProfile = require('../models/CompanyProfile');
const Course = require('../models/Course');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const LibraryBook = require('../models/LibraryBook');
const Promotion = require('../models/Promotion');
const Post = require('../models/Post');
const Scholarship = require('../models/Scholarship');
const Research = require('../models/Research');
const PortalEvent = require('../models/PortalEvent');
const Faculty = require('../models/Faculty');
const LibraryCollection = require('../models/LibraryCollection');
const SearchIndex = require('../models/SearchIndex');
const PlatformAnalytics = require('../models/PlatformAnalytics');
const StudentProfile = require('../models/StudentProfile');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Roadmap = require('../models/Roadmap');
const Report = require('../models/Report');
const Resume = require('../models/Resume');
const Notification = require('../models/Notification');
const LibraryProgress = require('../models/LibraryProgress');
const Chat = require('../models/Chat');
const Application = require('../models/Application');
const LearningGroup = require('../models/LearningGroup');
const communityService = require('../services/communityService');

const LIMIT = 12;

function escapeRx(q) {
  return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function textSearch(Model, q, filter = {}, select = '') {
  if (!q) return Model.find(filter).select(select).limit(LIMIT);
  try {
    return await Model.find({ ...filter, $text: { $search: q } }).select(select).limit(LIMIT);
  } catch {
    const rx = new RegExp(escapeRx(q), 'i');
    const fields = (select || 'name title').split(/\s+/).filter(Boolean);
    const or = fields.map((f) => ({ [f]: rx }));
    return Model.find({ ...filter, $or: or }).select(select).limit(LIMIT);
  }
}

exports.globalSearch = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const type = String(req.query.type || '').trim(); // optional entity filter
    const {
      state, city, industry, category, author, publisher, language,
      workMode, jobType, minSalary, experience, hiring, skill, technology,
    } = req.query;

    if (!q && !type && !industry && !category && !state) {
      return res.json({ success: true, results: {}, query: '', filters: {} });
    }

    const instFilter = { status: 'approved', isPublic: true };
    if (state) instFilter['contact.state'] = new RegExp(`^${escapeRx(state)}$`, 'i');
    if (city) instFilter['contact.city'] = new RegExp(`^${escapeRx(city)}$`, 'i');

    const companyFilter = { status: 'approved', isPublic: true };
    if (industry) companyFilter.industry = new RegExp(escapeRx(industry), 'i');
    if (city) companyFilter['contact.city'] = new RegExp(`^${escapeRx(city)}$`, 'i');
    if (technology) companyFilter.techStack = new RegExp(escapeRx(technology), 'i');
    if (hiring === 'true') {
      const hiringIds = await Job.distinct('companyId', { status: 'open' });
      companyFilter._id = { $in: hiringIds };
    }

    const bookFilter = { status: 'active' };
    if (category) bookFilter.category = category;
    if (author) bookFilter.author = new RegExp(escapeRx(author), 'i');
    if (publisher) bookFilter.publisher = new RegExp(escapeRx(publisher), 'i');
    if (language) bookFilter.language = language;

    const jobFilter = { status: 'open' };
    if (workMode) jobFilter.workMode = workMode;
    if (jobType) jobFilter.type = jobType;
    if (experience) jobFilter.experience = new RegExp(escapeRx(experience), 'i');
    if (minSalary) jobFilter.salaryMax = { $gte: Number(minSalary) };
    if (city) jobFilter.location = new RegExp(escapeRx(city), 'i');
    if (skill) jobFilter.skills = new RegExp(escapeRx(skill), 'i');

    const run = async (key, fn) => {
      if (type && type !== key && type !== 'all') return [];
      return fn();
    };

    const publicCompanyFilter = { status: 'approved', isPublic: true };
    if (req.query.industry) publicCompanyFilter.industry = new RegExp(escapeRx(req.query.industry), 'i');
    if (req.query.city) publicCompanyFilter['contact.city'] = new RegExp(escapeRx(req.query.city), 'i');
    if (req.query.technology) publicCompanyFilter.techStack = new RegExp(escapeRx(req.query.technology), 'i');
    const publicInstitutionFilter = { status: 'approved', isPublic: true };
    if (req.query.state) publicInstitutionFilter['contact.state'] = new RegExp(escapeRx(req.query.state), 'i');
    if (req.query.city) publicInstitutionFilter['contact.city'] = new RegExp(escapeRx(req.query.city), 'i');
    const [approvedCompanyIds, approvedInstitutionIds] = await Promise.all([
      CompanyProfile.find(publicCompanyFilter).distinct('_id'),
      Institution.find(publicInstitutionFilter).distinct('_id'),
    ]);
    jobFilter.companyId = { $in: approvedCompanyIds };

    const [
      students, institutions, companies, courses, jobs, internships,
      books, promotions, communities, research, events, scholarships, faculty, learningPaths,
    ] = await Promise.all([
      run('students', async () => {
        const profiles = await StudentProfile.find({
          'privacy.visibility': 'public',
          'privacy.discoverable': true,
          ...(q ? { $or: [
            { displayName: new RegExp(escapeRx(q), 'i') },
            { headline: new RegExp(escapeRx(q), 'i') },
            { 'skills.name': new RegExp(escapeRx(q), 'i') },
          ] } : {}),
        }).select('userId username displayName headline profilePhoto').limit(LIMIT).lean();
        return profiles.map((profile) => ({
          _id: profile.userId,
          username: profile.username,
          name: profile.displayName,
          headline: profile.headline,
          profileImage: profile.profilePhoto,
        }));
      }),
      run('institutions', () => textSearch(Institution, q, instFilter, 'name slug logo about contact stats institutionType')),
      run('companies', () => textSearch(CompanyProfile, q, companyFilter, 'name slug logo about industry contact stats')),
      run('courses', () => textSearch(Course, q, { status: 'active', institutionId: { $in: approvedInstitutionIds } }, 'title description institutionId fees')),
      run('jobs', () => textSearch(Job, q, jobFilter, 'title location workMode type salaryMin salaryMax companyId skills')),
      run('internships', () => textSearch(Internship, q, { status: 'open', companyId: { $in: approvedCompanyIds }, ...(city ? { location: new RegExp(escapeRx(city), 'i') } : {}) }, 'title location stipend duration companyId')),
      run('books', () => textSearch(LibraryBook, q, bookFilter, 'title author category publisher language coverUrl')),
      run('promotions', () => textSearch(Promotion, q, { status: 'published' }, 'title content category')),
      run('communities', () => (q
        ? Post.find({ content: new RegExp(escapeRx(q), 'i') }).populate('user', 'name').limit(LIMIT)
        : [])),
      run('research', () => textSearch(Research, q, { status: { $ne: 'draft' } }, 'title summary authors year url')),
      run('events', () => textSearch(PortalEvent, q, { status: 'published' }, 'title type startDate venue ownerType')),
      run('scholarships', () => textSearch(Scholarship, q, { status: 'open' }, 'title amount eligibility deadline')),
      run('faculty', () => (q
        ? Faculty.find({ status: 'active', name: new RegExp(escapeRx(q), 'i') }).select('name designation subjects institutionId').limit(LIMIT)
        : [])),
      run('learningPaths', () => textSearch(LibraryCollection, q, { status: 'published' }, 'title description type')),
    ]);

    // Enrich jobs/internships with company names
    const companyIds = [
      ...jobs.map((j) => j.companyId).filter(Boolean),
      ...internships.map((j) => j.companyId).filter(Boolean),
    ];
    const companiesMap = {};
    if (companyIds.length) {
      const comps = await CompanyProfile.find({ _id: { $in: companyIds } }).select('name slug');
      comps.forEach((c) => { companiesMap[String(c._id)] = c; });
    }
    const jobsEnriched = jobs.map((j) => ({
      ...j.toObject(),
      companyName: companiesMap[String(j.companyId)]?.name || '',
      companySlug: companiesMap[String(j.companyId)]?.slug || '',
    }));
    const intsEnriched = internships.map((j) => ({
      ...j.toObject(),
      companyName: companiesMap[String(j.companyId)]?.name || '',
      companySlug: companiesMap[String(j.companyId)]?.slug || '',
    }));

    const results = {
      students,
      institutions,
      companies,
      courses,
      jobs: jobsEnriched,
      internships: intsEnriched,
      books,
      promotions,
      communities,
      research,
      events,
      scholarships,
      faculty,
      learningPaths,
    };

    const resultCounts = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.length]));

    SearchIndex.create({
      query: q || '(filters)',
      userId: req.user?._id,
      filters: { type, state, city, industry, category },
      resultCounts,
      day: new Date().toISOString().slice(0, 10),
    }).catch(() => {});

    PlatformAnalytics.create({
      eventType: 'search',
      path: '/search',
      userId: req.user?._id,
      meta: { q, type },
      day: new Date().toISOString().slice(0, 10),
    }).catch(() => {});

    res.json({
      success: true,
      query: q,
      filters: { type, state, city, industry, category, author, publisher, language, workMode, jobType, minSalary },
      results,
      resultCounts,
    });
  } catch (err) {
    console.error('[search.global]', err.message);
    res.status(500).json({ success: false, code: 'SEARCH_FAILED', message: 'Search is temporarily unavailable.' });
  }
};

exports.filterOptions = async (req, res) => {
  try {
    const [states, cities, industries, bookCats, jobTypes] = await Promise.all([
      Institution.distinct('contact.state', { status: 'approved', isPublic: true, 'contact.state': { $nin: [null, ''] } }),
      Institution.distinct('contact.city', { status: 'approved', isPublic: true, 'contact.city': { $nin: [null, ''] } }),
      CompanyProfile.distinct('industry', { status: 'approved', isPublic: true, industry: { $nin: [null, ''] } }),
      LibraryBook.distinct('category', { status: 'active' }),
      Job.distinct('type', { status: 'open' }),
    ]);
    res.json({
      success: true,
      options: {
        states: states.filter(Boolean).sort(),
        cities: cities.filter(Boolean).sort(),
        industries: industries.filter(Boolean).sort(),
        bookCategories: bookCats.filter(Boolean).sort(),
        jobTypes: jobTypes.filter(Boolean).sort(),
        workModes: ['onsite', 'remote', 'hybrid'],
        entityTypes: [
          'all', 'institutions', 'companies', 'books', 'courses', 'jobs', 'internships',
          'students', 'faculty', 'research', 'events', 'scholarships', 'learningPaths',
        ],
      },
    });
  } catch (err) {
    console.error('[search.filters]', err.message);
    res.status(500).json({ success: false, code: 'SEARCH_FILTERS_FAILED', message: 'Search filters are temporarily unavailable.' });
  }
};

const UNIFIED_TYPES = [
  'all', 'goals', 'tasks', 'books', 'certificates', 'courses', 'roadmaps',
  'jobs', 'internships', 'reports', 'notifications', 'profile', 'support', 'companies',
  'resumes', 'career', 'conversations', 'posts', 'projects', 'groups', 'students',
  'subjects', 'notes', 'assignments', 'exams', 'academics',
  'research', 'research_projects',
];

const normalized = (id, entityType, title, subtitle, url, updatedAt, metadata = {}) => ({
  id: String(id),
  entityType,
  title: String(title || 'Untitled'),
  subtitle: String(subtitle || ''),
  url,
  updatedAt,
  metadata,
});

exports.unifiedSearch = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 160);
    const requested = String(req.query.types || req.query.type || 'all')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const invalid = requested.filter((item) => !UNIFIED_TYPES.includes(item));
    if (invalid.length) {
      return res.status(400).json({ success: false, code: 'INVALID_SEARCH_TYPE', message: `Unsupported search type: ${invalid[0]}` });
    }
    const typeSet = new Set(requested.includes('all') ? UNIFIED_TYPES : requested);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 30));
    const rx = new RegExp(escapeRx(q), 'i');
    const studentUserId = req.user?.role === 'student' ? req.user._id : null;
    const include = (type) => typeSet.has(type);
    const providers = [];
    const addProvider = (type, execute) => {
      if (include(type)) providers.push({ type, execute });
    };

    const [approvedCompanyIds, approvedInstitutionIds] = await Promise.all([
      CompanyProfile.find({ status: 'approved', isPublic: true }).distinct('_id'),
      Institution.find({ status: 'approved', isPublic: true }).distinct('_id'),
    ]);

    addProvider('companies', async () => {
      const rows = await CompanyProfile.find({
        _id: { $in: approvedCompanyIds },
        ...(q ? { $or: [{ name: rx }, { industry: rx }, { about: rx }, { techStack: rx }] } : {}),
      }).select('name slug industry about logo updatedAt').sort('-updatedAt').limit(limit).lean();
      return rows.map((item) => normalized(item._id, 'companies', item.name, item.industry || item.about, `/companies/${item.slug}`, item.updatedAt, { logo: item.logo }));
    });
    addProvider('jobs', async () => {
      const jobQuery = {
        companyId: { $in: approvedCompanyIds },
        status: 'open',
        $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: new Date() } }],
        ...(q ? { $and: [{ $or: [{ title: rx }, { description: rx }, { skills: rx }, { location: rx }] }] } : {}),
      };
      if (req.query.workMode) jobQuery.workMode = req.query.workMode;
      if (req.query.jobType) jobQuery.type = req.query.jobType;
      if (req.query.minSalary) jobQuery.salaryMax = { $gte: Math.max(0, Number(req.query.minSalary) || 0) };
      if (req.query.skill) jobQuery.skills = new RegExp(escapeRx(req.query.skill), 'i');
      if (req.query.city) jobQuery.location = new RegExp(escapeRx(req.query.city), 'i');
      const rows = await Job.find(jobQuery).populate('companyId', 'name slug logo').sort('-createdAt').limit(limit).lean();
      return rows.map((item) => normalized(item._id, 'jobs', item.title, `${item.companyId?.name || 'Company'} · ${item.location || item.workMode}`, `/companies/jobs/${item._id}`, item.updatedAt, { company: item.companyId?.name, skills: item.skills }));
    });
    addProvider('internships', async () => {
      const internshipQuery = {
        companyId: { $in: approvedCompanyIds },
        status: 'open',
        $or: [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: new Date() } }],
        ...(q ? { $and: [{ $or: [{ title: rx }, { description: rx }, { skills: rx }, { location: rx }] }] } : {}),
      };
      if (req.query.workMode) internshipQuery.workMode = req.query.workMode;
      if (req.query.skill) internshipQuery.skills = new RegExp(escapeRx(req.query.skill), 'i');
      if (req.query.city) internshipQuery.location = new RegExp(escapeRx(req.query.city), 'i');
      const rows = await Internship.find(internshipQuery).populate('companyId', 'name slug logo').sort('-createdAt').limit(limit).lean();
      return rows.map((item) => normalized(item._id, 'internships', item.title, `${item.companyId?.name || 'Company'} · ${item.duration || item.location}`, `/companies/internships/${item._id}`, item.updatedAt, { company: item.companyId?.name, skills: item.skills }));
    });
    addProvider('books', async () => {
      const filter = { status: 'active', ...(q ? { $or: [{ title: rx }, { author: rx }, { category: rx }, { tags: rx }] } : {}) };
      if (req.query.category) filter.category = req.query.category;
      if (req.query.author) filter.author = new RegExp(escapeRx(req.query.author), 'i');
      if (studentUserId && req.query.scope === 'workspace') {
        const bookIds = await LibraryProgress.find({ userId: studentUserId }).distinct('bookId');
        filter._id = { $in: bookIds };
      }
      const rows = await LibraryBook.find(filter).select('title author category coverUrl updatedAt').sort('-updatedAt').limit(limit).lean();
      return rows.map((item) => normalized(item._id, 'books', item.title, `${item.author || 'Unknown author'} · ${item.category || 'Book'}`, `/library/books/${item._id}`, item.updatedAt, { coverUrl: item.coverUrl }));
    });
    addProvider('courses', async () => {
      const rows = await Course.find({
        institutionId: { $in: approvedInstitutionIds },
        status: 'active',
        ...(q ? { $or: [{ title: rx }, { description: rx }, { skills: rx }, { careerPaths: rx }] } : {}),
      }).populate('institutionId', 'name slug').sort('-updatedAt').limit(limit).lean();
      return rows.map((item) => normalized(item._id, 'courses', item.title, item.institutionId?.name || item.level, item.institutionId?.slug ? `/institutions/${item.institutionId.slug}` : '/search?type=courses', item.updatedAt, { skills: item.skills }));
    });

    if (studentUserId) {
      addProvider('goals', async () => {
        const rows = await Goal.find({ userId: studentUserId, ...(q ? { $or: [{ title: rx }, { description: rx }, { category: rx }] } : {}) }).select('title description category status progress updatedAt').sort('-updatedAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'goals', item.title, `${item.category || 'Goal'} · ${item.status || 'active'}`, `/student/goals?goalId=${item._id}`, item.updatedAt, { status: item.status, progress: item.progress }));
      });
      addProvider('tasks', async () => {
        const rows = await Task.find({ userId: studentUserId, status: { $ne: 'archived' }, ...(q ? { $or: [{ title: rx }, { description: rx }, { category: rx }, { tags: rx }] } : {}) }).select('title description category status priority dueDate updatedAt').sort('-updatedAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'tasks', item.title, `${item.category || 'Task'} · ${item.status}`, `/student/tasks?taskId=${item._id}`, item.updatedAt, { status: item.status, priority: item.priority, dueDate: item.dueDate }));
      });
      addProvider('roadmaps', async () => {
        const rows = await Roadmap.find({ userId: studentUserId }).populate('goalId', 'title description').sort('-updatedAt').limit(limit * 2).lean();
        return rows.filter((item) => !q || rx.test(item.goalId?.title || '') || rx.test(item.status || '') || item.learningStages?.some((stage) => rx.test(stage.title))).slice(0, limit).map((item) => normalized(item._id, 'roadmaps', item.goalId?.title ? `${item.goalId.title} Roadmap` : 'Learning Roadmap', `${item.status} · ${item.progress?.percent || 0}%`, `/student/roadmap?goalId=${item.goalId?._id || ''}`, item.updatedAt, { status: item.status, progress: item.progress?.percent || 0 }));
      });
      addProvider('reports', async () => {
        const rows = await Report.find({ user: studentUserId, ...(q ? { goal: rx } : {}) }).select('goal createdAt').sort('-createdAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'reports', item.goal, 'Research & development report', '/student/reports', item.createdAt));
      });
      addProvider('notifications', async () => {
        const rows = await Notification.find({ userId: studentUserId, archivedAt: null, ...(q ? { $or: [{ title: rx }, { body: rx }, { type: rx }] } : {}) }).select('title body type priority read link createdAt').sort({ pinnedAt: -1, createdAt: -1 }).limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'notifications', item.title, item.body || item.type, item.link || '/notifications', item.createdAt, { type: item.type, priority: item.priority, read: item.read }));
      });
      addProvider('certificates', async () => {
        const profile = await StudentProfile.findOne({ userId: studentUserId }).select('credentials').lean();
        return (profile?.credentials || []).filter((item) => !q || rx.test(item.title) || rx.test(item.issuer) || rx.test(item.category)).slice(0, limit).map((item) => normalized(item._id, 'certificates', item.title, `${item.issuer} · ${item.verificationStatus}`, '/student/certificates', item.updatedAt || item.issuedAt, { verificationStatus: item.verificationStatus }));
      });
      addProvider('profile', async () => {
        const profile = await StudentProfile.findOne({ userId: studentUserId }).select('displayName headline bio username skills updatedAt').lean();
        if (!profile) return [];
        const searchable = `${profile.displayName} ${profile.headline} ${profile.bio} ${(profile.skills || []).map((item) => item.name).join(' ')}`;
        return !q || rx.test(searchable) ? [normalized(profile._id, 'profile', profile.displayName || 'Student Profile', profile.headline || 'Your digital identity', '/student/profile', profile.updatedAt, { username: profile.username })] : [];
      });
      addProvider('support', async () => {
        const supportTerms = 'support help account settings notification preferences contact';
        return !q || rx.test(supportTerms)
          ? [normalized('dream-wave-support', 'support', 'Dream Wave Support', 'Account help, preferences and support resources', '/student/settings', new Date(0))]
          : [];
      });
      addProvider('resumes', async () => {
        const rows = await Resume.find({ userId: studentUserId, status: { $ne: 'archived' }, ...(q ? { $or: [{ title: rx }, { 'personal.headline': rx }, { 'skills.name': rx }] } : {}) }).select('title personal.headline updatedAt').sort('-updatedAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'resumes', item.title, item.personal?.headline || 'Professional resume', `/student/career/resume?resumeId=${item._id}`, item.updatedAt));
      });
      addProvider('conversations', async () => {
        const chats = await Chat.find({ userId: studentUserId }).select('session messages updatedAt').sort('-updatedAt').limit(limit * 2).lean();
        const rows = []
        chats.forEach((chat) => {
          const lastUser = [...(chat.messages || [])].reverse().find((item) => item.role === 'user')
          const lastAssistant = [...(chat.messages || [])].reverse().find((item) => item.role === 'assistant')
          const searchable = `${chat.session} ${(chat.messages || []).map((item) => item.content).join(' ')}`
          if (!q || rx.test(searchable)) {
            rows.push(normalized(
              chat._id,
              'conversations',
              lastUser?.content?.slice(0, 80) || `Mentor: ${chat.session}`,
              lastAssistant?.content?.slice(0, 100) || chat.session,
              '/student/mentor',
              chat.updatedAt,
              { session: chat.session },
            ))
          }
        })
        return rows.slice(0, limit)
      });
      addProvider('posts', async () => {
        const followingIds = await communityService.getFollowingIds(studentUserId);
        const filter = {
          ...communityService.visibilityFilter(studentUserId, followingIds),
          ...(q ? { $or: [{ content: rx }, { topics: rx }, { skills: rx }] } : {}),
        };
        const rows = await Post.find(filter).select('content postType topics skills userId updatedAt').sort('-createdAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'posts', item.content.slice(0, 80), item.postType || 'Post', '/student/community', item.updatedAt, { topics: item.topics, skills: item.skills }));
      });
      addProvider('projects', async () => {
        const profile = await StudentProfile.find({
          'privacy.visibility': 'public',
          ...(q ? { $or: [{ displayName: rx }, { 'projects.title': rx }, { 'projects.technologies': rx }] } : {}),
        }).select('username displayName projects updatedAt').limit(limit).lean();
        const rows = [];
        profile.forEach((item) => {
          (item.projects || []).filter((project) => project.visibility === 'public').forEach((project) => {
            if (!q || rx.test(project.title) || rx.test(project.description) || (project.technologies || []).some((tech) => rx.test(tech))) {
              rows.push(normalized(project._id, 'projects', project.title, item.displayName || 'Student project', `/student/community?tab=projects`, project.updatedAt || item.updatedAt, { owner: item.username }));
            }
          });
        });
        return rows.slice(0, limit);
      });
      addProvider('groups', async () => {
        const rows = await LearningGroup.find({
          status: 'active',
          visibility: 'PUBLIC',
          ...(q ? { $or: [{ name: rx }, { description: rx }, { topic: rx }, { skills: rx }] } : {}),
        }).select('name description topic memberCount updatedAt').sort('-updatedAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'groups', item.name, item.topic || 'Learning group', '/student/community?tab=groups', item.updatedAt, { memberCount: item.memberCount }));
      });
      addProvider('students', async () => {
        const result = await communityService.discoverStudents({ viewerId: studentUserId, q, limit });
        return (result.students || []).map((item) => normalized(item.userId, 'students', item.displayName, item.headline || `@${item.username}`, `/students/${item.username}`, new Date(), { skills: item.publicSkills }));
      });
      addProvider('career', async () => {
        const [applications, aiProfile] = await Promise.all([
          Application.find({ studentId: studentUserId, ...(q ? { $or: [{ notes: rx }, { status: rx }] } : {}) }).sort('-updatedAt').limit(limit).lean(),
          require('../models/UserProfile').findOne({ userId: studentUserId }).select('targetRole currentRole careerPreferences').lean(),
        ])
        const rows = applications.map((item) => normalized(
          item._id,
          'career',
          `${item.targetType === 'internship' ? 'Internship' : 'Job'} application`,
          item.status,
          '/student/career/applications',
          item.updatedAt,
          { targetType: item.targetType, status: item.status },
        ))
        if ((!q || rx.test(`${aiProfile?.targetRole || ''} ${aiProfile?.currentRole || ''}`)) && aiProfile?.targetRole) {
          rows.unshift(normalized(
            'career-target',
            'career',
            `Target role: ${aiProfile.targetRole}`,
            aiProfile.currentRole || 'Career preferences',
            '/student/intelligence',
            new Date(),
            { targetRole: aiProfile.targetRole },
          ))
        }
        return rows.slice(0, limit)
      });
      addProvider('subjects', async () => {
        const AcademicSubject = require('../models/AcademicSubject');
        const rows = await AcademicSubject.find({
          studentId: studentUserId,
          status: 'active',
          ...(q ? { $or: [{ name: rx }, { code: rx }, { description: rx }] } : {}),
        }).sort('-updatedAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'subjects', item.name, item.code || 'Subject', `/student/academics/subjects/${item._id}`, item.updatedAt));
      });
      addProvider('notes', async () => {
        const AcademicNote = require('../models/AcademicNote');
        const rows = await AcademicNote.find({
          studentId: studentUserId,
          ...(q ? { $or: [{ title: rx }, { content: rx }] } : {}),
        }).sort('-updatedAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'notes', item.title || 'Note', item.type, `/student/academics/subjects/${item.subjectId}`, item.updatedAt));
      });
      addProvider('assignments', async () => {
        const AcademicAssignment = require('../models/AcademicAssignment');
        const rows = await AcademicAssignment.find({
          studentId: studentUserId,
          status: { $ne: 'archived' },
          ...(q ? { $or: [{ title: rx }, { description: rx }] } : {}),
        }).sort('-updatedAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'assignments', item.title, item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString()}` : 'Assignment', `/student/academics/subjects/${item.subjectId}`, item.updatedAt));
      });
      addProvider('exams', async () => {
        const AcademicExam = require('../models/AcademicExam');
        const rows = await AcademicExam.find({
          studentId: studentUserId,
          ...(q ? { $or: [{ name: rx }] } : {}),
        }).sort('scheduledAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'exams', item.name, new Date(item.scheduledAt).toLocaleDateString(), `/student/academics/subjects/${item.subjectId}`, item.updatedAt));
      });
      addProvider('academics', async () => {
        const subjectRows = await require('../models/AcademicSubject').find({
          studentId: studentUserId,
          ...(q ? { name: rx } : {}),
        }).limit(Math.ceil(limit / 2)).lean();
        const noteRows = await require('../models/AcademicNote').find({
          studentId: studentUserId,
          ...(q ? { $or: [{ title: rx }, { content: rx }] } : {}),
        }).limit(Math.ceil(limit / 2)).lean();
        return [
          ...subjectRows.map((item) => normalized(item._id, 'academics', item.name, 'Subject', `/student/academics/subjects/${item._id}`, item.updatedAt)),
          ...noteRows.map((item) => normalized(item._id, 'academics', item.title || 'Note', 'Private note', `/student/academics/subjects/${item.subjectId}`, item.updatedAt)),
        ].slice(0, limit);
      });
      addProvider('research_projects', async () => {
        const ResearchProject = require('../models/ResearchProject');
        const rows = await ResearchProject.find({
          studentId: studentUserId,
          ...(q ? { $or: [{ title: rx }, { question: rx }, { description: rx }, { topics: rx }] } : {}),
        }).sort('-updatedAt').limit(limit).lean();
        return rows.map((item) => normalized(item._id, 'research_projects', item.title, item.question || 'Research project', `/student/research/${item._id}`, item.updatedAt, { status: item.status }));
      });
      addProvider('research', async () => {
        const ResearchProject = require('../models/ResearchProject');
        const ResearchNote = require('../models/ResearchNote');
        const projects = await ResearchProject.find({
          studentId: studentUserId,
          ...(q ? { $or: [{ title: rx }, { question: rx }] } : {}),
        }).limit(Math.ceil(limit / 2)).lean();
        const notes = await ResearchNote.find({
          studentId: studentUserId,
          ...(q ? { $or: [{ title: rx }, { content: rx }] } : {}),
        }).limit(Math.ceil(limit / 2)).lean();
        return [
          ...projects.map((item) => normalized(item._id, 'research', item.title, 'Research project', `/student/research/${item._id}`, item.updatedAt)),
          ...notes.map((item) => normalized(item._id, 'research', item.title || 'Research note', 'Private note', `/student/research/${item.projectId}`, item.updatedAt)),
        ].slice(0, limit);
      });
    }

    const settled = await Promise.allSettled(providers.map((provider) => provider.execute()));
    const items = [];
    const errors = {};
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') items.push(...result.value);
      else errors[providers[index].type] = 'Search source temporarily unavailable';
    });
    items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    const deduped = [...new Map(items.map((item) => [`${item.entityType}:${item.id}`, item])).values()].slice(0, limit);
    const facets = deduped.reduce((result, item) => ({ ...result, [item.entityType]: (result[item.entityType] || 0) + 1 }), {});
    const history = studentUserId
      ? await SearchIndex.find({ userId: studentUserId, scope: 'workspace', query: { $ne: '(filters)' } }).select('query createdAt').sort('-createdAt').limit(20).lean()
      : [];
    const recent = [...new Map(history.map((item) => [item.query.toLowerCase(), item.query])).values()].slice(0, 8);
    const suggestions = [...new Set([
      ...recent.filter((item) => !q || item.toLowerCase().includes(q.toLowerCase())),
      ...deduped.map((item) => item.title).filter((item) => !q || item.toLowerCase().includes(q.toLowerCase())),
    ])].slice(0, 8);

    if (q && studentUserId) {
      SearchIndex.create({
        query: q,
        userId: studentUserId,
        filters: { types: [...typeSet] },
        resultCounts: facets,
        scope: 'workspace',
        day: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
    }
    return res.json({
      success: true,
      data: { items: deduped, facets, suggestions, recent, errors },
      meta: { query: q, types: [...typeSet], count: deduped.length, partial: Object.keys(errors).length > 0 },
    });
  } catch (error) {
    return res.status(500).json({ success: false, code: 'SEARCH_FAILED', message: 'Unified search is temporarily unavailable' });
  }
};

exports.clearSearchHistory = async (req, res) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ success: false, code: 'STUDENT_ONLY', message: 'Student search history only.' });
  }
  await SearchIndex.deleteMany({ userId: req.user._id, scope: 'workspace' });
  return res.json({ success: true, deleted: true });
};
