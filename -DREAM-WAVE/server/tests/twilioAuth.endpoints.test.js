/**
 * Integration-style unit tests for Twilio Verify auth helpers.
 * Mocks Twilio HTTP via a fake client injected through env + stub.
 *
 * Run: npm test
 */
const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-jwt-secret-dreamwave-twilio';
process.env.TWILIO_ACCOUNT_SID = 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
process.env.TWILIO_AUTH_TOKEN = 'testtoken';
process.env.TWILIO_VERIFY_SERVICE_SID = 'VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
process.env.NODE_ENV = 'test';

const {
  _resetGuards,
  _forceSendHistory,
  isPhoneVerified,
} = require('../utils/phoneOtpGuard');

const state = {
  sendShouldFail: false,
  sendError: null,
  verifyStatus: 'approved',
  verifyThrow: null,
};

function installTwilioStub() {
  const Module = require('module');
  const original = Module.prototype.require;
  Module.prototype.require = function stubbed(id) {
    if (id === 'twilio') {
      return function fakeTwilio() {
        return {
          verify: {
            v2: {
              services() {
                return {
                  verifications: {
                    async create() {
                      if (state.sendShouldFail) {
                        const err = state.sendError || new Error('Twilio down');
                        throw err;
                      }
                      return { status: 'pending' };
                    },
                  },
                  verificationChecks: {
                    async create({ code }) {
                      if (state.verifyThrow) throw state.verifyThrow;
                      if (state.verifyStatus === 'by-code') {
                        return { status: code === '123456' ? 'approved' : 'pending' };
                      }
                      return { status: state.verifyStatus };
                    },
                  },
                };
              },
            },
          },
        };
      };
    }
    return original.apply(this, arguments);
  };
  return () => {
    Module.prototype.require = original;
  };
}

describe('Twilio Verify auth endpoints', () => {
  let restore;
  let server;
  let baseUrl;
  let sendPhoneOtp;
  let verifyPhoneOtp;
  let mongod;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await _resetGuards();
    state.sendShouldFail = false;
    state.sendError = null;
    state.verifyStatus = 'by-code';
    state.verifyThrow = null;

    Object.keys(require.cache).forEach((k) => {
      if (k.includes('twilioVerify') || k.includes('authController') || k.includes('smsService')) {
        delete require.cache[k];
      }
    });

    restore = installTwilioStub();
    ;({ sendPhoneOtp, verifyPhoneOtp } = require('../controllers/authController'));

    const app = express();
    app.use(express.json());
    app.post('/api/auth/send-phone-otp', sendPhoneOtp);
    app.post('/api/auth/verify-phone-otp', verifyPhoneOtp);

    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    if (restore) restore();
    if (server) await new Promise((r) => server.close(r));
    Object.keys(require.cache).forEach((k) => {
      if (k.includes('twilioVerify') || k.includes('authController')) delete require.cache[k];
    });
  });

  async function post(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  it('Successful OTP send', async () => {
    const { status, data } = await post('/api/auth/send-phone-otp', {
      phone: '+919876543210',
    });
    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.equal(data.message, 'OTP sent successfully.');
  });

  it('Successful OTP verify', async () => {
    await post('/api/auth/send-phone-otp', { phone: '+919876543210' });
    const { status, data } = await post('/api/auth/verify-phone-otp', {
      phone: '+919876543210',
      code: '123456',
    });
    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.equal(data.verified, true);
    assert.equal(await isPhoneVerified('+919876543210'), true);
  });

  it('Wrong OTP', async () => {
    const { status, data } = await post('/api/auth/verify-phone-otp', {
      phone: '+919876543210',
      code: '000000',
    });
    assert.equal(status, 400);
    assert.equal(data.success, false);
    assert.equal(data.verified, false);
    assert.match(data.message, /Invalid or expired OTP/i);
  });

  it('Expired OTP (Twilio expired status)', async () => {
    state.verifyStatus = 'expired';
    const { status, data } = await post('/api/auth/verify-phone-otp', {
      phone: '+919876543210',
      code: '123456',
    });
    assert.equal(status, 400);
    assert.equal(data.verified, false);
  });

  it('Rate Limit — 5 per hour', async () => {
    const phone = '+919811122233';
    const now = Date.now();
    await _forceSendHistory(phone, [now - 1, now - 2, now - 3, now - 4, now - 5]);
    const { status, data } = await post('/api/auth/send-phone-otp', { phone });
    assert.equal(status, 429);
    assert.equal(data.message, 'Too Many Requests');
  });

  it('Twilio Failure', async () => {
    state.sendShouldFail = true;
    state.sendError = Object.assign(new Error('Service unavailable'), { code: 20500, status: 500 });
    const { status, data } = await post('/api/auth/send-phone-otp', {
      phone: '+919800011122',
    });
    assert.ok(status >= 400);
    assert.equal(data.success, false);
    assert.ok(data.message);
  });

  it('Invalid Number', async () => {
    const { status, data } = await post('/api/auth/send-phone-otp', {
      phone: '9876543210',
    });
    assert.equal(status, 400);
    assert.equal(data.message, 'Invalid Number');
  });
});
