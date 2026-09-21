#!/usr/bin/env node
/**
 * Smoke-test partnership API endpoints (requires running server + MongoDB).
 * Usage: node scripts/verify-partnerships.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const User = require('../models/User')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function sign(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

async function main() {
  const url = process.env.MONGODB_URL?.trim()
  if (!url) {
    console.error('MONGODB_URL not set')
    process.exit(1)
  }
  await mongoose.connect(url)

  const ts = Date.now()
  const instUser = await User.create({
    name: 'Test Institution',
    email: `inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Test University',
    onboardingCompleted: true,
  })
  const compUser = await User.create({
    name: 'Test Company',
    email: `comp-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'Test Corp',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const compToken = sign(compUser._id)

  // Resolve org profiles via API (auto-create)
  await request('/partnerships/meta', { token: instToken })
  await request('/partnerships/meta', { token: compToken })

  const company = await Company.findOne({ ownerUserId: compUser._id })
  const institution = await Institution.findOne({ ownerUserId: instUser._id })

  const meta = await request('/partnerships/meta', { token: instToken })
  console.log('Meta:', meta.status === 200 ? 'OK' : meta.data)

  const createInvalid = await request('/partnerships/requests', {
    method: 'POST',
    token: instToken,
    body: {
      companyId: '000000000000000000000000',
      relationshipType: 'Recruitment Partner',
      subject: 'Test',
    },
  })
  console.log('Invalid company:', createInvalid.status === 404 ? 'OK (404)' : createInvalid.status)

  if (!company || !institution) {
    console.error('Org profiles not created')
    process.exit(1)
  }

  const createOk = await request('/partnerships/requests', {
    method: 'POST',
    token: instToken,
    body: {
      companyId: company._id.toString(),
      relationshipType: 'Recruitment Partner',
      subject: 'Campus recruitment',
      message: 'Partnership request',
    },
  })
  console.log('Create request:', createOk.status === 201 ? 'OK' : createOk.data)

  const partnershipId = createOk.data?.partnership?.id || createOk.data?.partnership?._id

  const accept = await request(`/partnerships/${partnershipId}/respond`, {
    method: 'POST',
    token: compToken,
    body: { action: 'accept', responseMessage: 'Welcome' },
  })
  console.log('Accept:', accept.status === 200 ? 'OK' : accept.data)

  const duplicate = await request('/partnerships/requests', {
    method: 'POST',
    token: instToken,
    body: {
      companyId: company._id.toString(),
      relationshipType: 'Internship Partner',
      subject: 'Duplicate',
    },
  })
  console.log('Duplicate prevention:', duplicate.status === 409 ? 'OK (409)' : duplicate.status)

  const stats = await request('/partnerships/stats', { token: instToken })
  console.log('Stats:', stats.status === 200 ? 'OK' : stats.data)

  await InstitutionCompanyPartnership.deleteMany({ institutionId: institution._id })
  await Institution.deleteOne({ _id: institution._id })
  await Company.deleteOne({ _id: company._id })
  await User.deleteMany({ _id: { $in: [instUser._id, compUser._id] } })
  await mongoose.disconnect()
  console.log('Partnership verification complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
