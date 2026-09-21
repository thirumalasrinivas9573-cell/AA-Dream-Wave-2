const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { boot, shutdown, getApp } = require('./helpers/harness');
const {
  collectProductionErrors,
  parseOrigins,
  isValidOrigin,
  envSchema,
} = require('../config/env');
const { APP_VERSION, getReleaseInfo, resolveReleaseChannel } = require('../config/release');
const User = require('../models/User');

describe('Production release readiness (RC1 P10 / v1.0.0)', () => {
  before(async () => {
    await boot();
  });

  after(async () => {
    await shutdown();
  });

  it('pins backend package version to 1.0.0', () => {
    assert.equal(APP_VERSION, '1.0.0');
    const info = getReleaseInfo({ NODE_ENV: 'production' });
    assert.equal(info.version, '1.0.0');
    assert.equal(info.channel, 'stable');
    assert.match(info.phase, /Production Release v1\.0\.0/);
  });

  it('resolves release channel defaults by environment', () => {
    assert.equal(resolveReleaseChannel({ NODE_ENV: 'production' }), 'stable');
    assert.equal(resolveReleaseChannel({ NODE_ENV: 'test' }), 'test');
    assert.equal(resolveReleaseChannel({ NODE_ENV: 'development' }), 'development');
    assert.equal(
      resolveReleaseChannel({ NODE_ENV: 'production', RELEASE_CHANNEL: 'canary' }),
      'canary'
    );
  });

  it('production env gate rejects insecure configurations', () => {
    const base = {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/dreamwave',
      JWT_SECRET: 'x'.repeat(32),
      JWT_REFRESH_SECRET: 'x'.repeat(32),
      CLIENT_URL: 'http://localhost:5173',
      ADMIN_EMAIL: '',
      SMTP_HOST: '',
      SMTP_USER: '',
      SMTP_PASS: '',
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      STRIPE_PRICE_PRO: '',
      STRIPE_PRICE_TEAM: '',
      BILLING_ENABLED: '',
    };
    const errors = collectProductionErrors(base, {});
    assert.ok(errors.some((e) => /JWT_REFRESH_SECRET must differ/.test(e)));
    assert.ok(errors.some((e) => /https/.test(e)));
    assert.ok(errors.some((e) => /SMTP_HOST/.test(e)));
    assert.ok(errors.some((e) => /ADMIN_EMAIL/.test(e)));
    assert.ok(errors.some((e) => /localhost/.test(e)));
  });

  it('production billing gate requires Stripe secrets and price IDs', () => {
    const errors = collectProductionErrors(
      {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://cluster/dreamwave',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        CLIENT_URL: 'https://app.dreamwave.ai',
        ADMIN_EMAIL: 'admin@dreamwave.ai',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'mailer',
        SMTP_PASS: 'secret',
        BILLING_ENABLED: '1',
        STRIPE_SECRET_KEY: 'sk_test',
        STRIPE_WEBHOOK_SECRET: '',
        STRIPE_PRICE_PRO: '',
        STRIPE_PRICE_TEAM: '',
      },
      {}
    );
    assert.ok(errors.some((e) => /STRIPE_WEBHOOK_SECRET/.test(e)));
    assert.ok(errors.some((e) => /STRIPE_PRICE_PRO/.test(e)));
    assert.ok(errors.some((e) => /STRIPE_PRICE_TEAM/.test(e)));
  });

  it('accepts a complete production configuration', () => {
    const errors = collectProductionErrors(
      {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://cluster/dreamwave',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        CLIENT_URL: 'https://app.dreamwave.ai',
        ADMIN_EMAIL: 'admin@dreamwave.ai',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'mailer',
        SMTP_PASS: 'secret',
        BILLING_ENABLED: '1',
        STRIPE_SECRET_KEY: 'sk_live',
        STRIPE_WEBHOOK_SECRET: 'whsec',
        STRIPE_PRICE_PRO: 'price_pro',
        STRIPE_PRICE_TEAM: 'price_team',
      },
      {}
    );
    assert.deepEqual(errors, []);
  });

  it('CORS origin helpers reject wildcards and non-http(s)', () => {
    assert.equal(isValidOrigin('*'), false);
    assert.equal(isValidOrigin('ftp://bad'), false);
    assert.equal(isValidOrigin('https://app.dreamwave.ai'), true);
    assert.deepEqual(parseOrigins('https://a.com, https://b.com'), [
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('env schema accepts release channel stable', () => {
    const parsed = envSchema.safeParse({
      MONGODB_URI: 'mongodb://127.0.0.1/test',
      JWT_SECRET: 'z'.repeat(32),
      RELEASE_CHANNEL: 'stable',
      NODE_ENV: 'test',
    });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.RELEASE_CHANNEL, 'stable');
  });

  it('health and ops readiness advertise production release metadata', async () => {
    const health = await request(getApp()).get('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.version, '1.0.0');

    const ts = Date.now();
    const signup = await request(getApp())
      .post('/api/auth/signup')
      .send({
        name: 'Release Admin',
        email: `rel-admin-${ts}@dreamwave.test`,
        password: 'TestPass1',
      });
    const userId = signup.body.data.user.id || signup.body.data.user._id;
    await User.findByIdAndUpdate(userId, { role: 'admin', isEmailVerified: true });

    const readiness = await request(getApp())
      .get('/api/ops/readiness')
      .set('Authorization', `Bearer ${signup.body.token}`);
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.data.version, '1.0.0');
    assert.equal(readiness.body.data.phase, 'Production Release v1.0.0');
    assert.equal(readiness.body.data.checks.releaseVersionPinned, true);
    assert.ok(Array.isArray(readiness.body.data.modules));
    assert.ok(readiness.body.data.modules.length >= 20);
  });
});
