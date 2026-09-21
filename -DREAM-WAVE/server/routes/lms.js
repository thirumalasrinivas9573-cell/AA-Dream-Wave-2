const express = require('express');
const ctrl = require('../controllers/lmsController');
const { protect } = require('../middleware/auth');
const { requireVerifiedEmail } = require('../middleware/requireVerifiedEmail');
const { zodValidate } = require('../middleware/validate');
const schemas = require('../config/schemas');

const router = express.Router();

/* Public certificate verification */
router.get('/certificates/verify/:verificationId', ctrl.verifyCertificate);

router.use(protect);

router.get('/categories', ctrl.categories);
router.get('/enrollments/me', ctrl.myEnrollments);
router.get('/certificates/me', ctrl.listCertificates);
router.get('/analytics/institution', ctrl.institutionAnalytics);

router.get('/courses', zodValidate({ query: schemas.paginationQuery }), ctrl.listCourses);
router.post('/courses', zodValidate(schemas.lmsCourseCreate), ctrl.createCourse);
router.get('/courses/:courseId', ctrl.getCourse);
router.patch('/courses/:courseId', zodValidate(schemas.lmsCourseUpdate), ctrl.updateCourse);
router.post('/courses/:courseId/publish', ctrl.publishCourse);
router.post('/courses/:courseId/archive', ctrl.archiveCourse);
router.get('/courses/:courseId/curriculum', ctrl.getCurriculum);

router.post(
  '/courses/:courseId/modules',
  zodValidate(schemas.lmsModuleCreate),
  ctrl.createModule
);
router.patch('/courses/:courseId/modules/:moduleId', ctrl.updateModule);
router.post(
  '/courses/:courseId/modules/:moduleId/lessons',
  zodValidate(schemas.lmsLessonCreate),
  ctrl.createLesson
);
router.patch('/courses/:courseId/lessons/:lessonId', ctrl.updateLesson);
router.post(
  '/courses/:courseId/lessons/:lessonId/complete',
  zodValidate(schemas.lmsLessonComplete),
  ctrl.completeLesson
);

router.post('/courses/:courseId/enroll', zodValidate(schemas.lmsEnroll), ctrl.enroll);
router.get('/courses/:courseId/enrollments', ctrl.listEnrollments);
router.get('/courses/:courseId/progress', ctrl.getProgress);

router.post(
  '/courses/:courseId/assignments',
  zodValidate(schemas.lmsAssignmentCreate),
  ctrl.createAssignment
);
router.get('/courses/:courseId/assignments', ctrl.listAssignments);
router.post(
  '/assignments/:assignmentId/submit',
  zodValidate(schemas.lmsSubmissionCreate),
  ctrl.submitAssignment
);
router.get('/assignments/:assignmentId/submissions', ctrl.listSubmissions);
router.post(
  '/submissions/:submissionId/grade',
  zodValidate(schemas.lmsGradeSubmission),
  ctrl.gradeSubmission
);

router.post('/courses/:courseId/quizzes', zodValidate(schemas.lmsQuizCreate), ctrl.createQuiz);
router.get('/courses/:courseId/quizzes', ctrl.listQuizzes);
router.post('/quizzes/:quizId/start', ctrl.startQuiz);
router.post('/quizzes/:quizId/submit', zodValidate(schemas.lmsQuizSubmit), ctrl.submitQuiz);

router.post(
  '/courses/:courseId/ai/recommend',
  requireVerifiedEmail,
  ctrl.aiRecommend
);
router.post(
  '/courses/:courseId/ai/study-plan',
  requireVerifiedEmail,
  zodValidate(schemas.lmsAiPlan),
  ctrl.aiStudyPlan
);

router.get('/courses/:courseId/analytics', ctrl.courseAnalytics);
router.get('/courses/:courseId/analytics/me', ctrl.studentAnalytics);

module.exports = router;
