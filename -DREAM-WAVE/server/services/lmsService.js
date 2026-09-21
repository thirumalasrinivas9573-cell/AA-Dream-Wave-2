const crypto = require('crypto');
const LmsCourse = require('../models/LmsCourse');
const LmsModule = require('../models/LmsModule');
const LmsLesson = require('../models/LmsLesson');
const LmsAssignment = require('../models/LmsAssignment');
const LmsSubmission = require('../models/LmsSubmission');
const { LmsEnrollment, LmsCertificate } = require('../models/LmsEnrollment');
const { LmsQuiz, LmsQuizAttempt } = require('../models/LmsQuiz');
const LearningProgress = require('../models/LearningProgress');
const ClassSection = require('../models/ClassSection');
const OrgMembership = require('../models/OrgMembership');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const aiService = require('./aiService');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || `course-${Date.now()}`;
}

async function uniqueCourseSlug(user, base) {
  let slug = slugify(base);
  for (let i = 0; i < 8; i += 1) {
    const filter = user.organizationId
      ? { organizationId: user.organizationId, slug }
      : { createdBy: user._id, organizationId: null, slug };
    const exists = await LmsCourse.findOne(filter).select('_id').lean();
    if (!exists) return slug;
    slug = `${slugify(base)}-${i + 2}`;
  }
  return `${slugify(base)}-${crypto.randomBytes(3).toString('hex')}`;
}

async function orgRole(user) {
  if (!user.organizationId) return null;
  const m = await OrgMembership.findOne({ org: user.organizationId, user: user._id })
    .select('role memberKind')
    .lean();
  return m;
}

function isInstructorLike(membership, course, userId) {
  if (!membership && !course) return false;
  if (membership && (membership.role === 'owner' || membership.role === 'admin')) return true;
  if (membership && membership.memberKind === 'teacher') return true;
  if (course && String(course.createdBy) === String(userId)) return true;
  if (course?.instructors?.some((id) => String(id) === String(userId))) return true;
  return false;
}

async function canManageCourse(user, course) {
  if (!course) return false;
  if (String(course.createdBy) === String(user._id)) return true;
  if (user.role === 'admin') return true;
  if (course.instructors?.some((id) => String(id) === String(user._id))) return true;
  if (
    user.organizationId &&
    course.organizationId &&
    String(user.organizationId) === String(course.organizationId)
  ) {
    const m = await orgRole(user);
    return isInstructorLike(m, course, user._id);
  }
  return false;
}

async function canViewCourse(user, course) {
  if (!course) return false;
  if (await canManageCourse(user, course)) return true;
  if (course.status === 'published' && course.visibility === 'public') return true;
  if (
    course.status === 'published' &&
    course.visibility === 'org' &&
    user.organizationId &&
    course.organizationId &&
    String(user.organizationId) === String(course.organizationId)
  ) {
    return true;
  }
  const enrollment = await LmsEnrollment.findOne({
    course: course._id,
    user: user._id,
    status: { $in: ['active', 'completed', 'pending'] },
  })
    .select('_id')
    .lean();
  return Boolean(enrollment);
}

async function getCourseOrThrow(id) {
  const course = await LmsCourse.findById(id);
  if (!course) throw new AppError('LMS course not found', 404);
  return course;
}

async function assertManage(user, course) {
  if (!(await canManageCourse(user, course))) {
    throw new AppError('Forbidden. Instructors only.', 403);
  }
}

async function assertView(user, course) {
  if (!(await canViewCourse(user, course))) {
    throw new AppError('Forbidden. Not enrolled or course not visible.', 403);
  }
}

function courseListFilter(user, query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = String(query.category).slice(0, 80);
  if (query.visibility) filter.visibility = query.visibility;

  if (user.role === 'admin') return filter;

  const orgId = user.organizationId || null;
  filter.$or = [
    { createdBy: user._id },
    { instructors: user._id },
    { visibility: 'public', status: 'published' },
  ];
  if (orgId) {
    filter.$or.push({ organizationId: orgId, visibility: 'org', status: 'published' });
    filter.$or.push({ organizationId: orgId, createdBy: user._id });
    filter.$or.push({ organizationId: orgId, instructors: user._id });
  }
  return filter;
}

