const Community = require('../models/Community');
const Discussion = require('../models/Discussion');
const CollabTeam = require('../models/CollabTeam');
const CollabProject = require('../models/CollabProject');
const CollabConversation = require('../models/CollabConversation');
const CollabMessage = require('../models/CollabMessage');
const MentorProfile = require('../models/MentorProfile');
const MentorBooking = require('../models/MentorBooking');
const Task = require('../models/Task');
const Roadmap = require('../models/Roadmap');
const collab = require('../services/collaborationService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { toAssetUrl } = require('../utils/assetUrl');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { assertCanUseAi, consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');
const { auditFromRequest } = require('../utils/audit');

async function loadCommunityOrThrow(user, id) {
  const community = await Community.findById(id);
  if (!community || community.isArchived) throw new AppError('Community not found', 404);
  if (!collab.canAccessCommunity(community, user)) throw new AppError('Forbidden', 403);
  return community;
}

/* ─── Communities ─── */

exports.listCommunities = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { isArchived: false };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 120) };

  const or = [
    { type: 'public' },
    { type: { $in: ['course', 'subject'] }, organizationId: null },
    { 'members.user': req.user._id },
  ];
  if (req.user.organizationId) {
    or.push({
      type: { $in: ['institution', 'company', 'course', 'subject'] },
      organizationId: req.user.organizationId,
    });
  }
  filter.$and = [{ $or: or }];

  const [communities, total] = await Promise.all([
    Community.find(filter).sort({ memberCount: -1, updatedAt: -1 }).skip(skip).limit(limit),
    Community.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { communities, pagination: paginationMeta(page, limit, total) },
  });
});

exports.createCommunity = asyncHandler(async (req, res) => {
  const type = req.body.type || 'public';
  if (['institution', 'company'].includes(type) && !req.user.organizationId) {
    throw new AppError('Organization required for this community type', 400);
  }
  const stamp = collab.orgStamp(req.user);
  const slug = await collab.uniqueSlug(req.body.slug || req.body.name);
  const community = await Community.create({
    name: req.body.name,
    slug,
    description: req.body.description || '',
    type,
    organizationId: stamp.organizationId || null,
    createdBy: req.user._id,
    course: req.body.course || '',
    subject: req.body.subject || '',
    tags: req.body.tags || [],
    members: [{ user: req.user._id, role: 'owner' }],
    memberCount: 1,
  });
  await auditFromRequest(req, {
    action: 'collab.community.create',
    resource: 'Community',
    resourceId: community._id,
  });
  res.status(201).json({ success: true, data: { community } });
});

exports.getCommunity = asyncHandler(async (req, res) => {
  const community = await loadCommunityOrThrow(req.user, req.params.id);
  res.json({ success: true, data: { community } });
});

exports.updateCommunity = asyncHandler(async (req, res) => {
  const community = await loadCommunityOrThrow(req.user, req.params.id);
  if (!collab.canModerate(community, req.user)) throw new AppError('Forbidden', 403);
  for (const f of ['name', 'description', 'course', 'subject', 'tags', 'coverUrl']) {
    if (req.body[f] !== undefined) community[f] = req.body[f];
  }
  await community.save();
  res.json({ success: true, data: { community } });
});

exports.joinCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community || community.isArchived) throw new AppError('Community not found', 404);
  if (community.type === 'private' && !collab.isMember(community, req.user._id)) {
    throw new AppError('Invite required for private community', 403);
  }
  if (!collab.canAccessCommunity(community, req.user) && community.type === 'private') {
    throw new AppError('Forbidden', 403);
  }
  if (
    ['institution', 'company'].includes(community.type) &&
    (!req.user.organizationId ||
      String(req.user.organizationId) !== String(community.organizationId || ''))
  ) {
    throw new AppError('Organization membership required', 403);
  }
  if (!collab.isMember(community, req.user._id)) {
    community.members.push({ user: req.user._id, role: 'member' });
    community.memberCount = community.members.length;
    await community.save();
    await collab.notifyUsers([community.createdBy], {
      title: 'New community member',
      message: `${req.user.name || 'Someone'} joined ${community.name}`,
      type: 'community',
      link: `/community/${community._id}`,
    });
  }
  res.json({ success: true, data: { community } });
});

