const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { boot, shutdown, getApp } = require('./helpers/harness');
const User = require('../models/User');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const Document = require('../models/Document');
const Habit = require('../models/Habit');
const OrgInvite = require('../models/OrgInvite');
const Branch = require('../models/Branch');
const Organization = require('../models/Organization');
const Community = require('../models/Community');
const AttendanceRecord = require('../models/AttendanceRecord');
const ClassSection = require('../models/ClassSection');
const AuditLog = require('../models/AuditLog');
const { cascadeDeleteUserData, repairOrphanUserRefs } = require('../services/userCascadeService');

describe('Database integrity (RC1 P6)', () => {
  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  it('enforces unique invite tokenHash', async () => {
    await OrgInvite.syncIndexes();
    const owner = await User.create({
      name: 'Invite Owner',
      email: `invite-owner-${Date.now()}@dreamwave.test`,
      password: 'TestPass1',
    });
    const org = await Organization.create({
      name: `Invite Org ${Date.now()}`,
      slug: `invite-org-${Date.now()}`,
      owner: owner._id,
    });
    const hash = OrgInvite.hashToken(`unique-token-${Date.now()}`);
    await OrgInvite.create({
      org: org._id,
      email: `a-${Date.now()}@dreamwave.test`,
      tokenHash: hash,
      invitedBy: owner._id,
      expiresAt: new Date(Date.now() + 864e5),
    });
    await assert.rejects(
      () =>
        OrgInvite.create({
          org: org._id,
          email: `b-${Date.now()}@dreamwave.test`,
          tokenHash: hash,
          invitedBy: owner._id,
          expiresAt: new Date(Date.now() + 864e5),
        }),
      (err) => err && err.code === 11000
    );
  });

  it('enforces unique branch name per organization', async () => {
    await Branch.syncIndexes();
    const owner = await User.create({
      name: 'Branch Owner',
      email: `branch-owner-${Date.now()}@dreamwave.test`,
      password: 'TestPass1',
    });
    const org = await Organization.create({
      name: `Branch Org ${Date.now()}`,
      slug: `branch-org-${Date.now()}`,
      owner: owner._id,
    });
    await Branch.create({ organizationId: org._id, name: 'Main Campus', code: 'MAIN' });
    let dupError = null;
    try {
      await Branch.create({ organizationId: org._id, name: 'Main Campus', code: 'MAIN2' });
    } catch (err) {
      dupError = err;
    }
    assert.ok(dupError);
    assert.equal(dupError.code, 11000);
  });

  it('cascades user delete and preserves anonymized audit trail', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Cascade User', email: `cascade-${ts}@dreamwave.test`, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;
    const userId = signup.body.data.user.id;

    const goal = await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cascade goal' });
    assert.equal(goal.status, 201);

    const task = await request(getApp())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cascade task' });
    assert.equal(task.status, 201);

    const habit = await request(getApp())
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cascade habit' });
    assert.equal(habit.status, 201);

    await Notification.create({
      user: userId,
      title: 'Hi',
      message: 'Test',
      type: 'info',
    });
    await Chat.create({
      user: userId,
      title: 'Chat',
      mode: 'mentor',
      messages: [],
    });
    await Document.create({
      user: userId,
      title: 'Doc',
      fileUrl: '/api/assets/x.txt',
      originalName: 'x.txt',
      mimeType: 'text/plain',
      size: 1,
    });

    await AuditLog.create({
      actor: userId,
      action: 'test.pre_delete',
      resource: 'user',
      resourceId: String(userId),
    });

    const community = await Community.create({
      name: `Comm ${ts}`,
      slug: `comm-${ts}`,
      createdBy: userId,
      members: [{ user: userId, role: 'owner' }],
    });

    const del = await request(getApp())
      .delete('/api/settings/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'TestPass1' });
    assert.equal(del.status, 200);

    assert.equal(await Goal.countDocuments({ user: userId }), 0);
    assert.equal(await Task.countDocuments({ user: userId }), 0);
    assert.equal(await Habit.countDocuments({ user: userId }), 0);
    assert.equal(await Chat.countDocuments({ user: userId }), 0);
    assert.equal(await Notification.countDocuments({ user: userId }), 0);
    assert.equal(await Document.countDocuments({ user: userId }), 0);
    assert.equal(await User.countDocuments({ _id: userId }), 0);
    assert.equal(await Community.countDocuments({ _id: community._id }), 0);

    const audits = await AuditLog.find({ action: 'test.pre_delete' }).lean();
    assert.ok(audits.length >= 1);
    assert.equal(audits[0].actor, null);

    const deletedAudit = await AuditLog.findOne({ action: 'account.deleted' }).sort({ createdAt: -1 });
    assert.ok(deletedAudit);
    assert.equal(deletedAudit.meta?.email, `cascade-${ts}@dreamwave.test`);
  });

  it('blocks deleting an organization owner', async () => {
    const owner = await User.create({
      name: 'Org Owner Block',
      email: `owner-block-${Date.now()}@dreamwave.test`,
      password: 'TestPass1',
    });
    await Organization.create({
      name: `Owned Org ${Date.now()}`,
      slug: `owned-org-${Date.now()}`,
      owner: owner._id,
    });
    let err = null;
    try {
      await cascadeDeleteUserData(owner._id);
    } catch (e) {
      err = e;
    }
    assert.ok(err);
    assert.equal(err.statusCode, 409);
  });

  it('repairOrphanUserRefs removes dangling goal rows', async () => {
    const ghostId = new (require('mongoose').Types.ObjectId)();
    await Goal.create({
      user: ghostId,
      title: 'Orphan goal',
    });
    const summary = await repairOrphanUserRefs({ limit: 500 });
    assert.ok(typeof summary.Goal === 'number');
    assert.equal(await Goal.countDocuments({ user: ghostId }), 0);
  });

  it('clears class section memberships on cascade', async () => {
    const student = await User.create({
      name: 'Student Cascade',
      email: `student-casc-${Date.now()}@dreamwave.test`,
      password: 'TestPass1',
    });
    const owner = await User.create({
      name: 'Inst Owner',
      email: `inst-owner-${Date.now()}@dreamwave.test`,
      password: 'TestPass1',
    });
    const org = await Organization.create({
      name: `Inst ${Date.now()}`,
      slug: `inst-${Date.now()}`,
      owner: owner._id,
    });
    const section = await ClassSection.create({
      organizationId: org._id,
      name: `Sec ${Date.now()}`,
      code: `S${Date.now().toString().slice(-4)}`,
      students: [student._id],
      teachers: [student._id],
      classTeacher: student._id,
    });
    await AttendanceRecord.create({
      organizationId: org._id,
      classSection: section._id,
      student: student._id,
      date: new Date(),
      status: 'present',
    });

    await cascadeDeleteUserData(student._id);
    await User.deleteOne({ _id: student._id });

    const refreshed = await ClassSection.findById(section._id).lean();
    assert.ok(!refreshed.students.map(String).includes(String(student._id)));
    assert.ok(!refreshed.teachers.map(String).includes(String(student._id)));
    assert.ok(refreshed.classTeacher == null);
    assert.equal(await AttendanceRecord.countDocuments({ student: student._id }), 0);
  });
});