async function createCourse(user, body) {
  const title = String(body.title || '').trim();
  if (title.length < 2) throw new AppError('Course title is required', 400);
  const slug = await uniqueCourseSlug(user, body.slug || title);
  const course = await LmsCourse.create({
    organizationId: user.organizationId || null,
    createdBy: user._id,
    title,
    slug,
    description: String(body.description || '').slice(0, 8000),
    category: String(body.category || 'general').slice(0, 80),
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map((t) => String(t).slice(0, 40)) : [],
    version: 1,
    versionNotes: String(body.versionNotes || '').slice(0, 2000),
    visibility: ['private', 'org', 'public'].includes(body.visibility) ? body.visibility : 'org',
    status: body.status === 'published' ? 'published' : 'draft',
    instructors: [user._id, ...(Array.isArray(body.instructors) ? body.instructors : [])].filter(
      (v, i, a) => a.findIndex((x) => String(x) === String(v)) === i
    ),
    prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites.slice(0, 20) : [],
    estimatedHours: Number(body.estimatedHours) || 0,
    thumbnailUrl: String(body.thumbnailUrl || '').slice(0, 500),
    academicCourse: body.academicCourse || null,
    classSections: Array.isArray(body.classSections) ? body.classSections.slice(0, 50) : [],
    publishedAt: body.status === 'published' ? new Date() : null,
  });
  await LmsEnrollment.findOneAndUpdate(
    { course: course._id, user: user._id },
    {
      $setOnInsert: {
        organizationId: user.organizationId || null,
        role: 'instructor',
        status: 'active',
        enrolledBy: user._id,
      },
    },
    { upsert: true, new: true }
  );
  return course;
}

async function updateCourse(user, courseId, body) {
  const course = await getCourseOrThrow(courseId);
  await assertManage(user, course);
  const fields = [
    'title',
    'description',
    'category',
    'visibility',
    'status',
    'versionNotes',
    'estimatedHours',
    'thumbnailUrl',
    'academicCourse',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) course[f] = body[f];
  }
  if (Array.isArray(body.tags)) course.tags = body.tags.slice(0, 20);
  if (Array.isArray(body.instructors)) course.instructors = body.instructors.slice(0, 50);
  if (Array.isArray(body.prerequisites)) course.prerequisites = body.prerequisites.slice(0, 20);
  if (Array.isArray(body.classSections)) course.classSections = body.classSections.slice(0, 50);
  if (body.status === 'published' && !course.publishedAt) course.publishedAt = new Date();
  if (body.bumpVersion) {
    course.version += 1;
    course.versionNotes = String(body.versionNotes || `Version ${course.version}`).slice(0, 2000);
  }
  await course.save();
  return course;
}

async function createModule(user, courseId, body) {
  const course = await getCourseOrThrow(courseId);
  await assertManage(user, course);
  const count = await LmsModule.countDocuments({ course: courseId });
  return LmsModule.create({
    organizationId: course.organizationId,
    course: courseId,
    title: String(body.title || '').trim().slice(0, 200),
    description: String(body.description || '').slice(0, 4000),
    order: body.order != null ? Number(body.order) : count,
    prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites.slice(0, 20) : [],
    estimatedMinutes: Number(body.estimatedMinutes) || 0,
  });
}

async function createLesson(user, courseId, moduleId, body) {
  const course = await getCourseOrThrow(courseId);
  await assertManage(user, course);
  const mod = await LmsModule.findOne({ _id: moduleId, course: courseId });
  if (!mod) throw new AppError('Module not found', 404);
  const count = await LmsLesson.countDocuments({ module: moduleId });
  const type = ['video', 'reading', 'pdf', 'interactive', 'ai'].includes(body.type)
    ? body.type
    : 'reading';
  return LmsLesson.create({
    organizationId: course.organizationId,
    course: courseId,
    module: moduleId,
    title: String(body.title || '').trim().slice(0, 200),
    order: body.order != null ? Number(body.order) : count,
    type,
    content: {
      body: String(body.content?.body || body.body || '').slice(0, 100000),
      videoUrl: String(body.content?.videoUrl || body.videoUrl || '').slice(0, 500),
      pdfUrl: String(body.content?.pdfUrl || body.pdfUrl || '').slice(0, 500),
      assetId: String(body.content?.assetId || body.assetId || '').slice(0, 120),
      interactiveConfig: body.content?.interactiveConfig || body.interactiveConfig || {},
      aiPrompt: String(body.content?.aiPrompt || body.aiPrompt || '').slice(0, 4000),
    },
    durationMinutes: Number(body.durationMinutes) || 10,
    prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites.slice(0, 20) : [],
    required: body.required !== false,
  });
}

