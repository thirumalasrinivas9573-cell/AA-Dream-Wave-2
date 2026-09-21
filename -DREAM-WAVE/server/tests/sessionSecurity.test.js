const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.JWT_SECRET = 'test-session-secret-at-least-32-characters-long'
process.env.JWT_ACCESS_TTL = '15m'

const RefreshToken = require('../models/RefreshToken')
const User = require('../models/User')
const {
  issueSession,
  rotateRefreshToken,
  revokeRefreshToken,
  isSessionFamilyActive,
} = require('../utils/tokenService')

let mongod

describe('session security', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await Promise.all([RefreshToken.deleteMany({}), User.deleteMany({})])
  })

  it('binds access tokens to an active session family', async () => {
    const user = await User.create({
      name: 'Session User',
      email: 'session@example.com',
      password: 'Password123',
      role: 'student',
    })
    const session = await issueSession(user._id, { userAgent: 'test' })
    const decoded = jwt.verify(session.token, process.env.JWT_SECRET, {
      issuer: 'dream-wave-api',
      audience: 'dream-wave-client',
    })
    assert.equal(decoded.type, 'access')
    assert.ok(decoded.sid)
    assert.equal(await isSessionFamilyActive(user._id, decoded.sid), true)

    await revokeRefreshToken(session.refreshToken)
    assert.equal(await isSessionFamilyActive(user._id, decoded.sid), false)
  })

  it('atomically rotates and revokes a family when an old token is replayed', async () => {
    const user = await User.create({
      name: 'Rotation User',
      email: 'rotation@example.com',
      password: 'Password123',
      role: 'student',
    })
    const session = await issueSession(user._id)
    const rotated = await rotateRefreshToken(session.refreshToken)
    assert.ok(rotated?.refreshToken)

    const replay = await rotateRefreshToken(session.refreshToken)
    assert.equal(replay, null)
    const rotatedAccess = jwt.decode(rotated.accessToken)
    assert.equal(await isSessionFamilyActive(user._id, rotatedAccess.sid), false)
    assert.equal(await rotateRefreshToken(rotated.refreshToken), null)
  })
})
