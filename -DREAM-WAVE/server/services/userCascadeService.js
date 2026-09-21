const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Chat = require('../models/Chat');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const { UserBook } = require('../models/Book');
const Roadmap = require('../models/Roadmap');
const Resume = require('../models/Resume');
const PlannerEvent = require('../models/PlannerEvent');
const Habit = require('../models/Habit');
const Skill = require('../models/Skill');
const StudyPlan = require('../models/StudyPlan');
const Quiz = require('../models/Quiz');
const Document = require('../models/Document');
const LearningProfile = require('../models/LearningProfile');
const MediaItem = require('../models/MediaItem');
const MediaProgress = require('../models/MediaProgress');
const AiPrompt = require('../models/AiPrompt');
const AiUsage = require('../models/AiUsage');
const OrgMembership = require('../models/OrgMembership');
const OrgInvite = require('../models/OrgInvite');
const JobApplication = require('../models/JobApplication');
const CompanyMessage = require('../models/CompanyMessage');
const ResearchProject = require('../models/ResearchProject');
const ResearchNote = require('../models/ResearchNote');
const ResearchHighlight = require('../models/ResearchHighlight');
const ResearchBookmark = require('../models/ResearchBookmark');
const ResearchCollection = require('../models/ResearchCollection');
const CareerProfile = require('../models/CareerProfile');
const InterviewSession = require('../models/InterviewSession');
const Community = require('../models/Community');
const Discussion = require('../models/Discussion');
const CollabTeam = require('../models/CollabTeam');
const CollabProject = require('../models/CollabProject');
const CollabConversation = require('../models/CollabConversation');
const CollabMessage = require('../models/CollabMessage');
const MentorProfile = require('../models/MentorProfile');
const MentorBooking = require('../models/MentorBooking');
const RecommendationEvent = require('../models/RecommendationEvent');
const AdaptiveProfile = require('../models/AdaptiveProfile');
const LearningProgress = require('../models/LearningProgress');
const Workspace = require('../models/Workspace');
const ProductivityNote = require('../models/ProductivityNote');
const FocusSession = require('../models/FocusSession');
const PersonalizationProfile = require('../models/PersonalizationProfile');
const PlatformEvent = require('../models/PlatformEvent');
const SecurityEvent = require('../models/SecurityEvent');
const AuditLog = require('../models/AuditLog');
const OrgNotification = require('../models/OrgNotification');
const Organization = require('../models/Organization');
const AttendanceRecord = require('../models/AttendanceRecord');
const ClassSection = require('../models/ClassSection');
const TimetableEntry = require('../models/TimetableEntry');
const Department = require('../models/Department');
const Job = require('../models/Job');
const { AppError } = require('../middleware/errorHandler');

/**
 * Shared user-data cascade used by settings account delete and admin user delete.
 * Preserves audit trails (actor anonymized). Blocks org-owner deletion.
 */
async function assertCanCascadeDeleteUser(uid) {
  const owned = await Organization.findOne({ owner: uid }).select('_id name slug').lean();
  if (owned) {
    throw new AppError(
      `Transfer or delete organization "${owned.name}" before deleting this account`,
      409,
      { failureClass: 'validation', code: 'ORG_OWNER_BLOCK' }
    );
  }
}

