const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { boot, shutdown, getApp } = require('./helpers/harness');
const User = require('../models/User');

describe('Enterprise LMS (RC2 P1)', () => {
  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  it('full LMS workflow: course → module → lesson → enroll → progress → quiz → assignment → certificate', async () => {
    const ts = Date.now();
    const instructorSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({
        name: 'LMS Instructor',
        email: `lms-inst-${ts}@dreamwave.test`,
        password: 'TestPass1',
      });
    assert.equal(instructorSignup.status, 201);
    const instructorToken = instructorSignup.body.token;
    const instructorAuth = { Authorization: `Bearer ${instructorToken}` };
    await User.updateOne(
      { email: `lms-inst-${ts}@dreamwave.test` },
      { $set: { isEmailVerified: true, credits: 40 } }
    );

    const studentSignup = await request(getApp())
      .post('/api/auth/signup')
      .send({
        name: 'LMS Student',
        email: `lms-stu-${ts}@dreamwave.test`,
        password: 'TestPass1',
      });
    const studentToken = studentSignup.body.token;
    const studentAuth = { Authorization: `Bearer ${studentToken}` };
    await User.updateOne(
      { email: `lms-stu-${ts}@dreamwave.test` },
      { $set: { isEmailVerified: true, credits: 40 } }
    );

    const created = await request(getApp())
      .post('/api/lms/courses')
      .set(instructorAuth)
      .send({
        title: `Intro to Algorithms ${ts}`,
        category: 'computer-science',
        description: 'Enterprise LMS course',
        visibility: 'public',
        status: 'draft',
      });
    assert.equal(created.status, 201);
    const courseId = created.body.data.course._id;
    assert.ok(courseId);
    assert.equal(created.body.data.course.version, 1);

    const published = await request(getApp())
      .post(`/api/lms/courses/${courseId}/publish`)
      .set(instructorAuth)
      .send({});
    assert.equal(published.status, 200);
    assert.equal(published.body.data.course.status, 'published');

    const mod = await request(getApp())
      .post(`/api/lms/courses/${courseId}/modules`)
      .set(instructorAuth)
      .send({ title: 'Basics', order: 0 });
    assert.equal(mod.status, 201);
    const moduleId = mod.body.data.module._id;

    const lesson = await request(getApp())
      .post(`/api/lms/courses/${courseId}/modules/${moduleId}/lessons`)
      .set(instructorAuth)
      .send({
        title: 'What is an algorithm?',
        type: 'reading',
        body: 'An algorithm is a step-by-step procedure.',
        durationMinutes: 15,
      });
    assert.equal(lesson.status, 201);
    const lessonId = lesson.body.data.lesson._id;

    const lesson2 = await request(getApp())
      .post(`/api/lms/courses/${courseId}/modules/${moduleId}/lessons`)
      .set(instructorAuth)
      .send({
        title: 'Sorting video',
        type: 'video',
        videoUrl: 'https://example.com/sort.mp4',
        durationMinutes: 20,
      });
    assert.equal(lesson2.status, 201);
    const lesson2Id = lesson2.body.data.lesson._id;

    const curriculum = await request(getApp())
      .get(`/api/lms/courses/${courseId}/curriculum`)
      .set(studentAuth);
    assert.equal(curriculum.status, 200);
    assert.equal(curriculum.body.data.modules.length, 1);
    assert.equal(curriculum.body.data.modules[0].lessons.length, 2);

    const enroll = await request(getApp())
      .post(`/api/lms/courses/${courseId}/enroll`)
      .set(studentAuth)
      .send({});
    assert.equal(enroll.status, 201);
    assert.equal(enroll.body.data.enrollment.status, 'active');

    const complete1 = await request(getApp())
      .post(`/api/lms/courses/${courseId}/lessons/${lessonId}/complete`)
      .set(studentAuth)
      .send({ minutes: 12 });
    assert.equal(complete1.status, 200);
    assert.equal(complete1.body.data.progress.completed, true);
    assert.ok(complete1.body.data.enrollment.progressPercent >= 50);

    const quiz = await request(getApp())
      .post(`/api/lms/courses/${courseId}/quizzes`)
      .set(instructorAuth)
      .send({
        title: 'Basics Quiz',
        randomCount: 1,
        maxAttempts: 3,
        passPercent: 50,
        questionBank: [
          {
            question: '2+2?',
            options: ['3', '4', '5'],
            answer: '4',
            explanation: 'basic math',
          },
          {
            question: 'Capital of France?',
            options: ['Paris', 'Rome'],
            answer: 'Paris',
          },
        ],
      });
    assert.equal(quiz.status, 201);
    const quizId = quiz.body.data.quiz._id;

    const started = await request(getApp())
      .post(`/api/lms/quizzes/${quizId}/start`)
      .set(studentAuth);
    assert.equal(started.status, 200);
    assert.equal(started.body.data.quiz.questions.length, 1);
    const q = started.body.data.quiz.questions[0];

    const submitted = await request(getApp())
      .post(`/api/lms/quizzes/${quizId}/submit`)
      .set(studentAuth)
      .send({
        questionIds: [q.id],
        answers: [q.options.includes('4') ? '4' : q.options[0]],
      });
    assert.equal(submitted.status, 200);
    assert.ok(typeof submitted.body.data.percent === 'number');

    const assignment = await request(getApp())
      .post(`/api/lms/courses/${courseId}/assignments`)
      .set(instructorAuth)
      .send({
        title: 'Write a bubble sort',
        description: 'Submit your solution',
        dueAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      });
    assert.equal(assignment.status, 201);
    const assignmentId = assignment.body.data.assignment._id;

    const submission = await request(getApp())
      .post(`/api/lms/assignments/${assignmentId}/submit`)
      .set(studentAuth)
      .send({ content: 'function bubbleSort(a){ return a.sort(); }' });
    assert.equal(submission.status, 201);

    const graded = await request(getApp())
      .post(`/api/lms/submissions/${submission.body.data.submission._id}/grade`)
      .set(instructorAuth)
      .send({ score: 90, feedback: 'Good enough' });
    assert.equal(graded.status, 200);
    assert.equal(graded.body.data.submission.status, 'graded');

    const complete2 = await request(getApp())
      .post(`/api/lms/courses/${courseId}/lessons/${lesson2Id}/complete`)
      .set(studentAuth)
      .send({ minutes: 18 });
    assert.equal(complete2.status, 200);
    assert.equal(complete2.body.data.enrollment.status, 'completed');
    assert.equal(complete2.body.data.enrollment.progressPercent, 100);

    const certs = await request(getApp()).get('/api/lms/certificates/me').set(studentAuth);
    assert.equal(certs.status, 200);
    assert.ok(certs.body.data.certificates.length >= 1);
    const verificationId = certs.body.data.certificates[0].verificationId;

    const verified = await request(getApp()).get(`/api/lms/certificates/verify/${verificationId}`);
    assert.equal(verified.status, 200);
    assert.equal(verified.body.data.certificate.verificationId, verificationId);

    const analytics = await request(getApp())
      .get(`/api/lms/courses/${courseId}/analytics`)
      .set(instructorAuth);
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.enrollments.total >= 1);
    assert.ok(analytics.body.data.enrollments.completed >= 1);

    const stranger = await request(getApp())
      .post('/api/auth/signup')
      .send({
        name: 'Stranger',
        email: `lms-str-${ts}@dreamwave.test`,
        password: 'TestPass1',
      });
    const denied = await request(getApp())
      .get(`/api/lms/courses/${courseId}/analytics`)
      .set('Authorization', `Bearer ${stranger.body.token}`);
    assert.equal(denied.status, 403);
  });

  it('rejects unauthenticated LMS course list', async () => {
    const res = await request(getApp()).get('/api/lms/courses');
    assert.equal(res.status, 401);
    assert.equal(res.body.failureClass, 'auth');
  });
});
