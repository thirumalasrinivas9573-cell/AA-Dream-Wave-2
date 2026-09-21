const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { boot, shutdown, getApp } = require('./helpers/harness');
const { recordAiUsage } = require('../services/entitlements');
const AiUsage = require('../models/AiUsage');
const User = require('../models/User');
const { runCleanupJobs } = require('../services/jobRunner');
const { version: APP_VERSION } = require('../package.json');

describe('Release Candidate acceptance (RC1 P9 / v1.0.0)', () => {
  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  it('platform health/ready advertise RC version 1.0.0', async () => {
    assert.equal(APP_VERSION, '1.0.0');
    const health = await request(getApp()).get('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.version, '1.0.0');
    assert.equal(health.body.success, true);

    const ready = await request(getApp()).get('/api/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.status, 'ready');
    assert.equal(ready.body.version, '1.0.0');
    assert.ok(typeof ready.body.pingMs === 'number');
  });

  it('student journey: auth → goals/tasks/habits → books → community → search → settings', async () => {
    const ts = Date.now();
    const email = `rc-student-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({
        name: 'RC Student',
        email,
        password: 'TestPass1',
        targetCareer: 'Software Engineer',
      });
    assert.equal(signup.status, 201);
    assert.ok(signup.body.token);
    assert.equal(signup.body.success, true);
    const token = signup.body.token;
    const auth = { Authorization: `Bearer ${token}` };

    await User.updateOne({ email }, { $set: { isEmailVerified: true } });

    const me = await request(getApp()).get('/api/auth/me').set(auth);
    assert.equal(me.status, 200);
    assert.ok(me.body.data.user.email);

    const goal = await request(getApp())
      .post('/api/goals')
      .set(auth)
      .send({ title: `RC Goal ${ts}`, category: 'learning', priority: 'high' });
    assert.ok([200, 201].includes(goal.status));

    const task = await request(getApp())
      .post('/api/tasks')
      .set(auth)
      .send({ title: `RC Task ${ts}`, priority: 'medium' });
    assert.ok([200, 201].includes(task.status));

    const habit = await request(getApp())
      .post('/api/habits')
      .set(auth)
      .send({ title: `RC Habit ${ts}`, frequency: 'daily' });
    assert.ok([200, 201].includes(habit.status));

    for (const path of ['/api/goals', '/api/tasks', '/api/habits', '/api/books', '/api/community']) {
      const res = await request(getApp()).get(path).set(auth);
      assert.equal(res.status, 200, path);
      assert.equal(res.body.success, true);
      if (res.body.data?.pagination) {
        assert.equal(typeof res.body.data.pagination.hasMore, 'boolean');
      }
    }

    const search = await request(getApp()).get('/api/search').query({ q: 'react' }).set(auth);
    assert.equal(search.status, 200);

    const settings = await request(getApp()).get('/api/settings').set(auth);
    assert.equal(settings.status, 200);
    assert.equal(settings.body.success, true);

    const notes = await request(getApp()).get('/api/dashboard/notifications').set(auth);
    assert.equal(notes.status, 200);
  });

  it('AI/learning/career/research/productivity surfaces respond consistently', async () => {
    const ts = Date.now();
    const email = `rc-ai-${ts}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'RC AI', email, password: 'TestPass1', targetCareer: 'Data Scientist' });
    const token = signup.body.token;
    const auth = { Authorization: `Bearer ${token}` };
    await User.updateOne({ email }, { $set: { isEmailVerified: true, credits: 50 } });

    const learning = await request(getApp()).get('/api/learning/skills').set(auth);
    assert.equal(learning.status, 200);

    const career = await request(getApp()).get('/api/career/profile').set(auth);
    assert.ok([200, 201].includes(career.status));

    const research = await request(getApp()).get('/api/research/projects').set(auth);
    assert.equal(research.status, 200);

    const productivity = await request(getApp()).get('/api/productivity/workspace').set(auth);
    assert.equal(productivity.status, 200);

    const mentor = await request(getApp()).get('/api/mentor').set(auth);
    assert.equal(mentor.status, 200);

    const adaptive = await request(getApp()).get('/api/adaptive/profile').set(auth);
    assert.ok([200, 201].includes(adaptive.status));

    const personalization = await request(getApp()).get('/api/personalization/profile').set(auth);
    assert.equal(personalization.status, 200);

    const graph = await request(getApp()).get('/api/graph/nodes').set(auth);
    assert.equal(graph.status, 200);

    const reports = await request(getApp()).get('/api/reports').set(auth);
    assert.equal(reports.status, 200);

    const media = await request(getApp()).get('/api/media').set(auth);
    assert.equal(media.status, 200);

    const aiQuick = await request(getApp())
      .post('/api/ai/quick')
      .set(auth)
      .send({ prompt: 'Say hello in one sentence', mode: 'mentor' });
    assert.ok([200, 201].includes(aiQuick.status));
    assert.equal(aiQuick.body.success, true);
  });

  it('records AiUsage for research/career/productivity/adaptive/books sources', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({
        name: 'RC Usage',
        email: `rc-usage-${ts}@dreamwave.test`,
        password: 'TestPass1',
      });
    const user = await User.findById(signup.body.data.user.id || signup.body.data.user._id);
    assert.ok(user);

    for (const source of ['research', 'career', 'productivity', 'adaptive', 'books']) {
      await recordAiUsage(user, {
        mode: 'mentor',
        source,
        creditsUsed: 0,
        success: true,
        model: 'fallback',
      });
    }

    const count = await AiUsage.countDocuments({
      user: user._id,
      source: { $in: ['research', 'career', 'productivity', 'adaptive', 'books'] },
    });
    assert.equal(count, 5);
  });

  it('organization isolation: member cannot access foreign org routes', async () => {
    const ts = Date.now();
    const a = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Org A', email: `rc-orga-${ts}@dreamwave.test`, password: 'TestPass1' });
    const b = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Org B', email: `rc-orgb-${ts}@dreamwave.test`, password: 'TestPass1' });
    const tokenA = a.body.token;
    const tokenB = b.body.token;

    const org = await request(getApp())
      .post('/api/orgs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: `RC Org ${ts}`, type: 'company' });
    assert.ok([200, 201].includes(org.status));
    const orgId = org.body.data.organization.id;
    assert.ok(orgId);

    const denied = await request(getApp())
      .get(`/api/orgs/${orgId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.ok([401, 403, 404].includes(denied.status));
  });

  it('admin ops + background jobs complete for RC ops surface', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'RC Admin', email: `rc-admin-${ts}@dreamwave.test`, password: 'TestPass1' });
    const userId = signup.body.data.user.id || signup.body.data.user._id;
    await User.findByIdAndUpdate(userId, { role: 'admin', isEmailVerified: true });
    const token = signup.body.token;

    const opsHealth = await request(getApp())
      .get('/api/ops/health')
      .set('Authorization', `Bearer ${token}`);
    assert.ok([200, 503].includes(opsHealth.status));
    assert.equal(opsHealth.body.success, true);

    const readiness = await request(getApp())
      .get('/api/ops/readiness')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(readiness.status, 200);

    const summary = await runCleanupJobs();
    assert.ok(summary);
    assert.ok(typeof summary.latencyMs === 'number');
  });

  it('authz: unauthenticated protected routes reject consistently', async () => {
    for (const path of [
      '/api/goals',
      '/api/tasks',
      '/api/books',
      '/api/mentor',
      '/api/admin/users',
      '/api/ops/health',
    ]) {
      const res = await request(getApp()).get(path);
      assert.equal(res.status, 401, path);
      assert.equal(res.body.success, false);
      assert.equal(res.body.failureClass, 'auth');
    }
  });
});
