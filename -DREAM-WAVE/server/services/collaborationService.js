const Community = require('../models/Community');
const Discussion = require('../models/Discussion');
const CollabTeam = require('../models/CollabTeam');
const CollabProject = require('../models/CollabProject');
const MentorProfile = require('../models/MentorProfile');
const Notification = require('../models/Notification');
const User = require('../models/User');
const aiService = require('./aiService');
const { orgCreateStamp } = require('../utils/orgScope');
const logger = require('../utils/logger');

function slugify(name) {
  return String(name || 'community')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'community';
}

async function uniqueSlug(base) {
  let slug = slugify(base);
  let i = 0;
  while (await Community.exists({ slug: i ? `${slug}-${i}` : slug })) {
    i += 1;
    if (i > 50) {
      slug = `${slug}-${Date.now().toString(36)}`;
      break;
    }
  }
  return i ? `${slug}-${i}` : slug;
}

function isMember(community, userId) {
  return (community.members || []).some((m) => String(m.user) === String(userId));
}

function memberRole(community, userId) {
  const m = (community.members || []).find((x) => String(x.user) === String(userId));
  return m?.role || null;
}

function canAccessCommunity(community, user) {
  if (!community || community.isArchived) return false;
  if (user.role === 'admin') return true;
  if (isMember(community, user._id)) return true;
  if (community.type === 'public') return true;
  if (['course', 'subject'].includes(community.type) && !community.organizationId) return true;
  if (
    ['institution', 'company', 'course', 'subject'].includes(community.type) &&
    user.organizationId &&
    community.organizationId &&
    String(user.organizationId) === String(community.organizationId)
  ) {
    return true;
  }
  return false;
}

function canModerate(community, user) {
  if (user.role === 'admin') return true;
  const role = memberRole(community, user._id);
  return role === 'owner' || role === 'admin' || role === 'moderator';
}

function isTeamMember(team, userId) {
  return (team.members || []).some((m) => String(m.user) === String(userId));
}

function isProjectMember(project, userId) {
  return (project.members || []).some((m) => String(m.user) === String(userId));
}

async function notifyUsers(userIds, { title, message, type = 'info', link = '' }) {
  const unique = [...new Set(userIds.map(String).filter(Boolean))];
  if (!unique.length) return;
  try {
    await Notification.insertMany(
      unique.map((user) => ({
        user,
        title: String(title).slice(0, 200),
        message: String(message).slice(0, 1000),
        type: ['info', 'success', 'warning', 'task', 'goal', 'system', 'community', 'team', 'mention', 'project', 'message'].includes(
          type
        )
          ? type
          : 'info',
        link: String(link || '').slice(0, 300),
      }))
    );
  } catch (err) {
    logger.warn('collab notify failed', { error: err.message });
  }
}

async function resolveMentions(text = '', explicitIds = []) {
  const ids = [...(explicitIds || [])].map(String);
  const handles = String(text).match(/@([a-zA-Z0-9_.-]{2,40})/g) || [];
  if (handles.length) {
    const names = handles.map((h) => h.slice(1));
    const users = await User.find({
      $or: [{ name: { $in: names } }, { aaid: { $in: names } }],
    })
      .select('_id')
      .limit(20)
      .lean();
    for (const u of users) ids.push(String(u._id));
  }
  return [...new Set(ids)];
}

async function relatedDiscussions(discussion, limit = 5) {
  const tags = discussion.tags || [];
  const filter = {
    _id: { $ne: discussion._id },
    community: discussion.community,
    status: 'open',
  };
  if (tags.length) filter.tags = { $in: tags };
  let related = await Discussion.find(filter).sort({ updatedAt: -1 }).limit(limit).select('title tags replyCount').lean();
  if (related.length < limit) {
    const more = await Discussion.find({
      _id: { $nin: [discussion._id, ...related.map((r) => r._id)] },
      community: discussion.community,
    })
      .sort({ updatedAt: -1 })
      .limit(limit - related.length)
      .select('title tags replyCount')
      .lean();
    related = related.concat(more);
  }
  return related;
}

async function summarizeDiscussion(discussion) {
  const replyText = (discussion.replies || [])
    .slice(-12)
    .map((r) => `- ${r.body}`)
    .join('\n');
  const prompt = `Summarize this community discussion in 5 bullet points.\nTitle: ${discussion.title}\nBody: ${discussion.body}\nReplies:\n${replyText}`;
  const reply = (await aiService.runMode('community', [{ role: 'user', content: prompt }])).content;
  return reply;
}

async function suggestTopics(community) {
  const recent = await Discussion.find({ community: community._id })
    .sort({ createdAt: -1 })
    .limit(15)
    .select('title tags')
    .lean();
  const prompt = `Suggest 6 discussion topics for community "${community.name}" (${community.type}${
    community.subject ? `, subject ${community.subject}` : ''
  }). Recent: ${recent.map((r) => r.title).join('; ') || 'none'}. Return a markdown bullet list.`;
  return (await aiService.runMode('community', [{ role: 'user', content: prompt }])).content;
}

async function recommendMentors(user, { limit = 8 } = {}) {
  const interests = [user.targetCareer, ...(user.skills || [])].filter(Boolean).map(String);
  const profiles = await MentorProfile.find({ isActive: true, 'availability.acceptingBookings': true })
    .populate('user', 'name profileImage aaid targetCareer')
    .limit(40)
    .lean();
  const scored = profiles
    .filter((p) => String(p.user?._id || p.user) !== String(user._id))
    .map((p) => {
      let score = (p.ratingAvg || 0) * 10 + Math.min(20, p.sessionCount || 0);
      for (const e of p.expertise || []) {
        if (interests.some((i) => String(i).toLowerCase().includes(String(e).toLowerCase()))) score += 15;
      }
      return { ...p, matchScore: score };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
  return scored;
}

async function recommendTeams(user, { limit = 8 } = {}) {
  const teams = await CollabTeam.find({ status: 'active' }).sort({ updatedAt: -1 }).limit(40).lean();
  return teams
    .filter((t) => !isTeamMember(t, user._id))
    .filter((t) => {
      if (!t.organizationId) return true;
      return user.organizationId && String(t.organizationId) === String(user.organizationId);
    })
    .map((t) => ({
      ...t,
      matchScore: (t.members || []).length * 2 + (t.tags || []).length,
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

function orgStamp(user) {
  return orgCreateStamp(user);
}

module.exports = {
  uniqueSlug,
  slugify,
  isMember,
  memberRole,
  canAccessCommunity,
  canModerate,
  isTeamMember,
  isProjectMember,
  notifyUsers,
  resolveMentions,
  relatedDiscussions,
  summarizeDiscussion,
  suggestTopics,
  recommendMentors,
  recommendTeams,
  orgStamp,
};
