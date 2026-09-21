const express = require('express');
const ctrl = require('../controllers/productivityController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();
router.use(protect);

/* Smart workspace */
router.get('/workspace', ctrl.getWorkspace);
router.get('/dashboard', ctrl.getDashboard);
router.patch('/workspace', zodValidate(schemas.workspaceUpdate), ctrl.updateWorkspace);
router.put('/workspace/widgets', zodValidate(schemas.workspaceWidgets), ctrl.updateWidgets);
router.post('/workspace/widgets/reset', ctrl.resetWidgets);

/* Task engine extensions */
router.post('/tasks/prioritize', ctrl.prioritizeTasks);
router.post('/tasks/smart-schedule', zodValidate(schemas.smartSchedule), ctrl.smartSchedule);
router.post('/tasks/process-recurring', ctrl.processRecurring);
router.patch('/tasks/:id/progress', zodValidate(schemas.taskProgress), ctrl.taskProgress);
router.patch('/tasks/:id/dependencies', zodValidate(schemas.taskDependencies), ctrl.setDependencies);

/* Goal engine extensions */
router.get('/goals/analytics', ctrl.goalAnalytics);
router.get('/goals/categories', ctrl.goalCategories);

/* Calendar engine */
router.get('/calendar', ctrl.calendar);
router.get('/calendar/study', ctrl.studyCalendar);
router.get('/calendar/assignments', ctrl.assignmentCalendar);
router.get('/calendar/interviews', ctrl.interviewCalendar);
router.post('/reminders/events', zodValidate(schemas.reminderEvent), ctrl.createReminderEvent);
router.post('/reminders/process', ctrl.processReminders);

/* Notes engine */
router.get('/notes', ctrl.listNotes);
router.post('/notes', zodValidate(schemas.productivityNote), ctrl.createNote);
router.get('/notes/:id', ctrl.getNote);
router.put('/notes/:id', zodValidate(schemas.productivityNoteUpdate), ctrl.updateNote);
router.delete('/notes/:id', ctrl.removeNote);
router.post('/notes/:id/summarize', requireVerifiedEmail, ctrl.summarizeNote);

/* Focus engine */
router.get('/focus', ctrl.listFocus);
router.get('/focus/active', ctrl.activeFocus);
router.get('/focus/stats', ctrl.focusStats);
router.post('/focus/start', zodValidate(schemas.focusStart), ctrl.startFocus);
router.post('/focus/:id/pause', ctrl.pauseFocus);
router.post('/focus/:id/resume', ctrl.resumeFocus);
router.post('/focus/:id/complete', zodValidate(schemas.focusComplete), ctrl.completeFocus);
router.post('/focus/:id/abandon', ctrl.abandonFocus);

/* Analytics */
router.get('/analytics', ctrl.analytics);

/* AI productivity */
router.post('/ai/daily-plan', requireVerifiedEmail, ctrl.aiDailyPlan);
router.post('/ai/weekly-plan', requireVerifiedEmail, ctrl.aiWeeklyPlan);
router.post('/ai/schedule', requireVerifiedEmail, ctrl.aiScheduleSuggestions);
router.post('/ai/goals', requireVerifiedEmail, ctrl.aiGoalSuggestions);
router.post('/ai/time-optimize', requireVerifiedEmail, ctrl.aiTimeOptimization);

module.exports = router;
