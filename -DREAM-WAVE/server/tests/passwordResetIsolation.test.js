const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const User = require('../models/User')
const PasswordReset = require('../models/PasswordReset')
const { createPasswordReset, consumePasswordReset } = require('../utils/authSecurity')

let mongod

describe('multi-portal password reset isolation', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), PasswordReset.deleteMany({})])
  })

  it('does not allow an OTP issued for one portal account to reset its sibling', async () => {
    const [student, company] = await User.create([
      { name: 'Student', email: 'owner@example.com', password: 'Password123', role: 'student' },
      { name: 'Company', email: 'owner@example.com', password: 'Password123', role: 'company' },
    ])
    let deliveredOtp = null
    await createPasswordReset({
      user: student,
      req: { headers: {}, socket: {}, ip: '127.0.0.1' },
      emailFn: async ({ otp }) => { deliveredOtp = otp },
    })

    assert.ok(deliveredOtp)
    assert.equal((await consumePasswordReset({ userId: company._id, otp: deliveredOtp })).ok, false)
    assert.equal((await consumePasswordReset({ userId: student._id, otp: deliveredOtp })).ok, true)
    assert.equal((await consumePasswordReset({ userId: student._id, otp: deliveredOtp })).ok, false)
  })
})
