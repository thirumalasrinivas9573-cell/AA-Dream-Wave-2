const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { boot, shutdown, getApp } = require('./helpers/harness');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { sendSuccess } = require('../utils/apiResponse');
const schemas = require('../config/schemas');

describe('API consistency (RC1 P7)', () => {
  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  it('pagination helpers expose canonical meta including hasMore', () => {
    const parsed = parsePagination({ page: '2', limit: '10' }, { defaultLimit: 50, maxLimit: 100 });
    assert.deepEqual(parsed, { page: 2, limit: 10, skip: 10 });
    const meta = paginationMeta(2, 10, 25);
    assert.equal(meta.page, 2);
    assert.equal(meta.limit, 10);
    assert.equal(meta.total, 25);
    assert.equal(meta.pages, 3);
    assert.equal(meta.hasMore, true);
    assert.equal(paginationMeta(3, 10, 25).hasMore, false);
  });

  it('sendSuccess builds the standard success envelope', () => {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    sendSuccess(res, { ok: true }, { message: 'done', meta: { requestId: 'r1' } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, { ok: true });
    assert.equal(res.body.message, 'done');
    assert.deepEqual(res.body.meta, { requestId: 'r1' });
  });

  it('validation errors use failureClass validation', async () => {
    const res = await request(getApp()).post('/api/auth/signup').send({
      name: 'X',
      email: 'not-an-email',
      password: 'short',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.failureClass, 'validation');
    assert.ok(typeof res.body.message === 'string' && res.body.message.length > 0);
  });

  it('rejects invalid pagination query params', async () => {
    const email = `api-cons-${Date.now()}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'API Cons', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;
    assert.ok(token);

    const bad = await request(getApp())
      .get('/api/goals')
      .query({ page: 0, limit: 999 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(bad.status, 400);
    assert.equal(bad.body.failureClass, 'validation');
  });

  it('list endpoints return nested pagination with hasMore', async () => {
    const email = `api-page-${Date.now()}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Page User', email, password: 'TestPass1' });
    assert.equal(signup.status, 201);
    const token = signup.body.token;

    await request(getApp())
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Consistency Goal', category: 'career' });

    const list = await request(getApp())
      .get('/api/goals')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.success, true);
    const pagination = list.body.data.pagination;
    assert.ok(pagination);
    assert.equal(typeof pagination.page, 'number');
    assert.equal(typeof pagination.limit, 'number');
    assert.equal(typeof pagination.total, 'number');
    assert.equal(typeof pagination.pages, 'number');
    assert.equal(typeof pagination.hasMore, 'boolean');
    assert.ok(pagination.total >= 1);
  });

  it('ops health keeps success true while reflecting status in data', async () => {
    const email = `ops-cons-${Date.now()}@dreamwave.test`;
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({ name: 'Ops Cons', email, password: 'TestPass1' });
    const userId = signup.body.data.user.id || signup.body.data.user._id;
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, { role: 'admin', isEmailVerified: true });

    const opsHealth = await request(getApp())
      .get('/api/ops/health')
      .set('Authorization', `Bearer ${signup.body.token}`);
    assert.ok([200, 503].includes(opsHealth.status));
    assert.equal(opsHealth.body.success, true);
    assert.ok(opsHealth.body.data);
    assert.ok(opsHealth.body.data.api || opsHealth.body.data.database);
  });

  it('query schemas coerce pagination fields', () => {
    const parsed = schemas.paginationQuery.safeParse({ page: '3', limit: '15', extra: 'keep' });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.page, 3);
    assert.equal(parsed.data.limit, 15);
    assert.equal(parsed.data.extra, 'keep');
  });

  it('auth errors keep structured failureClass', async () => {
    const res = await request(getApp())
      .post('/api/auth/login')
      .send({ email: 'missing@dreamwave.test', password: 'WrongPass1' });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.failureClass, 'auth');
  });
});
