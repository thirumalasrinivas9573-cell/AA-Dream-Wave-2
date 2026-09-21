const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const { PassThrough } = require('stream')

const User = require('../models/User')
const StudentProfile = require('../models/StudentProfile')
const CareerProfile = require('../models/CareerProfile')
const Resume = require('../models/Resume')
const CompanyProfile = require('../models/CompanyProfile')
const Job = require('../models/Job')
const Internship = require('../models/Internship')
const Application = require('../models/Application')
const Bookmark = require('../models/Bookmark')
const Notification = require('../models/Notification')
const career = require('../controllers/careerController')

let mongod
let student
let otherStudent
let companyOwner
let company
let job
let internship

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    setHeader(key, value) { this.headers[key] = value },
    set(key, value) { this.headers[key] = value; return this },
  }
}

async function invoke(handler, { currentUser = student, body = {}, params = {}, query = {} } = {}) {
  const res = response()
  await handler({ user: { _id: currentUser._id, id: currentUser._id, role: currentUser.role }, body, params, query }, res)
  return res
}

describe('Career Hub', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}), StudentProfile.deleteMany({}), CareerProfile.deleteMany({}), Resume.deleteMany({}),
      CompanyProfile.deleteMany({}), Job.deleteMany({}), Internship.deleteMany({}), Application.deleteMany({}),
      Bookmark.deleteMany({}), Notification.deleteMany({}),
    ])
    student = await User.create({ name: 'Asha Student', email: 'asha.career@example.com', password: 'StrongPass123!', role: 'student', phone: '+919876543210' })
    otherStudent = await User.create({ name: 'Other Student', email: 'other.career@example.com', password: 'StrongPass123!', role: 'student' })
    companyOwner = await User.create({ name: 'Hiring Company', email: 'hiring@example.com', password: 'StrongPass123!', role: 'company' })
    await StudentProfile.create({
      userId: student._id,
      username: 'asha-career',
      displayName: 'Asha Student',
      headline: 'Frontend Engineer',
      bio: 'I build accessible web products.',
      location: 'Hyderabad',
      academic: { institution: 'Dream Institute', course: 'B.Tech', department: 'Computer Science', cgpa: 9.1 },
      skills: [{ name: 'React', type: 'framework', proficiency: 85 }, { name: 'JavaScript', type: 'programming-language', proficiency: 88 }, { name: 'CSS', type: 'technical', proficiency: 80 }],
      projects: [{ title: 'Career Dashboard', description: 'Student career workspace', technologies: ['React'], visibility: 'public' }],
    })
    company = await CompanyProfile.create({ ownerId: companyOwner._id, slug: 'verified-tech', name: 'Verified Tech', status: 'approved', isPublic: true, industry: 'Software', contact: { city: 'Hyderabad' } })
    job = await Job.create({ companyId: company._id, title: 'Frontend Engineer', description: 'Build accessible React products', location: 'Hyderabad', workMode: 'hybrid', type: 'full-time', skills: ['React', 'JavaScript'], salaryMin: 600000, salaryMax: 900000, status: 'open', deadline: new Date(Date.now() + 86400000) })
    internship = await Internship.create({ companyId: company._id, title: 'Frontend Intern', description: 'Learn production React', location: 'Remote', workMode: 'remote', skills: ['React'], duration: '6 months', stipend: 25000, status: 'open', deadline: new Date(Date.now() + 86400000) })
  })

  it('persists career preferences with optimistic revision control', async () => {
    const initial = await invoke(career.getProfile)
    assert.equal(initial.statusCode, 200)
    const updated = await invoke(career.updateProfile, { body: {
      revision: initial.body.profile.revision,
      targetCareer: 'Frontend Engineer',
      targetRoles: ['Frontend Engineer', 'UI Engineer'],
      preferredLocations: ['Hyderabad', 'Remote'],
      requiredSkills: ['React', 'TypeScript'],
      preferredWorkModes: ['hybrid', 'remote'],
    } })
    assert.equal(updated.body.profile.targetCareer, 'Frontend Engineer')
    assert.deepEqual(updated.body.profile.requiredSkills, ['React', 'TypeScript'])
    const conflict = await invoke(career.updateProfile, { body: { revision: initial.body.profile.revision, targetCareer: 'Stale update' } })
    assert.equal(conflict.statusCode, 409)
  })

  it('creates profile-seeded resumes, autosaves sections and computes ATS architecture', async () => {
    const created = await invoke(career.createResume, { body: { title: 'Frontend Resume', template: 'modern', fromProfile: true } })
    assert.equal(created.statusCode, 201)
    assert.equal(created.body.resume.personal.fullName, 'Asha Student')
    assert.equal(created.body.resume.skills.length, 3)
    assert.equal(created.body.resume.projects[0].title, 'Career Dashboard')
    assert.equal(created.body.resume.isDefault, true)

    const updated = await invoke(career.updateResume, {
      params: { id: created.body.resume._id },
      body: {
        revision: created.body.resume.revision,
        personal: { ...created.body.resume.personal.toObject(), summary: 'Frontend engineer focused on accessible, measurable product outcomes and modern React architecture.' },
        experience: [{ title: 'UI Engineer', organization: 'Campus Lab', startDate: '2025', current: true, description: 'Built reusable interfaces.' }],
      },
    })
    assert.equal(updated.statusCode, 200)
    assert.ok(updated.body.resume.lastAutosavedAt)
    const analyzed = await invoke(career.analyzeResume, { params: { id: created.body.resume._id }, body: { keywords: ['React', 'TypeScript'] } })
    assert.equal(analyzed.body.analysis.keywordMatch, 50)
    assert.ok(analyzed.body.architecture.aiReady)

    const stream = new PassThrough()
    const chunks = []
    stream.headers = {}
    stream.setHeader = (key, value) => { stream.headers[key] = value }
    stream.on('data', (chunk) => chunks.push(chunk))
    const ended = new Promise((resolve, reject) => {
      stream.on('end', resolve)
      stream.on('error', reject)
    })
    await career.downloadResume({ params: { id: created.body.resume._id }, user: { _id: student._id } }, stream)
    await ended
    const pdf = Buffer.concat(chunks)
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF')
    assert.equal(stream.headers['Content-Type'], 'application/pdf')
  })

  it('returns only open opportunities from approved public companies', async () => {
    const hiddenCompany = await CompanyProfile.create({ ownerId: companyOwner._id, slug: 'hidden-tech', name: 'Hidden Tech', status: 'pending', isPublic: true })
    await Job.create({ companyId: hiddenCompany._id, title: 'Hidden Role', status: 'open' })
    await Job.create({ companyId: company._id, title: 'Closed Role', status: 'closed' })
    const result = await invoke(career.getOpportunities, { query: { type: 'job', q: 'Engineer', location: 'Hyderabad' } })
    assert.equal(result.statusCode, 200)
    assert.equal(result.body.total, 1)
    assert.equal(result.body.items[0].title, 'Frontend Engineer')
    assert.equal(result.body.items[0].companyId.name, 'Verified Tech')
  })

  it('applies with an owned resume, enriches tracking and prevents duplicate applications', async () => {
    const resumeResult = await invoke(career.createResume, { body: { title: 'Application Resume', fromProfile: true } })
    const resumeId = resumeResult.body.resume._id
    const applied = await invoke(career.apply, { params: { type: 'job', id: job._id }, body: { resumeId, coverLetter: 'I match this role.' } })
    assert.equal(applied.statusCode, 201)
    assert.equal(String(applied.body.application.resumeId), String(resumeId))
    assert.match(applied.body.application.resumeUrl, /\/api\/career\/public\/resumes\/[a-f0-9]{48}\.pdf$/)
    assert.equal(applied.body.application.statusHistory[0].status, 'pending')
    const duplicate = await invoke(career.apply, { params: { type: 'job', id: job._id }, body: { resumeId } })
    assert.equal(duplicate.statusCode, 409)

    const tracker = await invoke(career.getApplications)
    assert.equal(tracker.body.items[0].opportunity.title, 'Frontend Engineer')
    assert.equal(tracker.body.items[0].company.name, 'Verified Tech')
    assert.equal(await Notification.countDocuments({ userId: student._id, type: 'job' }), 1)
    const advanced = await Application.findOneAndUpdate(
      { _id: applied.body.application._id, companyId: company._id },
      { status: 'interview' },
      { new: true },
    )
    assert.equal(advanced.status, 'interview')
    assert.ok(advanced.statusHistory.some((entry) => entry.status === 'interview'))
    assert.equal(await Notification.countDocuments({ userId: student._id, type: 'job' }), 2)
  })

  it('blocks foreign resumes and opportunities from non-public companies', async () => {
    const foreignResume = await Resume.create({ userId: otherStudent._id, title: 'Private Resume' })
    const deniedResume = await invoke(career.apply, { params: { type: 'internship', id: internship._id }, body: { resumeId: foreignResume._id } })
    assert.equal(deniedResume.statusCode, 400)
    const suspendedCompany = await CompanyProfile.create({ ownerId: companyOwner._id, slug: 'suspended-tech', name: 'Suspended Tech', status: 'suspended', isPublic: true })
    const unsafeJob = await Job.create({ companyId: suspendedCompany._id, title: 'Unsafe Role', status: 'open' })
    const ownResume = await Resume.create({ userId: student._id, title: 'Safe Resume', isDefault: true })
    const deniedCompany = await invoke(career.apply, { params: { type: 'job', id: unsafeJob._id }, body: { resumeId: ownResume._id } })
    assert.equal(deniedCompany.statusCode, 404)
  })

  it('supports student withdrawal and produces career dashboard readiness', async () => {
    await invoke(career.updateProfile, { body: { targetCareer: 'Frontend Engineer', requiredSkills: ['React', 'TypeScript'] } })
    const resumeResult = await invoke(career.createResume, { body: { title: 'Default Resume', fromProfile: true } })
    const applied = await invoke(career.apply, { params: { type: 'internship', id: internship._id }, body: { resumeId: resumeResult.body.resume._id } })
    const withdrawn = await invoke(career.withdrawApplication, { params: { id: applied.body.application._id } })
    assert.equal(withdrawn.body.application.status, 'withdrawn')
    assert.ok(withdrawn.body.application.statusHistory.some((entry) => entry.status === 'withdrawn'))

    const dashboard = await invoke(career.getDashboard)
    assert.equal(dashboard.statusCode, 200)
    assert.equal(dashboard.body.dashboard.jobsAvailable, 1)
    assert.equal(dashboard.body.dashboard.internshipsAvailable, 1)
    assert.equal(dashboard.body.dashboard.applicationsSubmitted, 1)
    assert.ok(dashboard.body.dashboard.profileCompletion > 0)

    const readiness = await invoke(career.getReadiness)
    assert.equal(readiness.body.roadmap.targetCareer, 'Frontend Engineer')
    assert.deepEqual(readiness.body.roadmap.missingSkills, ['TypeScript'])
    assert.equal(readiness.body.interviews.modules.length, 4)
  })
})
