#!/usr/bin/env node
/**
 * Lasya V3 Prompt 9 — partnership collaboration verification
 * Usage: node scripts/verify-partnership-collaboration.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionCompanyPartnership = require('../models/InstitutionCompanyPartnership')
const User = require('../models/User')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`
const results = []

function pass(name) {
  results.push({ name, ok: true })
  console.log(`  PASS  ${name}`)
}

function fail(name, detail) {
  results.push({ name, ok: false, detail })
  console.log(`  FAIL  ${name}${detail ? `: ${detail}` : ''}`)
}

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
    name: 'Collab Inst',
    email: `collab-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Collab University',
    onboardingCompleted: true,
  })
  const compUser = await User.create({
    name: 'Collab Co',
    email: `collab-comp-${ts}@test.com`,
    password: 'testpass123',
    role: 'company',
    organizationName: 'Collab Corp',
    onboardingCompleted: true,
  })
  const instUserB = await User.create({
    name: 'Other Inst',
    email: `collab-instb-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Other University',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)
  const compToken = sign(compUser._id)
  const instTokenB = sign(instUserB._id)

  await request('/partnerships/meta', { token: instToken })
  await request('/partnerships/meta', { token: compToken })
  await request('/partnerships/meta', { token: instTokenB })

  const company = await Company.findOne({ ownerUserId: compUser._id })
  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  const institutionB = await Institution.findOne({ ownerUserId: instUserB._id })

  if (!company || !institution) {
    console.error('Org profiles missing')
    process.exit(1)
  }

  const meta = await request('/partnerships/meta', { token: instToken })
  meta.status === 200 && meta.data.sharingScopes?.length ? pass('Meta includes sharing scopes') : fail('Meta includes sharing scopes', String(meta.status))

  const createOk = await request('/partnerships/requests', {
    method: 'POST',
    token: instToken,
    body: {
      companyId: company._id.toString(),
      relationshipType: 'Recruitment Partner',
      subject: 'Collaboration test',
      message: 'Scope test',
      requestedScopes: ['events', 'recruitment', 'placement'],
    },
  })
  const partnershipId = createOk.data?.partnership?.id || createOk.data?.partnership?._id
  createOk.status === 201 ? pass('Create partnership request') : fail('Create partnership request', JSON.stringify(createOk.data))

  const idor = await request(`/partnerships/${partnershipId}`, { token: instTokenB })
  idor.status === 403 ? pass('IDOR blocked for other institution') : fail('IDOR blocked', String(idor.status))

  const accept = await request(`/partnerships/${partnershipId}/accept`, {
    method: 'POST',
    token: compToken,
    body: { responseMessage: 'Accepted' },
  })
  accept.status === 200 ? pass('Accept via /accept alias') : fail('Accept', JSON.stringify(accept.data))

  const scopes = accept.data?.partnership?.sharingScopes || []
  scopes.includes('recruitment') ? pass('Default scopes applied on accept') : fail('Default scopes', scopes.join(','))

  const workspace = await request(`/partnerships/${partnershipId}/workspace`, { token: instToken })
  workspace.status === 200 ? pass('Workspace summary') : fail('Workspace summary', String(workspace.status))

  const scopePatch = await request(`/partnerships/${partnershipId}/scope`, {
    method: 'PATCH',
    token: compToken,
    body: { scopes: ['events', 'recruitment'] },
  })
  scopePatch.status === 200 ? pass('Scope update') : fail('Scope update', JSON.stringify(scopePatch.data))

  const invalidTransition = await request(`/partnerships/${partnershipId}`, {
    method: 'PATCH',
    token: instToken,
    body: { status: 'active' },
  })
  invalidTransition.status === 400 ? pass('Invalid status transition rejected') : fail('Invalid transition', String(invalidTransition.status))

  const pause = await request(`/partnerships/${partnershipId}/pause`, {
    method: 'POST',
    token: instToken,
  })
  pause.status === 200 ? pass('Pause partnership') : fail('Pause', JSON.stringify(pause.data))

  const scopeWhilePaused = await request(`/partnerships/${partnershipId}/scope`, {
    method: 'PATCH',
    token: compToken,
    body: { scopes: ['events'] },
  })
  scopeWhilePaused.status === 400 ? pass('Scope update blocked when paused') : fail('Scope while paused', String(scopeWhilePaused.status))

  const reactivate = await request(`/partnerships/${partnershipId}`, {
    method: 'PATCH',
    token: compToken,
    body: { status: 'active' },
  })
  reactivate.status === 200 ? pass('Reactivate from paused') : fail('Reactivate', String(reactivate.status))

  const rejectFlow = await request('/partnerships/requests', {
    method: 'POST',
    token: instToken,
    body: {
      companyId: company._id.toString(),
      relationshipType: 'Industry Partner',
      subject: 'Should fail duplicate',
    },
  })
  rejectFlow.status === 409 ? pass('Duplicate active partnership prevented') : fail('Duplicate prevention', String(rejectFlow.status))

  const ai = await request(`/partnerships/${partnershipId}/ai/insights`, {
    method: 'POST',
    token: instToken,
    body: { intent: 'PARTNERSHIP_SUMMARY' },
  })
  ai.status === 200 && ai.data.insight ? pass('AI collaboration insight') : fail('AI insight', String(ai.status))

  const dashboard = await request('/partnerships/collaboration/dashboard', { token: instToken })
  dashboard.status === 200 ? pass('Collaboration dashboard') : fail('Dashboard', String(dashboard.status))

  const cancel = await request(`/partnerships/${partnershipId}/cancel`, {
    method: 'POST',
    token: compToken,
  })
  cancel.status === 200 ? pass('Cancel partnership') : fail('Cancel', JSON.stringify(cancel.data))

  const workspaceAfterCancel = await request(`/partnerships/${partnershipId}/workspace`, { token: instToken })
  const jobsBlocked = !(workspaceAfterCancel.data?.workspace?.shared?.jobs?.length)
  workspaceAfterCancel.status === 200 && jobsBlocked ? pass('Cancelled partnership restricts shared access') : fail('Post-cancel access')

  const massAssign = await request(`/partnerships/${partnershipId}`, {
    method: 'PATCH',
    token: instToken,
    body: { status: 'active', sharingScopes: ['analytics'], institutionId: institutionB._id.toString() },
  })
  const pAfter = await InstitutionCompanyPartnership.findById(partnershipId).lean()
  massAssign.status !== 500 &&
    pAfter.institutionId.toString() === institution._id.toString() &&
    pAfter.status === 'terminated'
    ? pass('Mass assignment fields ignored')
    : fail('Mass assignment', `status=${pAfter?.status}`)

  await InstitutionCompanyPartnership.deleteMany({
    $or: [{ institutionId: institution._id }, { institutionId: institutionB._id }],
  })
  await Institution.deleteMany({ _id: { $in: [institution._id, institutionB._id] } })
  await Company.deleteOne({ _id: company._id })
  await User.deleteMany({ _id: { $in: [instUser._id, compUser._id, instUserB._id] } })
  await mongoose.disconnect()

  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`\nCollaboration verify: ${passed}/${results.length} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