exports.leaveCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community) throw new AppError('Community not found', 404);
  const role = collab.memberRole(community, req.user._id);
  if (role === 'owner') throw new AppError('Owner cannot leave; transfer ownership first', 400);
  community.members = community.members.filter((m) => String(m.user) !== String(req.user._id));
  community.memberCount = community.members.length;
  await community.save();
  res.json({ success: true, data: { community } });
});

/* ─── Discussions ─── */

exports.listDiscussions = asyncHandler(async (req, res) => {
  const community = await loadCommunityOrThrow(req.user, req.params.id);
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { community: community._id };
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 120) };
  const [discussions, total] = await Promise.all([
    Discussion.find(filter)
      .populate('author', 'name profileImage aaid')
      .sort({ pinned: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Discussion.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { discussions, pagination: paginationMeta(page, limit, total) },
  });
});

exports.createDiscussion = asyncHandler(async (req, res) => {
  const community = await loadCommunityOrThrow(req.user, req.params.id);
  if (!collab.isMember(community, req.user._id) && community.type !== 'public') {
    throw new AppError('Join the community to post', 403);
  }
  const mentions = await collab.resolveMentions(req.body.body, req.body.mentions);
  const discussion = await Discussion.create({
    community: community._id,
    organizationId: community.organizationId || collab.orgStamp(req.user).organizationId || null,
    author: req.user._id,
    title: req.body.title,
    body: req.body.body,
    tags: req.body.tags || [],
    mentions,
  });
  community.discussionCount = (community.discussionCount || 0) + 1;
  await community.save();
  await collab.notifyUsers(
    mentions.filter((id) => String(id) !== String(req.user._id)),
    {
      title: 'You were mentioned',
      message: `In discussion: ${discussion.title}`,
      type: 'mention',
      link: `/community/discussions/${discussion._id}`,
    }
  );
  await discussion.populate('author', 'name profileImage aaid');
  res.status(201).json({ success: true, data: { discussion } });
});

exports.getDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.discussionId)
    .populate('author', 'name profileImage aaid')
    .populate('replies.user', 'name profileImage aaid');
  if (!discussion) throw new AppError('Discussion not found', 404);
  await loadCommunityOrThrow(req.user, discussion.community);
  const related = await collab.relatedDiscussions(discussion);
  res.json({ success: true, data: { discussion, related } });
});

exports.replyDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.discussionId);
  if (!discussion) throw new AppError('Discussion not found', 404);
  const community = await loadCommunityOrThrow(req.user, discussion.community);
  const mentions = await collab.resolveMentions(req.body.body, req.body.mentions);
  discussion.replies.push({
    user: req.user._id,
    body: req.body.body,
    mentions,
    parentReply: req.body.parentReplyId || null,
  });
  discussion.replyCount = discussion.replies.length;
  await discussion.save();
  await collab.notifyUsers(
    [
      String(discussion.author),
      ...mentions,
    ].filter((id) => String(id) !== String(req.user._id)),
    {
      title: 'New reply',
      message: `${req.user.name || 'Someone'} replied in ${discussion.title}`,
      type: 'community',
      link: `/community/discussions/${discussion._id}`,
    }
  );
  await discussion.populate('author', 'name profileImage aaid');
  await discussion.populate('replies.user', 'name profileImage aaid');
  res.status(201).json({ success: true, data: { discussion } });
});

exports.reactDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.discussionId);
  if (!discussion) throw new AppError('Discussion not found', 404);
  await loadCommunityOrThrow(req.user, discussion.community);
  const emoji = req.body.emoji || '👍';
  const idx = discussion.reactions.findIndex(
    (r) => String(r.user) === String(req.user._id) && r.emoji === emoji
  );
  if (idx >= 0) discussion.reactions.splice(idx, 1);
  else discussion.reactions.push({ user: req.user._id, emoji });
  await discussion.save();
  res.json({ success: true, data: { discussion } });
});

exports.pinDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.discussionId);
  if (!discussion) throw new AppError('Discussion not found', 404);
  const community = await loadCommunityOrThrow(req.user, discussion.community);
  if (!collab.canModerate(community, req.user)) throw new AppError('Forbidden', 403);
  discussion.pinned = !discussion.pinned;
  await discussion.save();
  res.json({ success: true, data: { discussion } });
});

