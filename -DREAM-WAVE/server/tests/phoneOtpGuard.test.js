/**
 * Unit tests for phone OTP guards (Mongo-backed).
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

describe('phoneOtpGuard', () => {
  let guards;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    guards = require('../utils/phoneOtpGuard');
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await guards._resetGuards();
  });

  it('accepts valid E.164 and rejects invalid', () => {
    assert.equal(guards.assertE164('+919876543210'), '+919876543210');
    assert.throws(() => guards.assertE164('9876543210'), /Invalid Number/);
    assert.throws(() => guards.assertE164('+0123'), /Invalid Number/);
  });

  it('rate limits to 5 OTPs per hour per number', async () => {
    const phone = '+919876543210';
    const now = Date.now();
    await guards._forceSendHistory(phone, [now - 1000, now - 2000, now - 3000, now - 4000, now - 5000]);
    await assert.rejects(() => guards.assertCanSend(phone), (err) => {
      assert.equal(err.code, 'RATE_LIMIT');
      assert.equal(err.statusCode, 429);
      return true;
    });
    assert.equal(guards.MAX_SENDS_PER_HOUR, 5);
  });

  it('prevents duplicate rapid requests', async () => {
    const phone = '+919876543211';
    await guards.recordSend(phone);
    await assert.rejects(() => guards.assertCanSend(phone), (err) => {
      assert.equal(err.code, 'DUPLICATE_REQUEST');
      return true;
    });
  });

  it('tracks verified phones with consume', async () => {
    const phone = '+919876543212';
    assert.equal(await guards.isPhoneVerified(phone), false);
    await guards.markVerified(phone);
    assert.equal(await guards.isPhoneVerified(phone), true);
    assert.equal(await guards.consumeVerified(phone), true);
    assert.equal(await guards.isPhoneVerified(phone), false);
  });
});
