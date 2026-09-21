#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Institution = require('../models/Institution')
const InstitutionStudent = require('../models/InstitutionStudent')
const InstitutionExecutiveAuditLog = require('../models/InstitutionExecutiveAuditLog')

const BASE = `http://localhost:${process.env.PORT || 5001}/api`

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function sign(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

function assert(label, condition, detail) {
  if (!condition) throw new Error(`${label}: FAIL${detail ? ` — ${detail}` : ''}`)
  console.log(`${label}: OK`)
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL)
  const ts = Date.now()

  const instUser = await User.create({
    name: 'Command Center Institution',
    email: `cmd-inst-${ts}@test.com`,
    password: 'testpass123',
    role: 'institution',
    organizationName: 'Command Center University',
    onboardingCompleted: true,
  })

  const instToken = sign(instUser._id)

  await request('/institution/students/meta', { token: instToken })

  const institution = await Institution.findOne({ ownerUserId: instUser._id })
  if (!institution) {
    await Institution.create({
      ownerUserId: instUser._id,
      name: 'Command Center University',
      email: instUser.email,
    })
  }
  const inst = await Institution.findOne({ ownerUserId: instUser._id })
  if (!inst) throw new Error('Institution missing')

  await InstitutionStudent.create({
    institutionId: inst._id,
    studentId: `CMD-${ts}`,
    fullName: 'Command Center Student',
    email: `cmd-student-${ts}@test.com`,
    department: 'Computer Science',
    batch: '2024',
    semester: 'Sem 6',
    academicYear: '2025-26',
    status: 'active',
    cgpa: 8.2,
    attendance: 88,
    placement: { lifecycleStatus: 'ELIGIBLE', status: 'placement-ready' },
  })

  const overviewRes = await request('/institution/command-center/overview', { token: instToken })
  assert('Overview', overviewRes.status === 200, JSON.stringify(overviewRes.data))

  const o = overviewRes.data.overview
  assert('Industry intelligence', o.industryIntelligence?.hasData !== undefined)
  assert('Quality intelligence', o.qualityIntelligence?.hasData !== undefined)
  assert('Outcome intelligence', o.outcomeIntelligence?.hasData !== undefined)
  assert('Executive insights', Array.isArray(o.executiveInsights))
  assert('Signals', Array.isArray(o.signals))
  assert('Actions with routes', o.actions?.every((a) => a.route))

  const filtered = await request('/institution/command-center/overview?period=last30days', { token: instToken })
  assert('Time filter (30 days)', filtered.status === 200)

  if (o.filterOptions?.academicYears?.length) {
    const yearFilter = await request(
      `/institution/command-center/overview?academicYear=${encodeURIComponent(o.filterOptions.academicYears[0])}`,
      { token: instToken },
    )
    assert('Academic year filter', yearFilter.status === 200)
    assert('Comparison engine', Array.isArray(yearFilter.data.overview?.comparisons))
  } else {
    console.log('Comparison engine: SKIP (no academic years)')
  }

  const analyticsRes = await request('/institution/command-center/analytics', { token: instToken })
  assert('Executive analytics', analyticsRes.status === 200)
  const a = analyticsRes.data.analytics
  assert('Analytics strategic KPIs', Array.isArray(a.strategicKPIs) && a.strategicKPIs.length > 0)
  assert('Analytics department performance', typeof a.departmentWisePerformance === 'object')
  assert('Analytics institutional health', typeof a.institutionalHealthScore === 'number')

  const kpisRes = await request('/institution/command-center/kpis', { token: instToken })
  assert('Strategic KPIs endpoint', kpisRes.status === 200 && Array.isArray(kpisRes.data.kpis))

  const copilotRes = await request('/institution/command-center/copilot', { token: instToken })
  assert('AI copilot', copilotRes.status === 200 && Array.isArray(copilotRes.data.insights))

  const typesRes = await request('/institution/command-center/reports/types', { token: instToken })
  assert('Report types', typesRes.status === 200 && typesRes.data.reportTypes?.length === 11)

  const previewRes = await request('/institution/command-center/reports/executive_summary?page=1&limit=10', {
    token: instToken,
  })
  assert('Report preview', previewRes.status === 200 && Array.isArray(previewRes.data.report?.header))

  const exportCsv = await request('/institution/command-center/reports/executive_summary/export?format=csv', {
    token: instToken,
  })
  assert('CSV export', exportCsv.status === 200 && exportCsv.data.export?.content)

  const exportXlsx = await request('/institution/command-center/reports/executive_summary/export?format=xlsx', {
    token: instToken,
  })
  assert('XLSX export', exportXlsx.status === 200 && exportXlsx.data.export?.content)

  const exportPdf = await request('/institution/command-center/reports/executive_summary/export?format=pdf', {
    token: instToken,
  })
  assert('PDF export', exportPdf.status === 200 && exportPdf.data.export?.content)

  const auditRes = await request('/institution/command-center/audit?limit=20', { token: instToken })
  assert('Audit log API', auditRes.status === 200 && Array.isArray(auditRes.data.auditLog))

  const auditCount = await InstitutionExecutiveAuditLog.countDocuments({ institutionId: inst._id })
  assert('Audit trail persisted', auditCount > 0, `count=${auditCount}`)

  const denied = await request('/institution/command-center/overview')
  assert('Auth required', denied.status === 401)

  await InstitutionExecutiveAuditLog.deleteMany({ institutionId: inst._id })
  await InstitutionStudent.deleteMany({ institutionId: inst._id })
  await Institution.deleteMany({ _id: inst._id })
  await User.deleteMany({ _id: instUser._id })
  await mongoose.disconnect()
  console.log('Institution command center verification complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
