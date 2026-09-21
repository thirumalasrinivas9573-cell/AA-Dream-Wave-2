const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { boot, shutdown, getApp } = require('./helpers/harness');
const { withRetry, withTimeout, classifyFailure } = require('../utils/retry');
const { pingDatabase } = require('../config/db');
const {
  runCleanupJobs,
  getJobStatus,
  deleteManyBatched,
} = require('../services/jobRunner');
const Notification = require('../models/Notification');

describe('Scalability & reliability (RC1 P8)', () => {
  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  it('withTimeout rejects slow work and withRetry recovers transient errors', async () => {
    await assert.rejects(
      () => withTimeout(() => new Promise((r) => setTimeout(r, 200)), 50, 'slow_op'),
      /timed out/
    );

    let attempts = 0;
    const value = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          const err = new Error('temporary network blip');
          throw err;
        }
        return 'ok';
      },
      { retries: 3, baseDelayMs: 10 }
    );
    assert.equal(value, 'ok');
    assert.equal(attempts, 3);
    assert.equal(classifyFailure({ message: 'timed out' }, 504), 'timeout');
  });

  it('readiness probe pings the database', async () => {
    const ping = await pingDatabase({ timeoutMs: 3000 });
    assert.equal(ping.ok, true);
    assert.ok(typeof ping.latencyMs === 'number');

    const ready = await request(getApp()).get('/api/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.status, 'ready');
    assert.ok(typeof ready.body.pingMs === 'number');
  });

  it('background cleanup runs with isolated step failures and reports status', async () => {
    const summary = await runCleanupJobs();
    assert.ok(summary);
    assert.ok(typeof summary.latencyMs === 'number');
    assert.ok(typeof summary.stepFailures === 'number');
    const status = getJobStatus();
    assert.equal(status.running, false);
    assert.ok(status.lastRun);
    assert.equal(status.consecutiveFailures, 0);
  });

  it('batched deletes remove documents without a single unbounded deleteMany', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Reli User', email: `reli-${ts}@dreamwave.test`, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const userId = signup.body.data.user.id || signup.body.data.user._id;

    await Notification.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        user: userId,
        title: `reli-note-${i}`,
        message: 'cleanup',
        read: true,
      }))
    );

    const deleted = await deleteManyBatched(
      Notification,
      {
        user: userId,
        title: { $regex: /^reli-note-/ },
      },
      { batchSize: 2, maxBatches: 10 }
    );
    assert.ok(deleted >= 5);
    const left = await Notification.countDocuments({ user: userId, title: { $regex: /^reli-note-/ } });
    assert.equal(left, 0);
  });

  it('hot endpoints remain responsive under serial load', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Load User', email: `load-${ts}@dreamwave.test`, password: 'TestPass1' });
    const token = signup.body.token;
    const paths = ['/api/goals', '/api/tasks', '/api/habits', '/api/health', '/api/ready'];
    const samples = [];
    for (let round = 0; round < 3; round += 1) {
      for (const path of paths) {
        const t0 = Date.now();
        const req = request(getApp()).get(path);
        if (path.startsWith('/api/g') || path.startsWith('/api/t') || path.startsWith('/api/h')) {
          if (path !== '/api/health') req.set('Authorization', `Bearer ${token}`);
        }
        const res = await req;
        samples.push(Date.now() - t0);
        assert.ok([200, 201].includes(res.status), `${path} => ${res.status}`);
      }
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    assert.ok(avg < 2500, `avg latency ${avg}ms`);
  });

  it('orphan repair does not require loading all users', async () => {
    const { repairOrphanUserRefs } = require('../services/userCascadeService');
    const summary = await repairOrphanUserRefs({ limit: 50 });
    assert.ok(summary);
    assert.ok(typeof summary.Goal === 'number');
    assert.ok(typeof summary.Task === 'number');
  });
});
