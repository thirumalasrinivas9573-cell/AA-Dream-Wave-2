const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Roadmap = require('../models/Roadmap');
const Report = require('../models/Report');
const User = require('../models/User');
const Post = require('../models/Post');
const Skill = require('../models/Skill');
const Habit = require('../models/Habit');
const StudyPlan = require('../models/StudyPlan');
const Document = require('../models/Document');
const Chat = require('../models/Chat');
const OrgMembership = require('../models/OrgMembership');
const OrgInvite = require('../models/OrgInvite');
const Organization = require('../models/Organization');
const Branch = require('../models/Branch');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const Semester = require('../models/Semester');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const ClassSection = require('../models/ClassSection');
const TimetableEntry = require('../models/TimetableEntry');
const AttendanceRecord = require('../models/AttendanceRecord');
const MediaItem = require('../models/MediaItem');
const mongoose = require('mongoose');

function toObjectId(userId) {
  if (userId instanceof mongoose.Types.ObjectId) return userId;
  return new mongoose.Types.ObjectId(String(userId));
}

exports.getUserStats = async (userId) => {
  const uid = toObjectId(userId);
  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const byDay = {};
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    byDay[d.toISOString().slice(0, 10)] = 0;
  }

  const [
    goalsActive,
    goalsCompleted,
    goalsTotal,
    goalAvg,
    topGoalDoc,
    tasksDone,
    tasksTotal,
    tasksOverdue,
    tasksCompletedThisWeek,
    weeklyAgg,
    roadmapAvg,
    roadmapsTotal,
    reports,
    skillsCount,
    skillAvg,
    habitsActive,
    studyPlans,
    documents,
  ] = await Promise.all([
    Goal.countDocuments({ user: uid, status: 'active' }),
    Goal.countDocuments({ user: uid, status: 'completed' }),
    Goal.countDocuments({ user: uid }),
    Goal.aggregate([
      { $match: { user: uid } },
      { $group: { _id: null, avg: { $avg: '$progress' } } },
    ]),
    Goal.findOne({ user: uid, status: 'active' }).select('title').sort({ updatedAt: -1 }).lean(),
    Task.countDocuments({ user: uid, status: 'done' }),
    Task.countDocuments({ user: uid }),
    Task.countDocuments({ user: uid, status: { $ne: 'done' }, dueDate: { $lt: now } }),
    Task.countDocuments({
      user: uid,
      status: 'done',
      completedAt: { $gte: weekAgo },
    }),
    Task.aggregate([
      {
        $match: {
          user: uid,
          status: 'done',
          completedAt: { $gte: weekAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Roadmap.aggregate([
      { $match: { user: uid } },
      { $group: { _id: null, avg: { $avg: '$progress' }, n: { $sum: 1 } } },
    ]),
    Roadmap.countDocuments({ user: uid }),
    Report.countDocuments({ user: uid }),
    Skill.countDocuments({ user: uid }),
    Skill.aggregate([
      { $match: { user: uid } },
      { $group: { _id: null, avg: { $avg: '$mastery' } } },
    ]),
    Habit.countDocuments({ user: uid, active: true }),
    StudyPlan.countDocuments({ user: uid }),
    Document.countDocuments({ user: uid }),
  ]);

  for (const row of weeklyAgg) {
    if (byDay[row._id] !== undefined) byDay[row._id] = row.count;
  }

  const tasksTodo = Math.max(0, tasksTotal - tasksDone);
  const avgGoalProgress = Math.round(goalAvg[0]?.avg || 0);
  const roadmapProgress = Math.round(roadmapAvg[0]?.avg || 0);
  const avgSkillMastery = Math.round(skillAvg[0]?.avg || 0);

  return {
    goalsActive,
    goalsCompleted,
    goalsTotal,
    tasksDone,
    tasksTodo,
    tasksOverdue,
    tasksTotal,
    avgGoalProgress,
    roadmapProgress,
    roadmapsTotal,
    reports,
    topGoal: topGoalDoc?.title,
    tasksCompletedThisWeek,
    weeklyActivity: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    skillsCount,
    avgSkillMastery,
    habitsActive,
    studyPlans,
    documents,
  };
};

exports.getAdminAnalytics = async () => {
  const Organization = require('../models/Organization');
  const AiUsage = require('../models/AiUsage');
  const since7 = new Date(Date.now() - 7 * 864e5);
  const [users, goals, tasks, posts, reports, documents, orgs, aiWeek, admins, proUsers, recentUsers] =
    await Promise.all([
      User.countDocuments(),
      Goal.countDocuments(),
      Task.countDocuments(),
      Post.countDocuments(),
      Report.countDocuments(),
      Document.countDocuments(),
      Organization.countDocuments(),
      AiUsage.countDocuments({ createdAt: { $gte: since7 } }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ plan: 'pro' }),
      User.find().sort({ createdAt: -1 }).limit(8).select('name email role plan createdAt').lean(),
    ]);
  return {
    users,
    admins,
    proUsers,
    organizations: orgs,
    goals,
    tasks,
    posts,
    reports,
    documents,
    aiRequests7d: aiWeek,
    recentUsers,
  };
};

/**
 * Institution overview aggregates (CTO-014).
 * Counts org-stamped resources; member activity capped at 100.
 */
exports.getOrgOverview = async (orgId) => {
  const orgFilter = { organizationId: orgId };

  const [
    organization,
    memberCount,
    adminCount,
    ownerCount,
    pendingInvites,
    goalsTotal,
    goalsCompleted,
    tasksTotal,
    tasksDone,
    documents,
    habitsActive,
    skills,
    studyPlans,
    roadmaps,
    chats,
    teacherCount,
    studentCount,
  ] = await Promise.all([
    Organization.findById(orgId).select('name slug plan owner createdAt type institutionKind').lean(),
    OrgMembership.countDocuments({ org: orgId }),
    OrgMembership.countDocuments({ org: orgId, role: 'admin' }),
    OrgMembership.countDocuments({ org: orgId, role: 'owner' }),
    OrgInvite.countDocuments({
      org: orgId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }),
    Goal.countDocuments(orgFilter),
    Goal.countDocuments({ ...orgFilter, status: 'completed' }),
    Task.countDocuments(orgFilter),
    Task.countDocuments({ ...orgFilter, status: 'done' }),
    Document.countDocuments(orgFilter),
    Habit.countDocuments({ ...orgFilter, active: true }),
    Skill.countDocuments(orgFilter),
    StudyPlan.countDocuments(orgFilter),
    Roadmap.countDocuments(orgFilter),
    Chat.countDocuments(orgFilter),
    OrgMembership.countDocuments({ org: orgId, memberKind: 'teacher' }),
    OrgMembership.countDocuments({ org: orgId, memberKind: 'student' }),
  ]);

  const memberships = await OrgMembership.find({ org: orgId })
    .populate('user', 'name email plan credits')
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  const userIds = memberships.map((m) => m.user?._id).filter(Boolean);

  const [goalByUser, taskByUser] = await Promise.all([
    Goal.aggregate([
      { $match: { organizationId: orgId, user: { $in: userIds } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { organizationId: orgId, user: { $in: userIds } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),
  ]);

  const goalMap = Object.fromEntries(goalByUser.map((r) => [String(r._id), r.count]));
  const taskMap = Object.fromEntries(taskByUser.map((r) => [String(r._id), r.count]));

  let creditsRemaining = 0;
  const memberActivity = memberships.map((m) => {
    const u = m.user;
    const credits = u?.credits ?? 0;
    creditsRemaining += credits;
    return {
      membershipId: m._id,
      role: m.role,
      memberKind: m.memberKind || 'staff',
      user: u
        ? {
            id: u._id,
            name: u.name,
            email: u.email,
            plan: u.plan,
            credits,
          }
        : null,
      goals: u ? goalMap[String(u._id)] || 0 : 0,
      tasks: u ? taskMap[String(u._id)] || 0 : 0,
      joinedAt: m.createdAt,
    };
  });

  return {
    organization: organization
      ? {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type || 'institution',
          institutionKind: organization.institutionKind || 'school',
          plan: organization.plan,
          owner: organization.owner,
          createdAt: organization.createdAt,
        }
      : null,
    membershipCounts: {
      total: memberCount,
      owners: ownerCount,
      admins: adminCount,
      members: Math.max(0, memberCount - ownerCount - adminCount),
      teachers: teacherCount,
      students: studentCount,
    },
    pendingInvites,
    totals: {
      goalsTotal,
      goalsCompleted,
      tasksTotal,
      tasksDone,
      documents,
      habitsActive,
      skills,
      studyPlans,
      roadmaps,
      chats,
      creditsRemaining,
    },
    memberActivity,
  };
};

/** Extended institution analytics for dashboard + AI reports. */
exports.getInstitutionAnalytics = async (orgId) => {
  const overview = await exports.getOrgOverview(orgId);
  const orgFilter = { organizationId: orgId };
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    branches,
    departments,
    academicYears,
    semesters,
    courses,
    subjects,
    classes,
    timetableEntries,
    attendanceTotal,
    attendanceWeek,
    attendanceByStatus,
    mediaItems,
    mediaStats,
  ] = await Promise.all([
    Branch.countDocuments({ ...orgFilter, active: { $ne: false } }),
    Department.countDocuments({ ...orgFilter, active: { $ne: false } }),
    AcademicYear.countDocuments({ ...orgFilter, active: { $ne: false } }),
    Semester.countDocuments({ ...orgFilter, active: { $ne: false } }),
    Course.countDocuments({ ...orgFilter, active: { $ne: false } }),
    Subject.countDocuments({ ...orgFilter, active: { $ne: false } }),
    ClassSection.countDocuments({ ...orgFilter, active: { $ne: false } }),
    TimetableEntry.countDocuments(orgFilter),
    AttendanceRecord.countDocuments(orgFilter),
    AttendanceRecord.countDocuments({ ...orgFilter, date: { $gte: weekAgo } }),
    AttendanceRecord.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    MediaItem.countDocuments(orgFilter),
    MediaItem.aggregate([
      { $match: { organizationId: orgId } },
      {
        $group: {
          _id: null,
          views: { $sum: '$views' },
          completions: { $sum: '$completions' },
          watchTimeSec: { $sum: '$totalWatchSec' },
          published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const byStatus = Object.fromEntries(attendanceByStatus.map((s) => [s._id, s.count]));
  const present = (byStatus.present || 0) + (byStatus.late || 0);
  const attendanceRate = attendanceTotal
    ? Math.round((present / attendanceTotal) * 100)
    : 0;
  const mediaAgg = mediaStats[0] || { views: 0, completions: 0, watchTimeSec: 0, published: 0 };

  return {
    ...overview,
    academic: {
      branches,
      departments,
      academicYears,
      semesters,
      courses,
      subjects,
      classes,
      timetableEntries,
      attendanceTotal,
      attendanceWeek,
      attendanceByStatus: byStatus,
      attendanceRate,
    },
    media: {
      items: mediaItems,
      published: mediaAgg.published,
      views: mediaAgg.views,
      completions: mediaAgg.completions,
      watchTimeSec: mediaAgg.watchTimeSec,
      completionRate: mediaAgg.views
        ? Math.round((mediaAgg.completions / mediaAgg.views) * 100)
        : 0,
    },
  };
};

/** Company hiring analytics for dashboard + charts. */
exports.getCompanyAnalytics = async (orgId) => {
  const Job = require('../models/Job');
  const JobApplication = require('../models/JobApplication');
  const overview = await exports.getOrgOverview(orgId);
  const orgFilter = { organizationId: orgId };
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    jobsTotal,
    jobsPublished,
    jobsDraft,
    jobsArchived,
    applicationsTotal,
    applicationsWeek,
    byStatus,
    byWorkMode,
    topJobs,
  ] = await Promise.all([
    Job.countDocuments(orgFilter),
    Job.countDocuments({ ...orgFilter, status: 'published' }),
    Job.countDocuments({ ...orgFilter, status: 'draft' }),
    Job.countDocuments({ ...orgFilter, status: 'archived' }),
    JobApplication.countDocuments(orgFilter),
    JobApplication.countDocuments({ ...orgFilter, createdAt: { $gte: weekAgo } }),
    JobApplication.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Job.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: '$workMode', count: { $sum: 1 } } },
    ]),
    Job.find(orgFilter)
      .sort({ applicationCount: -1 })
      .limit(5)
      .select('title status applicationCount workMode publishedAt')
      .lean(),
  ]);

  const applicationByStatus = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const hired = applicationByStatus.hired || 0;
  const shortlisted = applicationByStatus.shortlisted || 0;
  const interview = applicationByStatus.interview || 0;
  const hireRate = applicationsTotal ? Math.round((hired / applicationsTotal) * 100) : 0;

  return {
    ...overview,
    hiring: {
      jobsTotal,
      jobsPublished,
      jobsDraft,
      jobsArchived,
      applicationsTotal,
      applicationsWeek,
      applicationByStatus,
      jobsByWorkMode: Object.fromEntries(byWorkMode.map((s) => [s._id, s.count])),
      shortlisted,
      interview,
      hired,
      hireRate,
      topJobs,
      charts: {
        applicationsByStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
        jobsByWorkMode: byWorkMode.map((s) => ({ workMode: s._id, count: s.count })),
      },
    },
  };
};
