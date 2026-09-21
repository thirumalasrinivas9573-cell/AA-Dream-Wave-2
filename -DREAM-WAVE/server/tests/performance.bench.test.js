const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { boot, shutdown, getApp } = require('./helpers/harness');
const { timedDb, getMetricsSnapshot } = require('../utils/metrics');
const graph = require('../services/knowledgeGraphService');
const User = require('../models/User');

describe('Performance benchmarks (RC1 P3)', () => {
  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  it('hot list endpoints respond under budget', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Perf User', email: `perf-${ts}@dreamwave.test`, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    const samples = [];
    for (const path of ['/api/tasks', '/api/goals', '/api/habits', '/api/dashboard/notifications']) {
      const t0 = Date.now();
      const res = await request(getApp()).get(path).set('Authorization', `Bearer ${token}`);
      samples.push({ path, ms: Date.now() - t0, status: res.status });
      assert.ok([200, 201].includes(res.status), `${path} status ${res.status}`);
      assert.ok(Date.now() - t0 < 3000, `${path} too slow`);
    }

    const health = await request(getApp()).get('/api/health');
    assert.equal(health.status, 200);

    const mem = process.memoryUsage();
    assert.ok(mem.heapUsed > 0);

    console.log(
      JSON.stringify({
        type: 'perf_benchmark',
        samples,
        memoryMb: {
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          rss: Math.round(mem.rss / 1024 / 1024),
        },
        metrics: {
          avgLatencyMs: getMetricsSnapshot().avgLatencyMs,
          slowEndpoints: getMetricsSnapshot().slowEndpoints.slice(0, 5),
        },
      })
    );
  });

  it('knowledge graph rebuild completes under budget via bulkWrite', async () => {
    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Graph Perf', email: `gperf-${ts}@dreamwave.test`, password: 'TestPass1' });
    const token = signup.body.token;
    const userId = signup.body.data.user.id;
    await User.findByIdAndUpdate(userId, { role: 'admin' });
    const user = await User.findById(userId);

    const result = await timedDb('graph.rebuild', () => graph.rebuildGraph({ user }));
    assert.ok(result.nodesUpserted >= 1);

    const rebuild = await request(getApp())
      .post('/api/graph/rebuild')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(rebuild.status, 200);
    assert.ok(rebuild.body.data.rebuild.nodesUpserted >= 1);

    const snap = getMetricsSnapshot();
    const graphOp = (snap.dbOperations || []).find((d) => d.name === 'graph.rebuild');
    if (graphOp) {
      assert.ok(graphOp.maxMs < 15000, `graph rebuild maxMs ${graphOp.maxMs}`);
    }
  });
});