async function getCurriculum(user, courseId) {
  const course = await getCourseOrThrow(courseId);
  await assertView(user, course);
  const modules = await LmsModule.find({ course: courseId }).sort({ order: 1 }).lean();
  const lessons = await LmsLesson.find({ course: courseId }).sort({ order: 1 }).lean();
  const byModule = {};
  for (const l of lessons) {
    const key = String(l.module);
    if (!byModule[key]) byModule[key] = [];
    byModule[key].push(l);
  }
  return {
    course,
    modules: modules.map((m) => ({ ...m, lessons: byModule[String(m._id)] || [] })),
  };
}

async function enroll(user, courseId, { targetUserId, classSectionId, role } = {}) {
  const course = await getCourseOrThrow(courseId);
  const studentId = targetUserId || user._id;
  const enrollingOther = String(studentId) !== String(user._id);

  if (enrollingOther) {
    await assertManage(user, course);
  } else if (course.status !== 'published' && !(await canManageCourse(user, course))) {
    throw new AppError('Course is not open for enrollment', 400);
  } else if (!(await canViewCourse(user, course)) && course.visibility === 'private') {
    throw new AppError('Course is private', 403);
  }

  if (classSectionId) {
    const section = await ClassSection.findById(classSectionId);
    if (!section) throw new AppError('Class section not found', 404);
    if (
      course.organizationId &&
      String(section.organizationId) !== String(course.organizationId)
    ) {
      throw new AppError('Class section must belong to the same organization', 400);
    }
    if (!section.students.some((id) => String(id) === String(studentId))) {
      section.students.push(studentId);
      await section.save();
    }
  }

  const enrollment = await LmsEnrollment.findOneAndUpdate(
    { course: courseId, user: studentId },
    {
      $set: {
        organizationId: course.organizationId,
        classSection: classSectionId || null,
        role: role === 'instructor' ? 'instructor' : 'student',
        status: 'active',
        enrolledBy: user._id,
      },
      $setOnInsert: { enrolledAt: new Date() },
    },
    { upsert: true, new: true }
  );

  await Notification.create({
    user: studentId,
    title: 'Course enrollment',
    message: `You are enrolled in ${course.title}`,
    type: 'study',
    link: `/learning/courses/${courseId}`,
  }).catch(() => null);

  return enrollment;
}

async function completeLesson(user, courseId, lessonId, { minutes = 0 } = {}) {
  const course = await getCourseOrThrow(courseId);
  await assertView(user, course);
  const lesson = await LmsLesson.findOne({ _id: lessonId, course: courseId });
  if (!lesson) throw new AppError('Lesson not found', 404);

  const enrollment = await LmsEnrollment.findOne({
    course: courseId,
    user: user._id,
    status: { $in: ['active', 'completed'] },
  });
  if (!enrollment && !(await canManageCourse(user, course))) {
    throw new AppError('Enroll in the course before tracking progress', 400);
  }

  const key = `lms-lesson:${lessonId}`;
  const progress = await LearningProgress.findOneAndUpdate(
    { user: user._id, kind: 'lesson', key },
    {
      $set: {
        organizationId: course.organizationId,
        label: lesson.title,
        percent: 100,
        completed: true,
        completedAt: new Date(),
        refType: 'LmsLesson',
        refId: lesson._id,
        meta: { courseId, moduleId: lesson.module, type: lesson.type },
      },
    },
    { upsert: true, new: true }
  );

  if (enrollment) {
    if (minutes > 0) enrollment.timeSpentMinutes += Math.min(600, Number(minutes) || 0);
    const summary = await recomputeCourseProgress(user, course);
    enrollment.progressPercent = summary.percent;
    if (summary.percent >= 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      await issueCertificate(user, course, enrollment);
    }
    await enrollment.save();
  }

  return { progress, enrollment };
}

