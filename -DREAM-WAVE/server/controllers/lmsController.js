const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { pick } = require('../utils/helpers');
const lms = require('../services/lmsService');
const { consumeAiCredit, refundAiCredit, recordAiUsage } = require('../services/entitlements');

exports.listCourses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = lms.courseListFilter(req.user, req.query);
  // Also include courses the user is enrolled in
  const enrolled = await lms.LmsEnrollment.find({
    user: req.user._id,
    status: { $in: ['active', 'completed', 'pending'] },
  })
    .select('course')
    .lean();
  const enrolledIds = enrolled.map((e) => e.course);
  if (enrolledIds.length) {
    filter.$or = filter.$or || [];
    filter.$or.push({ _id: { $in: enrolledIds } });
  }
  const [courses, total] = await Promise.all([
    lms.LmsCourse.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    lms.LmsCourse.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { courses, pagination: paginationMeta(page, limit, total) },
  });
});

exports.createCourse = asyncHandler(async (req, res) => {
  const course = await lms.createCourse(req.user, req.body);
  res.status(201).json({ success: true, data: { course } });
});

exports.getCourse = asyncHandler(async (req, res) => {
  const course = await lms.getCourseOrThrow(req.params.courseId);
  if (!(await lms.canViewCourse(req.user, course))) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Forbidden. Not enrolled or course not visible.', 403);
  }
  res.json({ success: true, data: { course } });
});

exports.updateCourse = asyncHandler(async (req, res) => {
  const course = await lms.updateCourse(req.user, req.params.courseId, req.body);
  res.json({ success: true, data: { course } });
});

exports.publishCourse = asyncHandler(async (req, res) => {
  const course = await lms.updateCourse(req.user, req.params.courseId, {
    status: 'published',
    visibility: req.body.visibility,
  });
  res.json({ success: true, data: { course } });
});

exports.archiveCourse = asyncHandler(async (req, res) => {
  const course = await lms.updateCourse(req.user, req.params.courseId, { status: 'archived' });
  res.json({ success: true, data: { course } });
});

exports.getCurriculum = asyncHandler(async (req, res) => {
  const data = await lms.getCurriculum(req.user, req.params.courseId);
  res.json({ success: true, data });
});

exports.createModule = asyncHandler(async (req, res) => {
  const moduleDoc = await lms.createModule(req.user, req.params.courseId, req.body);
  res.status(201).json({ success: true, data: { module: moduleDoc } });
});

exports.updateModule = asyncHandler(async (req, res) => {
  const course = await lms.getCourseOrThrow(req.params.courseId);
  if (!(await lms.canManageCourse(req.user, course))) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Forbidden. Instructors only.', 403);
  }
  const mod = await lms.LmsModule.findOne({ _id: req.params.moduleId, course: course._id });
  if (!mod) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Module not found', 404);
  }
  Object.assign(mod, pick(req.body, ['title', 'description', 'order', 'estimatedMinutes']));
  if (Array.isArray(req.body.prerequisites)) mod.prerequisites = req.body.prerequisites.slice(0, 20);
  await mod.save();
  res.json({ success: true, data: { module: mod } });
});

exports.createLesson = asyncHandler(async (req, res) => {
  const lesson = await lms.createLesson(req.user, req.params.courseId, req.params.moduleId, req.body);
  res.status(201).json({ success: true, data: { lesson } });
});

exports.updateLesson = asyncHandler(async (req, res) => {
  const course = await lms.getCourseOrThrow(req.params.courseId);
  if (!(await lms.canManageCourse(req.user, course))) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Forbidden. Instructors only.', 403);
  }
  const lesson = await lms.LmsLesson.findOne({ _id: req.params.lessonId, course: course._id });
  if (!lesson) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Lesson not found', 404);
  }
  Object.assign(lesson, pick(req.body, ['title', 'order', 'type', 'durationMinutes', 'required']));
  if (req.body.content || req.body.body || req.body.videoUrl || req.body.pdfUrl) {
    lesson.content = {
      ...lesson.content.toObject?.() || lesson.content,
      ...(req.body.content || {}),
      ...(req.body.body != null ? { body: req.body.body } : {}),
      ...(req.body.videoUrl != null ? { videoUrl: req.body.videoUrl } : {}),
      ...(req.body.pdfUrl != null ? { pdfUrl: req.body.pdfUrl } : {}),
      ...(req.body.aiPrompt != null ? { aiPrompt: req.body.aiPrompt } : {}),
    };
  }
  if (Array.isArray(req.body.prerequisites)) lesson.prerequisites = req.body.prerequisites.slice(0, 20);
  await lesson.save();
  res.json({ success: true, data: { lesson } });
});

exports.enroll = asyncHandler(async (req, res) => {
  const enrollment = await lms.enroll(req.user, req.params.courseId, {
    targetUserId: req.body.userId,
    classSectionId: req.body.classSectionId,
    role: req.body.role,
  });
  res.status(201).json({ success: true, data: { enrollment } });
});

exports.listEnrollments = asyncHandler(async (req, res) => {
  const course = await lms.getCourseOrThrow(req.params.courseId);
  if (!(await lms.canManageCourse(req.user, course))) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Forbidden. Instructors only.', 403);
  }
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const filter = { course: course._id };
  if (req.query.status) filter.status = req.query.status;
  const [enrollments, total] = await Promise.all([
    lms.LmsEnrollment.find(filter)
      .populate('user', 'name email aaid')
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    lms.LmsEnrollment.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: { enrollments, pagination: paginationMeta(page, limit, total) },
  });
});