exports.bookmarkDiscussion = asyncHandler(async (req, res) => {
  const discussion = await Discussion.findById(req.params.discussionId);
  if (!discussion) throw new AppError('Discussion not found', 404);
  await loadCommunityOrThrow(req.user, discussion.community);
  const idx = discussion.bookmarkedBy.findIndex((id) => String(id) === String(req.user._id));
  if (idx >= 0) discussion.bookmarkedBy.splice(idx, 1);
  else discussion.bookmarkedBy.push(req.user._id);
  await discussion.save();
  res.json({ success: true, data: { bookmarked: idx < 0, discussion } });
});

exports.aiSummarizeDiscussion = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const discussion = await Discussion.findById(req.params.discussionId);
  if (!discussion) throw new AppError('Discussion not found', 404);
  await loadCommunityOrThrow(req.user, discussion.community);
  discussion.aiSummary = await collab.summarizeDiscussion(discussion);
  await discussion.save();
  res.json({ success: true, data: { summary: discussion.aiSummary, discussion } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.aiTopicSuggestions = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
  const community = await loadCommunityOrThrow(req.user, req.params.id);
  const suggestions = await collab.suggestTopics(community);
  res.json({ success: true, data: { suggestions } });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

/* ─── Teams ─── */

exports.listTeams = asyncHandler(async (req, res) => {
  const filter = {
    status: 'active',
    $or: [{ 'members.user': req.user._id }],
  };
  if (req.user.organizationId) {
    filter.$or.push({ organizationId: req.user.organizationId });
  }
  const teams = await CollabTeam.find(filter).sort({ updatedAt: -1 }).limit(50);
  res.json({ success: true, data: { teams } });
});

exports.createTeam = asyncHandler(async (req, res) => {
  const stamp = collab.orgStamp(req.user);
  const team = await CollabTeam.create({
    name: req.body.name,
    description: req.body.description || '',
    organizationId: stamp.organizationId || null,
    createdBy: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
    community: req.body.communityId || null,
    tags: req.body.tags || [],
  });
  res.status(201).json({ success: true, data: { team } });
});

exports.getTeam = asyncHandler(async (req, res) => {
  const team = await CollabTeam.findById(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  if (!collab.isTeamMember(team, req.user._id) && req.user.role !== 'admin') {
    throw new AppError('Forbidden', 403);
  }
  res.json({ success: true, data: { team } });
});

exports.addTeamMember = asyncHandler(async (req, res) => {
  const team = await CollabTeam.findById(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  const me = team.members.find((m) => String(m.user) === String(req.user._id));
  if (!me || (me.role !== 'owner' && me.role !== 'lead')) throw new AppError('Forbidden', 403);
  if (!collab.isTeamMember(team, req.body.userId)) {
    team.members.push({ user: req.body.userId, role: req.body.role || 'member' });
    await team.save();
    await collab.notifyUsers([req.body.userId], {
      title: 'Added to team',
      message: `You joined team ${team.name}`,
      type: 'team',
      link: `/teams/${team._id}`,
    });
  }
  res.json({ success: true, data: { team } });
});

exports.updateTeamWorkspace = asyncHandler(async (req, res) => {
  const team = await CollabTeam.findById(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  if (!collab.isTeamMember(team, req.user._id)) throw new AppError('Forbidden', 403);
  if (req.body.sharedNotes !== undefined) team.sharedNotes = req.body.sharedNotes;
  if (req.body.sharedTaskIds) team.sharedTaskIds = req.body.sharedTaskIds;
  if (req.body.sharedRoadmapIds) team.sharedRoadmapIds = req.body.sharedRoadmapIds;
  await team.save();
  res.json({ success: true, data: { team } });
});

exports.shareTaskToTeam = asyncHandler(async (req, res) => {
  const team = await CollabTeam.findById(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  if (!collab.isTeamMember(team, req.user._id)) throw new AppError('Forbidden', 403);
  const task = await Task.findById(req.body.taskId);
  if (!task || String(task.user) !== String(req.user._id)) throw new AppError('Task not found', 404);
  if (!team.sharedTaskIds.some((id) => String(id) === String(task._id))) {
    team.sharedTaskIds.push(task._id);
    await team.save();
  }
  res.json({ success: true, data: { team } });
});

exports.shareRoadmapToTeam = asyncHandler(async (req, res) => {
  const team = await CollabTeam.findById(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  if (!collab.isTeamMember(team, req.user._id)) throw new AppError('Forbidden', 403);
  const roadmap = await Roadmap.findById(req.body.roadmapId);
  if (!roadmap || String(roadmap.user) !== String(req.user._id)) {
    throw new AppError('Roadmap not found', 404);
  }
  if (!team.sharedRoadmapIds.some((id) => String(id) === String(roadmap._id))) {
    team.sharedRoadmapIds.push(roadmap._id);
    await team.save();
  }
  res.json({ success: true, data: { team } });
});

/* ─── Projects ─── */

exports.listProjects = asyncHandler(async (req, res) => {
  const projects = await CollabProject.find({
    $or: [{ 'members.user': req.user._id }, { createdBy: req.user._id }],
  })
    .sort({ updatedAt: -1 })
    .limit(50);
  res.json({ success: true, data: { projects } });
});

exports.createProject = asyncHandler(async (req, res) => {
  const stamp = collab.orgStamp(req.user);
  const project = await CollabProject.create({
    title: req.body.title,
    description: req.body.description || '',
    organizationId: stamp.organizationId || null,
    createdBy: req.user._id,
    team: req.body.teamId || null,
    community: req.body.communityId || null,
    members: [{ user: req.user._id, role: 'owner' }],
    tags: req.body.tags || [],
    status: req.body.status || 'planning',
    activity: [{ user: req.user._id, action: 'created', detail: 'Project created' }],
  });
  res.status(201).json({ success: true, data: { project } });
});

exports.getProject = asyncHandler(async (req, res) => {
  const project = await CollabProject.findById(req.params.projectId);
  if (!project) throw new AppError('Project not found', 404);
  if (!collab.isProjectMember(project, req.user._id) && req.user.role !== 'admin') {
    throw new AppError('Forbidden', 403);
  }
  res.json({ success: true, data: { project } });
});

exports.addProjectMember = asyncHandler(async (req, res) => {
  const project = await CollabProject.findById(req.params.projectId);
  if (!project) throw new AppError('Project not found', 404);
  const me = project.members.find((m) => String(m.user) === String(req.user._id));
  if (!me || !['owner', 'lead'].includes(me.role)) throw new AppError('Forbidden', 403);
  if (!collab.isProjectMember(project, req.body.userId)) {
    project.members.push({ user: req.body.userId, role: req.body.role || 'contributor' });
    project.activity.push({
      user: req.user._id,
      action: 'member_added',
      detail: `Added member ${req.body.userId}`,
    });
    project.activity = project.activity.slice(-100);
    await project.save();
    await collab.notifyUsers([req.body.userId], {
      title: 'Added to project',
      message: `You joined project ${project.title}`,
      type: 'project',
      link: `/projects/${project._id}`,
    });
  }
  res.json({ success: true, data: { project } });
});

exports.addMilestone = asyncHandler(async (req, res) => {
  const project = await CollabProject.findById(req.params.projectId);
  if (!project) throw new AppError('Project not found', 404);
  if (!collab.isProjectMember(project, req.user._id)) throw new AppError('Forbidden', 403);
  project.milestones.push({
    title: req.body.title,
    description: req.body.description || '',
    dueDate: req.body.dueDate || null,
  });
  project.activity.push({ user: req.user._id, action: 'milestone_added', detail: req.body.title });
  project.activity = project.activity.slice(-100);
  await project.save();
  res.status(201).json({ success: true, data: { project } });
});

exports.toggleMilestone = asyncHandler(async (req, res) => {
  const project = await CollabProject.findById(req.params.projectId);
  if (!project) throw new AppError('Project not found', 404);
  if (!collab.isProjectMember(project, req.user._id)) throw new AppError('Forbidden', 403);
  const ms = project.milestones.id(req.params.milestoneId);
  if (!ms) throw new AppError('Milestone not found', 404);
  ms.completed = !ms.completed;
  ms.completedAt = ms.completed ? new Date() : null;
  const done = project.milestones.filter((m) => m.completed).length;
  project.progress = project.milestones.length
    ? Math.round((done / project.milestones.length) * 100)
    : project.progress;
  if (project.progress === 100) project.status = 'completed';
  project.activity.push({
    user: req.user._id,
    action: ms.completed ? 'milestone_done' : 'milestone_reopened',
    detail: ms.title,
  });
  project.activity = project.activity.slice(-100);
  await project.save();
  res.json({ success: true, data: { project } });
});

exports.uploadProjectFile = asyncHandler(async (req, res) => {
  const project = await CollabProject.findById(req.params.projectId);
  if (!project) throw new AppError('Project not found', 404);
  if (!collab.isProjectMember(project, req.user._id)) throw new AppError('Forbidden', 403);
  if (!req.file) throw new AppError('File is required', 400);
  project.files.push({
    name: req.file.originalname,
    url: toAssetUrl(req.file.filename),
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id,
  });
  project.activity.push({
    user: req.user._id,
    action: 'file_uploaded',
    detail: req.file.originalname,
  });
  project.activity = project.activity.slice(-100);
  await project.save();
  res.status(201).json({ success: true, data: { project } });
});

exports.projectActivity = asyncHandler(async (req, res) => {
  const project = await CollabProject.findById(req.params.projectId);
  if (!project) throw new AppError('Project not found', 404);
  if (!collab.isProjectMember(project, req.user._id)) throw new AppError('Forbidden', 403);
  res.json({ success: true, data: { activity: project.activity || [], progress: project.progress } });
});

/* ─── Messaging ─── */

exports.listConversations = asyncHandler(async (req, res) => {
  const conversations = await CollabConversation.find({ 'participants.user': req.user._id })
    .sort({ lastMessageAt: -1 })
    .limit(40)
    .populate('participants.user', 'name profileImage aaid');
  res.json({ success: true, data: { conversations } });
});

exports.createConversation = asyncHandler(async (req, res) => {
  const participantIds = [...new Set([String(req.user._id), ...(req.body.participantIds || []).map(String)])];
  if (participantIds.length < 2) throw new AppError('At least one other participant required', 400);
  const type = req.body.type || (participantIds.length === 2 ? 'direct' : 'group');

  if (type === 'direct' && participantIds.length === 2) {
    const existing = await CollabConversation.findOne({
      type: 'direct',
      'participants.user': { $all: participantIds },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    });
    if (existing) {
      return res.json({ success: true, data: { conversation: existing } });
    }
  }

  const stamp = collab.orgStamp(req.user);
  const conversation = await CollabConversation.create({
    type,
    title: req.body.title || '',
    organizationId: stamp.organizationId || null,
    participants: participantIds.map((id) => ({ user: id })),
    team: req.body.teamId || null,
    project: req.body.projectId || null,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { conversation } });
});

exports.listMessages = asyncHandler(async (req, res) => {
  const conversation = await CollabConversation.findById(req.params.conversationId);
  if (!conversation) throw new AppError('Conversation not found', 404);
  if (!conversation.participants.some((p) => String(p.user) === String(req.user._id))) {
    throw new AppError('Forbidden', 403);
  }
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const [messages, total] = await Promise.all([
    CollabMessage.find({ conversation: conversation._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name profileImage aaid'),
    CollabMessage.countDocuments({ conversation: conversation._id }),
  ]);
  res.json({
    success: true,
    data: {
      messages: messages.reverse(),
      pagination: paginationMeta(page, limit, total),
    },
  });
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const conversation = await CollabConversation.findById(req.params.conversationId);
  if (!conversation) throw new AppError('Conversation not found', 404);
  if (!conversation.participants.some((p) => String(p.user) === String(req.user._id))) {
    throw new AppError('Forbidden', 403);
  }
  const attachments = [];
  if (req.file) {
    const isImage = (req.file.mimetype || '').startsWith('image/');
    attachments.push({
      name: req.file.originalname,
      url: toAssetUrl(req.file.filename),
      mimeType: req.file.mimetype,
      kind: isImage ? 'image' : 'file',
    });
  }
  const body = String(req.body.body || '').trim();
  if (!body && !attachments.length) throw new AppError('Message body or file required', 400);
  const mentions = await collab.resolveMentions(body, req.body.mentions);
  const message = await CollabMessage.create({
    conversation: conversation._id,
    organizationId: conversation.organizationId,
    sender: req.user._id,
    body,
    attachments,
    mentions,
    readBy: [req.user._id],
  });
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = (body || attachments[0]?.name || '').slice(0, 240);
  await conversation.save();

  const recipients = conversation.participants
    .map((p) => String(p.user))
    .filter((id) => id !== String(req.user._id));
  await collab.notifyUsers(recipients, {
    title: 'New message',
    message: conversation.lastMessagePreview || 'New attachment',
    type: 'message',
    link: `/messages/${conversation._id}`,
  });
  if (mentions.length) {
    await collab.notifyUsers(
      mentions.filter((id) => String(id) !== String(req.user._id)),
      {
        title: 'You were mentioned in a message',
        message: body.slice(0, 120),
        type: 'mention',
        link: `/messages/${conversation._id}`,
      }
    );
  }
  await message.populate('sender', 'name profileImage aaid');
  res.status(201).json({ success: true, data: { message } });
});

/* ─── Mentors ─── */

exports.upsertMentorProfile = asyncHandler(async (req, res) => {
  const stamp = collab.orgStamp(req.user);
  const profile = await MentorProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        organizationId: stamp.organizationId || null,
        headline: req.body.headline || '',
        bio: req.body.bio || '',
        expertise: req.body.expertise || [],
        domains: req.body.domains || [],
        languages: req.body.languages || [],
        availability: req.body.availability || { acceptingBookings: true, slots: [], timezone: 'Asia/Kolkata' },
        isActive: req.body.isActive !== false,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, data: { profile } });
});

exports.listMentors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { isActive: true };
  if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 120) };
  if (req.query.expertise) filter.expertise = req.query.expertise;
  const [profiles, total] = await Promise.all([
    MentorProfile.find(filter)
      .populate('user', 'name profileImage aaid targetCareer')
      .sort({ ratingAvg: -1, sessionCount: -1 })
      .skip(skip)
      .limit(limit),
    MentorProfile.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { mentors: profiles, pagination: paginationMeta(page, limit, total) },
  });
});

exports.bookMentor = asyncHandler(async (req, res) => {
  const mentorProfile = await MentorProfile.findOne({ user: req.body.mentorId, isActive: true });
  if (!mentorProfile) throw new AppError('Mentor not found', 404);
  if (!mentorProfile.availability?.acceptingBookings) {
    throw new AppError('Mentor is not accepting bookings', 400);
  }
  if (String(req.body.mentorId) === String(req.user._id)) {
    throw new AppError('Cannot book yourself', 400);
  }
  const stamp = collab.orgStamp(req.user);
  const booking = await MentorBooking.create({
    mentor: req.body.mentorId,
    mentee: req.user._id,
    organizationId: stamp.organizationId || null,
    topic: req.body.topic,
    notes: req.body.notes || '',
    scheduledAt: req.body.scheduledAt,
    durationMin: req.body.durationMin || 30,
  });
  await collab.notifyUsers([req.body.mentorId], {
    title: 'Mentorship booking requested',
    message: `${req.user.name || 'A mentee'} requested: ${booking.topic}`,
    type: 'info',
    link: `/mentors/bookings/${booking._id}`,
  });
  res.status(201).json({ success: true, data: { booking } });
});

exports.listBookings = asyncHandler(async (req, res) => {
  const bookings = await MentorBooking.find({
    $or: [{ mentor: req.user._id }, { mentee: req.user._id }],
  })
    .sort({ scheduledAt: -1 })
    .limit(50);
  res.json({ success: true, data: { bookings } });
});

exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await MentorBooking.findById(req.params.bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  const isMentor = String(booking.mentor) === String(req.user._id);
  const isMentee = String(booking.mentee) === String(req.user._id);
  if (!isMentor && !isMentee) throw new AppError('Forbidden', 403);
  const status = req.body.status;
  if (!['confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }
  booking.status = status;
  if (req.body.sessionNotes !== undefined && isMentor) booking.sessionNotes = req.body.sessionNotes;
  await booking.save();
  if (status === 'completed') {
    await MentorProfile.findOneAndUpdate({ user: booking.mentor }, { $inc: { sessionCount: 1 } });
  }
  const other = isMentor ? booking.mentee : booking.mentor;
  await collab.notifyUsers([other], {
    title: 'Booking updated',
    message: `Session "${booking.topic}" is now ${status}`,
    type: 'info',
    link: `/mentors/bookings/${booking._id}`,
  });
  res.json({ success: true, data: { booking } });
});

exports.rateMentorSession = asyncHandler(async (req, res) => {
  const booking = await MentorBooking.findById(req.params.bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  if (String(booking.mentee) !== String(req.user._id)) throw new AppError('Forbidden', 403);
  if (booking.status !== 'completed') throw new AppError('Session must be completed to rate', 400);
  booking.rating = req.body.rating;
  booking.ratingComment = req.body.comment || '';
  await booking.save();

  const rated = await MentorBooking.find({
    mentor: booking.mentor,
    rating: { $ne: null },
  }).select('rating');
  const avg =
    rated.length === 0
      ? 0
      : Math.round((rated.reduce((s, b) => s + b.rating, 0) / rated.length) * 10) / 10;
  await MentorProfile.findOneAndUpdate(
    { user: booking.mentor },
    { $set: { ratingAvg: avg, ratingCount: rated.length } }
  );
  res.json({ success: true, data: { booking, ratingAvg: avg } });
});

/* ─── AI recommendations & search ─── */

exports.aiMentorRecommendations = asyncHandler(async (req, res) => {
  const mentors = await collab.recommendMentors(req.user);
  res.json({ success: true, data: { mentors } });
});

exports.aiTeamRecommendations = asyncHandler(async (req, res) => {
  const teams = await collab.recommendTeams(req.user);
  res.json({ success: true, data: { teams } });
});

exports.search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  const type = String(req.query.type || 'all');
  const results = { communities: [], discussions: [], projects: [], mentors: [], teams: [] };
  if (!q) return res.json({ success: true, data: { results, query: q } });

  const communityAccess = [
    { type: 'public' },
    { 'members.user': req.user._id },
    { createdBy: req.user._id },
  ];
  if (req.user.organizationId) {
    communityAccess.push({ organizationId: req.user.organizationId });
  }

  if (type === 'all' || type === 'community') {
    results.communities = await Community.find({
      $text: { $search: q },
      isArchived: false,
      $or: communityAccess,
    })
      .limit(10)
      .select('name slug type memberCount tags')
      .lean();
  }
  if (type === 'all' || type === 'discussion') {
    const discussions = await Discussion.find({ $text: { $search: q }, status: 'open' })
      .limit(20)
      .select('title tags community replyCount')
      .lean();
    const ids = discussions.map((d) => d.community).filter(Boolean);
    const allowed = await Community.find({
      _id: { $in: ids },
      $or: communityAccess,
    })
      .select('_id')
      .lean();
    const allowSet = new Set(allowed.map((c) => String(c._id)));
    results.discussions = discussions
      .filter((d) => allowSet.has(String(d.community)))
      .slice(0, 10);
  }
  if (type === 'all' || type === 'project') {
    results.projects = await CollabProject.find({
      $text: { $search: q },
      'members.user': req.user._id,
    })
      .limit(10)
      .select('title status progress tags')
      .lean();
  }
  if (type === 'all' || type === 'mentor') {
    results.mentors = await MentorProfile.find({ $text: { $search: q }, isActive: true })
      .limit(10)
      .populate('user', 'name profileImage')
      .lean();
  }
  if (type === 'all' || type === 'team') {
    results.teams = await CollabTeam.find({
      $text: { $search: q },
      $or: [
        { 'members.user': req.user._id },
        ...(req.user.organizationId ? [{ organizationId: req.user.organizationId }] : []),
      ],
    })
      .limit(10)
      .select('name description tags status')
      .lean();
  }
  res.json({ success: true, data: { results, query: q, type } });
});

exports.analytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [communitiesJoined, discussionsAuthored, teams, projects, messagesSent, bookings] =
    await Promise.all([
      Community.countDocuments({ 'members.user': userId }),
      Discussion.countDocuments({ author: userId }),
      CollabTeam.countDocuments({ 'members.user': userId, status: 'active' }),
      CollabProject.countDocuments({ 'members.user': userId }),
      CollabMessage.countDocuments({ sender: userId }),
      MentorBooking.countDocuments({ $or: [{ mentor: userId }, { mentee: userId }] }),
    ]);
  res.json({
    success: true,
    data: {
      analytics: {
        communitiesJoined,
        discussionsAuthored,
        teams,
        projects,
        messagesSent,
        bookings,
      },
    },
  });
});
