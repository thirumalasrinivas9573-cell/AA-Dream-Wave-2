const express = require('express');
const ctrl = require('../controllers/collaborationController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { zodValidate } = require('../middleware/validate');
const { uploadFile } = require('../middleware/upload');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

router.get('/search', ctrl.search);
router.get('/analytics', ctrl.analytics);
router.get('/ai/mentors', ctrl.aiMentorRecommendations);
router.get('/ai/teams', ctrl.aiTeamRecommendations);

router.get('/communities', ctrl.listCommunities);
router.post('/communities', zodValidate(schemas.collabCommunityCreate), ctrl.createCommunity);
router.get('/communities/:id', ctrl.getCommunity);
router.patch('/communities/:id', zodValidate(schemas.collabCommunityUpdate), ctrl.updateCommunity);
router.post('/communities/:id/join', ctrl.joinCommunity);
router.post('/communities/:id/leave', ctrl.leaveCommunity);
router.get('/communities/:id/discussions', ctrl.listDiscussions);
router.post(
  '/communities/:id/discussions',
  zodValidate(schemas.collabDiscussionCreate),
  ctrl.createDiscussion
);
router.post(
  '/communities/:id/ai/topics',
  requireVerifiedEmail,
  ctrl.aiTopicSuggestions
);

router.get('/discussions/:discussionId', ctrl.getDiscussion);
router.post(
  '/discussions/:discussionId/replies',
  zodValidate(schemas.collabDiscussionReply),
  ctrl.replyDiscussion
);
router.post(
  '/discussions/:discussionId/react',
  zodValidate(schemas.collabReact),
  ctrl.reactDiscussion
);
router.post('/discussions/:discussionId/pin', ctrl.pinDiscussion);
router.post('/discussions/:discussionId/bookmark', ctrl.bookmarkDiscussion);
router.post(
  '/discussions/:discussionId/ai/summary',
  requireVerifiedEmail,
  ctrl.aiSummarizeDiscussion
);

router.get('/teams', ctrl.listTeams);
router.post('/teams', zodValidate(schemas.collabTeamCreate), ctrl.createTeam);
router.get('/teams/:teamId', ctrl.getTeam);
router.post('/teams/:teamId/members', zodValidate(schemas.collabMemberAdd), ctrl.addTeamMember);
router.patch(
  '/teams/:teamId/workspace',
  zodValidate(schemas.collabTeamWorkspace),
  ctrl.updateTeamWorkspace
);
router.post('/teams/:teamId/share-task', zodValidate(schemas.collabShareTask), ctrl.shareTaskToTeam);
router.post(
  '/teams/:teamId/share-roadmap',
  zodValidate(schemas.collabShareRoadmap),
  ctrl.shareRoadmapToTeam
);

router.get('/projects', ctrl.listProjects);
router.post('/projects', zodValidate(schemas.collabProjectCreate), ctrl.createProject);
router.get('/projects/:projectId', ctrl.getProject);
router.post(
  '/projects/:projectId/members',
  zodValidate(schemas.collabMemberAdd),
  ctrl.addProjectMember
);
router.post(
  '/projects/:projectId/milestones',
  zodValidate(schemas.collabMilestone),
  ctrl.addMilestone
);
router.post('/projects/:projectId/milestones/:milestoneId/toggle', ctrl.toggleMilestone);
router.post(
  '/projects/:projectId/files',
  uploadFile.single('file'),
  ctrl.uploadProjectFile
);
router.get('/projects/:projectId/activity', ctrl.projectActivity);

router.get('/conversations', ctrl.listConversations);
router.post('/conversations', zodValidate(schemas.collabConversationCreate), ctrl.createConversation);
router.get('/conversations/:conversationId/messages', ctrl.listMessages);
router.post(
  '/conversations/:conversationId/messages',
  uploadFile.single('file'),
  ctrl.sendMessage
);

router.get('/mentors', ctrl.listMentors);
router.put('/mentors/me', zodValidate(schemas.collabMentorProfile), ctrl.upsertMentorProfile);
router.post('/mentors/book', zodValidate(schemas.collabMentorBook), ctrl.bookMentor);
router.get('/mentors/bookings', ctrl.listBookings);
router.patch(
  '/mentors/bookings/:bookingId',
  zodValidate(schemas.collabBookingStatus),
  ctrl.updateBookingStatus
);
router.post(
  '/mentors/bookings/:bookingId/rate',
  zodValidate(schemas.collabMentorRate),
  ctrl.rateMentorSession
);

module.exports = router;