async function cascadeDeleteUserData(uid) {
  await assertCanCascadeDeleteUser(uid);

  const convos = await CollabConversation.find({ 'participants.user': uid }).select('_id participants').lean();
  const soloConvoIds = [];
  const sharedConvoIds = [];
  for (const c of convos) {
    const others = (c.participants || []).filter((p) => String(p.user) !== String(uid));
    if (others.length === 0) soloConvoIds.push(c._id);
    else sharedConvoIds.push(c._id);
  }

  const ownedCommunities = await Community.find({ createdBy: uid }).select('_id').lean();
  const ownedCommunityIds = ownedCommunities.map((c) => c._id);
  const ownedTeams = await CollabTeam.find({ createdBy: uid }).select('_id').lean();
  const ownedTeamIds = ownedTeams.map((t) => t._id);
  const ownedProjects = await CollabProject.find({ createdBy: uid }).select('_id').lean();
  const ownedProjectIds = ownedProjects.map((p) => p._id);

  await Promise.all([
    Goal.deleteMany({ user: uid }),
    Task.deleteMany({ user: uid }),
    Chat.deleteMany({ user: uid }),
    Post.deleteMany({ user: uid }),
    Report.deleteMany({ user: uid }),
    Notification.deleteMany({ user: uid }),
    UserBook.deleteMany({ user: uid }),
    Roadmap.deleteMany({ user: uid }),
    Resume.deleteMany({ user: uid }),
    PlannerEvent.deleteMany({ user: uid }),
    Habit.deleteMany({ user: uid }),
    Skill.deleteMany({ user: uid }),
    StudyPlan.deleteMany({ user: uid }),
    Quiz.deleteMany({ user: uid }),
    Document.deleteMany({ user: uid }),
    MediaProgress.deleteMany({ user: uid }),
    MediaItem.deleteMany({ uploadedBy: uid, scope: 'personal' }),
    AiPrompt.deleteMany({ user: uid }),
    AiUsage.deleteMany({ user: uid }),
    LearningProfile.deleteMany({ user: uid }),
    ResearchNote.deleteMany({ user: uid }),
    ResearchHighlight.deleteMany({ user: uid }),
    ResearchBookmark.deleteMany({ user: uid }),
    ResearchCollection.deleteMany({ user: uid }),
    ResearchProject.deleteMany({ user: uid }),
    CareerProfile.deleteMany({ user: uid }),
    InterviewSession.deleteMany({ user: uid }),
    MentorBooking.deleteMany({ $or: [{ mentor: uid }, { mentee: uid }] }),
    MentorProfile.deleteMany({ user: uid }),
    RecommendationEvent.deleteMany({ user: uid }),
    AdaptiveProfile.deleteMany({ user: uid }),
    LearningProgress.deleteMany({ user: uid }),
    Workspace.deleteMany({ user: uid }),
    ProductivityNote.deleteMany({ user: uid }),
    FocusSession.deleteMany({ user: uid }),
    PersonalizationProfile.deleteMany({ user: uid }),
    PlatformEvent.deleteMany({ user: uid }),
    SecurityEvent.deleteMany({ user: uid }),
    OrgMembership.deleteMany({ user: uid }),
    OrgInvite.deleteMany({ invitedBy: uid }),
    JobApplication.deleteMany({ applicant: uid }),
    CompanyMessage.deleteMany({ $or: [{ fromUser: uid }, { toUser: uid }] }),
    AttendanceRecord.deleteMany({ student: uid }),
  ]);

  await Promise.all([
    Community.updateMany({}, { $pull: { members: { user: uid } } }),
    CollabTeam.updateMany({}, { $pull: { members: { user: uid } } }),
    CollabProject.updateMany({}, { $pull: { members: { user: uid } } }),
    Discussion.updateMany({}, { $pull: { bookmarkedBy: uid } }),
    ClassSection.updateMany({}, { $pull: { students: uid, teachers: uid } }),
    ClassSection.updateMany({ classTeacher: uid }, { $set: { classTeacher: null } }),
    TimetableEntry.updateMany({ teacher: uid }, { $set: { teacher: null } }),
    Department.updateMany({ headTeacher: uid }, { $set: { headTeacher: null } }),
    Job.updateMany({ createdBy: uid }, { $set: { createdBy: null } }),
    OrgNotification.updateMany({ readBy: uid }, { $pull: { readBy: uid } }),
    AttendanceRecord.updateMany({ markedBy: uid }, { $set: { markedBy: null } }),
    AuditLog.updateMany({ actor: uid }, { $set: { actor: null } }),
  ]);

  if (soloConvoIds.length) {
    await CollabMessage.deleteMany({ conversation: { $in: soloConvoIds } });
    await CollabConversation.deleteMany({ _id: { $in: soloConvoIds } });
  }
  if (sharedConvoIds.length) {
    await CollabConversation.updateMany(
      { _id: { $in: sharedConvoIds } },
      { $pull: { participants: { user: uid } } }
    );
    await CollabMessage.deleteMany({ sender: uid, conversation: { $in: sharedConvoIds } });
  } else {
    await CollabMessage.deleteMany({ sender: uid });
  }

  if (ownedCommunityIds.length) {
    await Discussion.deleteMany({ community: { $in: ownedCommunityIds } });
    await Community.deleteMany({ _id: { $in: ownedCommunityIds } });
  } else {
    await Discussion.deleteMany({ author: uid });
  }

  if (ownedTeamIds.length) {
    await CollabTeam.deleteMany({ _id: { $in: ownedTeamIds } });
  }
  if (ownedProjectIds.length) {
    await CollabProject.deleteMany({ _id: { $in: ownedProjectIds } });
  }

  await Discussion.deleteMany({ author: uid });
}

/**
 * Bounded orphan sweep for docs whose user reference no longer exists.
 * Avoids loading the full User collection into memory.
 */
async function repairOrphanUserRefs({ limit = 200 } = {}) {
  const models = [
    { Model: Goal, field: 'user' },
    { Model: Task, field: 'user' },
    { Model: Chat, field: 'user' },
    { Model: Notification, field: 'user' },
    { Model: Document, field: 'user' },
    { Model: Habit, field: 'user' },
  ];
  const User = mongoose.model('User');
  const summary = {};
  for (const { Model, field } of models) {
    const docs = await Model.find({})
      .select(`_id ${field}`)
      .sort({ _id: 1 })
      .limit(limit)
      .lean();
    if (!docs.length) {
      summary[Model.modelName] = 0;
      continue;
    }
    const refIds = [...new Set(docs.map((d) => d[field]).filter(Boolean).map(String))];
    const existing = await User.find({ _id: { $in: refIds } }).select('_id').lean();
    const idSet = new Set(existing.map((u) => String(u._id)));
    const orphans = docs.filter((d) => d[field] && !idSet.has(String(d[field]))).map((d) => d._id);
    if (orphans.length) {
      const result = await Model.deleteMany({ _id: { $in: orphans } });
      summary[Model.modelName] = result.deletedCount || 0;
    } else {
      summary[Model.modelName] = 0;
    }
  }
  return summary;
}

module.exports = {
  cascadeDeleteUserData,
  assertCanCascadeDeleteUser,
  repairOrphanUserRefs,
};