exports.myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await lms.LmsEnrollment.find({ user: req.user._id })
    .populate('course', 'title slug category status visibility version')
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  res.json({ success: true, data: { enrollments } });
});

exports.completeLesson = asyncHandler(async (req, res) => {
  const data = await lms.completeLesson(req.user, req.params.courseId, req.params.lessonId, {
    minutes: req.body.minutes,
  });
  res.json({ success: true, data });
});

exports.getProgress = asyncHandler(async (req, res) => {
  const data = await lms.studentAnalytics(req.user, req.params.courseId);
  res.json({ success: true, data });
});

exports.createAssignment = asyncHandler(async (req, res) => {
  const assignment = await lms.createAssignment(req.user, req.params.courseId, req.body);
  res.status(201).json({ success: true, data: { assignment } });
});

exports.listAssignments = asyncHandler(async (req, res) => {
  const course = await lms.getCourseOrThrow(req.params.courseId);
  if (!(await lms.canViewCourse(req.user, course))) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Forbidden', 403);
  }
  const assignments = await lms.LmsAssignment.find({ course: course._id })
    .sort({ dueAt: 1, createdAt: -1 })
    .limit(100)
    .lean();
  const withStatus = assignments.map((a) => ({
    ...a,
    effectiveStatus: lms.assignmentAutoStatus({
      ...a,
      dueAt: a.dueAt ? new Date(a.dueAt) : null,
    }),
  }));
  res.json({ success: true, data: { assignments: withStatus } });
});

exports.submitAssignment = asyncHandler(async (req, res) => {
  const submission = await lms.submitAssignment(req.user, req.params.assignmentId, req.body);
  res.status(201).json({ success: true, data: { submission } });
});

exports.listSubmissions = asyncHandler(async (req, res) => {
  const assignment = await lms.LmsAssignment.findById(req.params.assignmentId);
  if (!assignment) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Assignment not found', 404);
  }
  const course = await lms.getCourseOrThrow(assignment.course);
  if (!(await lms.canManageCourse(req.user, course))) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Forbidden. Instructors only.', 403);
  }
  const submissions = await lms.LmsSubmission.find({ assignment: assignment._id })
    .populate('user', 'name email')
    .sort({ submittedAt: -1 })
    .limit(200)
    .lean();
  res.json({ success: true, data: { submissions } });
});

exports.gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await lms.gradeSubmission(req.user, req.params.submissionId, req.body);
  res.json({ success: true, data: { submission } });
});

exports.createQuiz = asyncHandler(async (req, res) => {
  const quiz = await lms.createQuiz(req.user, req.params.courseId, req.body);
  res.status(201).json({ success: true, data: { quiz } });
});

exports.listQuizzes = asyncHandler(async (req, res) => {
  const course = await lms.getCourseOrThrow(req.params.courseId);
  if (!(await lms.canViewCourse(req.user, course))) {
    const { AppError } = require('../middleware/errorHandler');
    throw new AppError('Forbidden', 403);
  }
  const quizzes = await lms.LmsQuiz.find({ course: course._id, status: { $ne: 'archived' } })
    .select('-questionBank.answer -questionBank.explanation')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: { quizzes } });
});

exports.startQuiz = asyncHandler(async (req, res) => {
  const data = await lms.startQuiz(req.user, req.params.quizId);
  res.json({ success: true, data });
});

exports.submitQuiz = asyncHandler(async (req, res) => {
  const data = await lms.submitQuiz(req.user, req.params.quizId, req.body);
  res.json({ success: true, data });
});

exports.aiRecommend = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
    const data = await lms.aiRecommendations(req.user, req.params.courseId);
    await recordAiUsage(req.user, {
      mode: 'study',
      source: 'learning',
      creditsUsed: 1,
      success: true,
    });
    res.json({ success: true, data });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.aiStudyPlan = asyncHandler(async (req, res) => {
  await consumeAiCredit(req.user, 1);
  try {
    const data = await lms.aiStudyPlanner(req.user, req.params.courseId, req.body);
    await recordAiUsage(req.user, {
      mode: 'study',
      source: 'learning',
      creditsUsed: 1,
      success: true,
    });
    res.json({ success: true, data });
  } catch (err) {
    await refundAiCredit(req.user, 1);
    throw err;
  }
});

exports.courseAnalytics = asyncHandler(async (req, res) => {
  const data = await lms.courseAnalytics(req.user, req.params.courseId);
  res.json({ success: true, data });
});

exports.studentAnalytics = asyncHandler(async (req, res) => {
  const data = await lms.studentAnalytics(req.user, req.params.courseId);
  res.json({ success: true, data });
});

exports.institutionAnalytics = asyncHandler(async (req, res) => {
  const data = await lms.institutionAnalytics(req.user);
  res.json({ success: true, data });
});

exports.listCertificates = asyncHandler(async (req, res) => {
  const certificates = await lms.LmsCertificate.find({ user: req.user._id })
    .populate('course', 'title category version')
    .sort({ issuedAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: { certificates } });
});

exports.verifyCertificate = asyncHandler(async (req, res) => {
  const certificate = await lms.verifyCertificate(req.params.verificationId);
  res.json({ success: true, data: { certificate } });
});

exports.categories = asyncHandler(async (req, res) => {
  const filter = lms.courseListFilter(req.user, { status: 'published' });
  const cats = await lms.LmsCourse.aggregate([
    { $match: filter },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);
  res.json({
    success: true,
    data: { categories: cats.map((c) => ({ category: c._id, count: c.count })) },
  });
});