async function recomputeCourseProgress(user, course) {
  const requiredLessons = await LmsLesson.find({ course: course._id, required: true })
    .select('_id title module')
    .lean();
  const total = requiredLessons.length || (await LmsLesson.countDocuments({ course: course._id }));
  if (!total) return { percent: 0, completedLessons: 0, totalLessons: 0 };

  const ids = requiredLessons.length
    ? requiredLessons.map((l) => l._id)
    : (await LmsLesson.find({ course: course._id }).select('_id').lean()).map((l) => l._id);

  const completed = await LearningProgress.countDocuments({
    user: user._id,
    kind: 'lesson',
    completed: true,
    refId: { $in: ids },
  });
  const percent = Math.round((completed / Math.max(1, ids.length)) * 100);

  await LearningProgress.findOneAndUpdate(
    { user: user._id, kind: 'course', key: `lms-course:${course._id}` },
    {
      $set: {
        organizationId: course.organizationId,
        label: course.title,
        percent,
        completed: percent >= 100,
        completedAt: percent >= 100 ? new Date() : null,
        refType: 'LmsCourse',
        refId: course._id,
        meta: { completedLessons: completed, totalLessons: ids.length },
      },
    },
    { upsert: true, new: true }
  );

  // Module completion rollup
  const modules = await LmsModule.find({ course: course._id }).select('_id title').lean();
  for (const mod of modules) {
    const modLessons = await LmsLesson.find({ module: mod._id, required: true }).select('_id').lean();
    if (!modLessons.length) continue;
    const modDone = await LearningProgress.countDocuments({
      user: user._id,
      kind: 'lesson',
      completed: true,
      refId: { $in: modLessons.map((l) => l._id) },
    });
    const modPercent = Math.round((modDone / modLessons.length) * 100);
    await LearningProgress.findOneAndUpdate(
      { user: user._id, kind: 'module', key: `lms-module:${mod._id}` },
      {
        $set: {
          organizationId: course.organizationId,
          label: mod.title,
          percent: modPercent,
          completed: modPercent >= 100,
          completedAt: modPercent >= 100 ? new Date() : null,
          refType: 'LmsModule',
          refId: mod._id,
          meta: { courseId: course._id },
        },
      },
      { upsert: true }
    );
  }

  return { percent, completedLessons: completed, totalLessons: ids.length };
}

async function issueCertificate(user, course, enrollment) {
  const existing = await LmsCertificate.findOne({ user: user._id, course: course._id });
  if (existing) return existing;
  const cert = await LmsCertificate.create({
    organizationId: course.organizationId,
    user: user._id,
    course: course._id,
    enrollment: enrollment._id,
    title: `Certificate of Completion — ${course.title}`,
    metadata: {
      version: course.version,
      category: course.category,
      completionPercent: enrollment.progressPercent || 100,
      issuedBy: 'Dream Wave LMS',
    },
  });
  await Notification.create({
    user: user._id,
    title: 'Certificate earned',
    message: `You earned a certificate for ${course.title}`,
    type: 'success',
    link: `/learning/certificates/${cert.verificationId}`,
  }).catch(() => null);
  return cert;
}

async function createAssignment(user, courseId, body) {
  const course = await getCourseOrThrow(courseId);
  await assertManage(user, course);
  return LmsAssignment.create({
    organizationId: course.organizationId,
    course: courseId,
    module: body.module || null,
    lesson: body.lesson || null,
    createdBy: user._id,
    title: String(body.title || '').trim().slice(0, 200),
    description: String(body.description || '').slice(0, 10000),
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
    maxScore: Number(body.maxScore) || 100,
    status: ['draft', 'open', 'closed'].includes(body.status) ? body.status : 'open',
  });
}

function assignmentAutoStatus(assignment) {
  if (assignment.status === 'draft' || assignment.status === 'closed') return assignment.status;
  if (assignment.dueAt && assignment.dueAt.getTime() < Date.now()) return 'closed';
  return 'open';
}

