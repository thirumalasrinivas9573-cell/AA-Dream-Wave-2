const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.JWT_SECRET = 'test-auth-hardening-secret-at-least-32-chars'

const User = require('../models/User')
const authController = require('../controllers/authController')
const { apiKeyMiddleware } = require('../src/mj/gateway/middleware/apiKey')

let mongod

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

describe('auth hardening (Prompt 10)', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await User.deleteMany({})
  })

  it('verifyOtp reset requires portal and binds to the correct account', async () => {
    await User.create([
      { name: 'Student', email: 'shared@example.com', password: 'Password123', role: 'student' },
      { name: 'Company', email: 'shared@example.com', password: 'Password123', role: 'company' },
    ])

    const missingPortal = response()
    await authController.verifyOtp(
      { body: { email: 'shared@example.com', otp: '123456', purpose: 'reset' } },
      missingPortal,
    )
    assert.equal(missingPortal.statusCode, 400)
    assert.equal(missingPortal.body.code, 'PORTAL_REQUIRED')

    const wrongPortal = response()
    await authController.verifyOtp(
      { body: { email: 'shared@example.com', otp: '123456', purpose: 'reset', portal: 'company' } },
      wrongPortal,
    )
    assert.equal(wrongPortal.statusCode, 400)
    assert.equal(wrongPortal.body.message, 'Invalid or expired verification code')
  })

  it('MJ gateway fails closed in production without MJ_API_KEY', () => {
    const previousEnv = process.env.NODE_ENV
    const previousKey = process.env.MJ_API_KEY
    process.env.NODE_ENV = 'production'
    delete process.env.MJ_API_KEY

    try {
      const res = response()
      let nextCalled = false
      apiKeyMiddleware({ headers: {}, mjRequestId: 'test-req' }, res, () => { nextCalled = true })
      assert.equal(nextCalled, false)
      assert.equal(res.statusCode, 503)
      assert.equal(res.body.code, 'MJ_DISABLED')
    } finally {
      process.env.NODE_ENV = previousEnv
      if (previousKey) process.env.MJ_API_KEY = previousKey
    }
  })
})