async function submitAssignment(user, assignmentId, body) {
  const assignment = await LmsAssignment.findById(assignmentId);
  if (!assignment) throw new AppError('Assignment not found', 404);
  const course = await getCourseOrThrow(assignment.course);
  await assertView(user, course);

  const liveStatus = assignmentAutoStatus(assignment);
  if (liveStatus === 'draft') throw new AppError('Assignment is not open', 400);

  const late = Boolean(assignment.dueAt && assignment.dueAt.getTime() < Date.now());
  const submission = await LmsSubmission.findOneAndUpdate(
    { assignment: assignmentId, user: user._id },
    {
      $set: {
        organizationId: course.organizationId,
        course: course._id,
        content: String(body.content || '').slice(0, 50000),
        fileUrl: String(body.fileUrl || '').slice(0, 500),
        status: late ? 'late' : 'submitted',
        submittedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
  return submission;
}

async function gradeSubmission(user, submissionId, body) {
  const submission = await LmsSubmission.findById(submissionId);
  if (!submission) throw new AppError('Submission not found', 404);
  const course = await getCourseOrThrow(submission.course);
  await assertManage(user, course);
  submission.score = Math.max(0, Number(body.score) || 0);
  submission.feedback = String(body.feedback || '').slice(0, 5000);
  submission.status = body.returnToStudent ? 'returned' : 'graded';
  submission.gradedAt = new Date();
  submission.gradedBy = user._id;
  await submission.save();
  await Notification.create({
    user: submission.user,
    title: 'Assignment graded',
    message: `Your submission was graded: ${submission.score}`,
    type: 'study',
    link: `/learning/courses/${course._id}`,
  }).catch(() => null);
  return submission;
}

async function createQuiz(user, courseId, body) {
  const course = await getCourseOrThrow(courseId);
  await assertManage(user, course);
  const bank = Array.isArray(body.questionBank || body.questions)
    ? (body.questionBank || body.questions).slice(0, 200).map((q) => ({
        question: String(q.question || '').slice(0, 2000),
        options: Array.isArray(q.options) ? q.options.slice(0, 8).map((o) => String(o).slice(0, 500)) : [],
        answer: String(q.answer || '').slice(0, 500),
        explanation: String(q.explanation || '').slice(0, 2000),
        tags: Array.isArray(q.tags) ? q.tags.slice(0, 10) : [],
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      }))
    : [];
  if (!bank.length) throw new AppError('Question bank requires at least one question', 400);
  return LmsQuiz.create({
    organizationId: course.organizationId,
    course: courseId,
    module: body.module || null,
    lesson: body.lesson || null,
    createdBy: user._id,
    title: String(body.title || 'Course Quiz').slice(0, 200),
    questionBank: bank,
    randomCount: Math.min(bank.length, Number(body.randomCount) || 0),
    maxAttempts: Math.min(20, Math.max(1, Number(body.maxAttempts) || 3)),
    passPercent: Math.min(100, Math.max(0, Number(body.passPercent) || 60)),
    status: body.status === 'draft' ? 'draft' : 'published',
  });
}

function pickQuestions(quiz) {
  const bank = quiz.questionBank || [];
  if (!quiz.randomCount || quiz.randomCount >= bank.length) return bank;
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, quiz.randomCount);
}

async function startQuiz(user, quizId) {
  const quiz = await LmsQuiz.findById(quizId);
  if (!quiz || quiz.status !== 'published') throw new AppError('Quiz not found', 404);
  const course = await getCourseOrThrow(quiz.course);
  await assertView(user, course);
  const attempts = await LmsQuizAttempt.countDocuments({ quiz: quizId, user: user._id });
  if (attempts >= quiz.maxAttempts) throw new AppError('Maximum quiz attempts reached', 400);
  const selected = pickQuestions(quiz);
  return {
    quiz: {
      id: quiz._id,
      title: quiz.title,
      maxAttempts: quiz.maxAttempts,
      attemptsUsed: attempts,
      passPercent: quiz.passPercent,
      questions: selected.map((q) => ({
        id: q._id,
        question: q.question,
        options: q.options,
      })),
    },
  };
}

async function submitQuiz(user, quizId, body) {
  const quiz = await LmsQuiz.findById(quizId);
  if (!quiz || quiz.status !== 'published') throw new AppError('Quiz not found', 404);
  const course = await getCourseOrThrow(quiz.course);
  await assertView(user, course);
  const attempts = await LmsQuizAttempt.countDocuments({ quiz: quizId, user: user._id });
  if (attempts >= quiz.maxAttempts) throw new AppError('Maximum quiz attempts reached', 400);

  const answers = Array.isArray(body.answers) ? body.answers : [];
  const questionIds = Array.isArray(body.questionIds) ? body.questionIds.map(String) : [];
  let selected = quiz.questionBank;
  if (questionIds.length) {
    const set = new Set(questionIds);
    selected = quiz.questionBank.filter((q) => set.has(String(q._id)));
  }
  if (!selected.length) selected = pickQuestions(quiz);

  let score = 0;
  selected.forEach((q, i) => {
    const ans = String(answers[i] || '').trim().toLowerCase();
    if (ans && ans === String(q.answer || '').trim().toLowerCase()) score += 1;
  });
  const total = selected.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const passed = percent >= quiz.passPercent;

  const attempt = await LmsQuizAttempt.create({
    organizationId: course.organizationId,
    quiz: quizId,
    course: course._id,
    user: user._id,
    questionIds: selected.map((q) => q._id),
    answers: answers.map((a) => String(a).slice(0, 500)),
    score,
    total,
    percent,
    passed,
  });
  return { attempt, passed, percent, score, total };
}

async function aiRecommendations(user, courseId) {
  const course = await getCourseOrThrow(courseId);
  await assertView(user, course);
  const progress = await LearningProgress.find({
    user: user._id,
    refType: { $in: ['LmsLesson', 'LmsModule', 'LmsCourse'] },
    $or: [{ 'meta.courseId': course._id }, { refId: course._id }],
  })
    .limit(100)
    .lean();

  const lessons = await LmsLesson.find({ course: courseId }).select('title type order').limit(50).lean();
  const incomplete = lessons.filter(
    (l) => !progress.some((p) => p.refType === 'LmsLesson' && String(p.refId) === String(l._id) && p.completed)
  );

  const weakTopics = progress
    .filter((p) => p.percent > 0 && p.percent < 70)
    .map((p) => p.label)
    .slice(0, 8);

  let aiText = '';
  try {
    const prompt = `For course "${course.title}", recommend next lessons and revision topics.
Completed-ish: ${progress.filter((p) => p.completed).map((p) => p.label).slice(0, 10).join(', ') || 'none'}
Weak: ${weakTopics.join(', ') || 'none'}
Remaining lessons: ${incomplete
      .slice(0, 12)
      .map((l) => l.title)
      .join(', ')}
Return markdown with: Next lessons, Weak topics, Revision plan (3 days).`;
    aiText = (await aiService.runMode('study', [{ role: 'user', content: prompt }], '', { skipCache: false }))
      .content;
  } catch {
    aiText = '';
  }

  return {
    nextLessons: incomplete.slice(0, 5),
    weakTopics,
    revisionPlan: weakTopics.slice(0, 5),
    ai: aiText,
  };
}

async function aiStudyPlanner(user, courseId, body = {}) {
  const course = await getCourseOrThrow(courseId);
  await assertView(user, course);
  const lessons = await LmsLesson.find({ course: courseId }).sort({ order: 1 }).limit(40).lean();
  const days = Math.min(30, Math.max(3, Number(body.days) || 7));
  const prompt = `Build a ${days}-day study plan for LMS course "${course.title}".
Lessons: ${lessons.map((l, i) => `${i + 1}. ${l.title} (${l.type}, ${l.durationMinutes}m)`).join('\n')}
Return markdown daily schedule.`;
  const plan = (await aiService.runMode('study', [{ role: 'user', content: prompt }])).content;
  return { days, plan, lessonCount: lessons.length };
}

async function courseAnalytics(user, courseId) {
  const course = await getCourseOrThrow(courseId);
  await assertManage(user, course);
  const [enrollments, submissions, attempts, lessonCount] = await Promise.all([
    LmsEnrollment.find({ course: courseId }).lean(),
    LmsSubmission.find({ course: courseId }).lean(),
    LmsQuizAttempt.find({ course: courseId }).lean(),
    LmsLesson.countDocuments({ course: courseId }),
  ]);
  const active = enrollments.filter((e) => e.status === 'active').length;
  const completed = enrollments.filter((e) => e.status === 'completed').length;
  const avgProgress =
    enrollments.length === 0
      ? 0
      : Math.round(enrollments.reduce((s, e) => s + (e.progressPercent || 0), 0) / enrollments.length);
  return {
    courseId,
    lessonCount,
    enrollments: {
      total: enrollments.length,
      active,
      completed,
      dropped: enrollments.filter((e) => e.status === 'dropped').length,
      avgProgress,
    },
    assignments: {
      submissions: submissions.length,
      graded: submissions.filter((s) => s.status === 'graded' || s.status === 'returned').length,
      late: submissions.filter((s) => s.status === 'late').length,
    },
    quizzes: {
      attempts: attempts.length,
      passRate: attempts.length
        ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
        : 0,
    },
  };
}

async function studentAnalytics(user, courseId) {
  const course = await getCourseOrThrow(courseId);
  await assertView(user, course);
  const enrollment = await LmsEnrollment.findOne({ course: courseId, user: user._id }).lean();
  const progress = await LearningProgress.find({
    user: user._id,
    $or: [{ refId: course._id }, { 'meta.courseId': course._id }],
  })
    .limit(200)
    .lean();
  const attempts = await LmsQuizAttempt.find({ course: courseId, user: user._id })
    .sort({ takenAt: -1 })
    .limit(20)
    .lean();
  const submissions = await LmsSubmission.find({ course: courseId, user: user._id }).lean();
  return {
    enrollment,
    progress,
    quizAttempts: attempts,
    submissions,
    timeSpentMinutes: enrollment?.timeSpentMinutes || 0,
  };
}

async function institutionAnalytics(user) {
  if (!user.organizationId) throw new AppError('Organization required', 400);
  const m = await orgRole(user);
  if (!m || (!['owner', 'admin'].includes(m.role) && m.memberKind !== 'teacher')) {
    if (user.role !== 'admin') throw new AppError('Forbidden', 403);
  }
  const courses = await LmsCourse.find({ organizationId: user.organizationId }).select('_id title status').lean();
  const ids = courses.map((c) => c._id);
  const [enrollments, certificates] = await Promise.all([
    LmsEnrollment.find({ course: { $in: ids } }).lean(),
    LmsCertificate.countDocuments({ course: { $in: ids } }),
  ]);
  return {
    courses: courses.length,
    published: courses.filter((c) => c.status === 'published').length,
    enrollments: enrollments.length,
    completed: enrollments.filter((e) => e.status === 'completed').length,
    certificates,
    avgProgress: enrollments.length
      ? Math.round(enrollments.reduce((s, e) => s + (e.progressPercent || 0), 0) / enrollments.length)
      : 0,
  };
}

async function verifyCertificate(verificationId) {
  const cert = await LmsCertificate.findOne({ verificationId })
    .populate('user', 'name email')
    .populate('course', 'title category version')
    .lean();
  if (!cert) throw new AppError('Certificate not found', 404);
  return cert;
}

module.exports = {
  slugify,
  courseListFilter,
  canManageCourse,
  canViewCourse,
  getCourseOrThrow,
  createCourse,
  updateCourse,
  createModule,
  createLesson,
  getCurriculum,
  enroll,
  completeLesson,
  recomputeCourseProgress,
  createAssignment,
  assignmentAutoStatus,
  submitAssignment,
  gradeSubmission,
  createQuiz,
  startQuiz,
  submitQuiz,
  aiRecommendations,
  aiStudyPlanner,
  courseAnalytics,
  studentAnalytics,
  institutionAnalytics,
  verifyCertificate,
  issueCertificate,
  LmsCourse,
  LmsModule,
  LmsLesson,
  LmsAssignment,
  LmsSubmission,
  LmsEnrollment,
  LmsCertificate,
  LmsQuiz,
  LmsQuizAttempt,
};
