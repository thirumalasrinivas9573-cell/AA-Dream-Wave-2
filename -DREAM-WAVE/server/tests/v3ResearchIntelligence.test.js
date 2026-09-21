const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.RESEARCH_V3_ENABLED = 'true'
process.env.INTELLIGENCE_V3_ENABLED = 'true'

const User = require('../models/User')
const researchService = require('../services/researchService')
const researchIntelligenceService = require('../services/researchIntelligenceService')
const researchController = require('../controllers/researchController')
const researchRoutes = require('../routes/research')

let mongod
let studentA
let studentB

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
  }
}

async function invoke(handler, user, values = {}) {
  const res = response()
  await handler({ user: user ? { _id: user._id, role: user.role } : undefined, ...values }, res)
  return res
}

describe('Version 3 Research Intelligence (Prompt 6)', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
  })

  after(async () => {
    await mongoose.disconnect()
    await mongod?.stop()
  })

  beforeEach(async () => {
    await mongoose.connection.dropDatabase()
    studentA = await User.create({ name: 'Asha', email: 'asha.ri@example.com', password: 'Password123', role: 'student' })
    studentB = await User.create({ name: 'Ben', email: 'ben.ri@example.com', password: 'Password123', role: 'student' })
  })

  it('persists research plan and report through updateProject', async () => {
    const project = await researchService.createProject(studentA._id, {
      title: 'AI tutoring outcomes',
      question: 'How does adaptive tutoring affect learning outcomes?',
    })
    const updated = await researchService.updateProject(studentA._id, project._id, {
      researchPlan: [{ title: 'Collect sources', description: 'Find papers', order: 1 }],
      status: 'ACTIVE',
      report: {
        summary: 'Draft',
        sections: [{ title: 'Background', content: '...' }],
        generatedAt: new Date(),
        aiGenerated: true,
      },
      objective: 'Measure learning gains',
    })
    assert.equal(updated.researchPlan.length, 1)
    assert.equal(updated.report.sections.length, 1)
    assert.equal(updated.objective, 'Measure learning gains')
    assert.equal(updated.status, 'ACTIVE')
  })

  it('builds intelligence with gaps, progress, and knowledge map from real data', async () => {
    const project = await researchService.createProject(studentA._id, {
      title: 'Adaptive learning',
      question: 'What impact does adaptive AI tutoring have on undergraduate outcomes?',
    })
    await researchService.addSource(studentA._id, project._id, {
      title: 'Paper A',
      author: 'Lee',
      sourceType: 'academic',
      rawText: `${'Adaptive tutoring improved outcomes for undergraduate students in controlled studies. '.repeat(8)}`,
    })
    await researchService.addClaim(studentA._id, {
      projectId: project._id,
      text: 'Adaptive tutoring improved outcomes for undergraduates.',
      citations: [],
    })

    const intel = await researchIntelligenceService.buildIntelligence(studentA._id, project._id)
    assert.equal(intel.project.lifecycle, 'ANALYSIS')
    assert.ok(intel.progress.completedSteps >= 3)
    assert.ok(intel.knowledgeMap.nodes.some((n) => n.type === 'SOURCE'))
    assert.ok(intel.knowledgeMap.nodes.some((n) => n.type === 'FINDING' || n.type === 'VERIFIED_FINDING'))
    assert.ok(Array.isArray(intel.gaps))
    assert.ok(intel.nextActions.length >= 1)
  })

  it('detects potential conflicts without declaring a winner', async () => {
    const conflicts = researchIntelligenceService.detectPotentialConflicts([
      { _id: '1', text: 'Adaptive tutoring improves learning outcomes for students.', status: 'draft' },
      { _id: '2', text: 'Adaptive tutoring does not improve learning outcomes for students.', status: 'draft' },
    ])
    assert.ok(conflicts.length >= 1)
    assert.equal(conflicts[0].type, 'POTENTIAL_CONFLICT')
    assert.match(conflicts[0].guidance, /does not decide/i)
  })

  it('compares two sources using available excerpts only', async () => {
    const project = await researchService.createProject(studentA._id, {
      title: 'Compare sources',
      question: 'Do tutoring systems help?',
    })
    const a = await researchService.addSource(studentA._id, project._id, {
      title: 'Source A',
      rawText: `${'Tutoring systems improved exam scores in semester courses. '.repeat(10)}`,
    })
    const b = await researchService.addSource(studentA._id, project._id, {
      title: 'Source B',
      rawText: `${'Tutoring systems showed limited impact on exam scores for large lectures. '.repeat(10)}`,
    })
    const result = await researchIntelligenceService.compareSources(studentA._id, project._id, [a._id, b._id])
    assert.equal(result.label, 'SOURCE_COMPARISON')
    assert.ok(result.comparison)
    assert.ok(result.comparison.disclaimer)
    assert.equal(result.comparison.sourceA.title, 'Source A')
  })

  it('enforces ownership on intelligence endpoint', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'Private research', question: 'Q?' })
    const denied = await invoke(researchController.intelligence, studentB, { params: { id: String(project._id) } })
    assert.equal(denied.statusCode, 404)

    const ok = await invoke(researchController.intelligence, studentA, { params: { id: String(project._id) } })
    assert.equal(ok.statusCode, 200)
    assert.equal(ok.body.success, true)
    assert.ok(ok.body.data.knowledgeMap)
  })

  it('applyPlan persists plan steps via controller', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'Plan persist', question: 'Q' })
    const res = await invoke(researchController.applyPlan, studentA, {
      params: { id: String(project._id) },
      body: { steps: [{ title: 'Gather literature', description: 'Find papers', order: 1 }] },
    })
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.project.researchPlan.length, 1)
    assert.equal(res.body.project.status, 'ACTIVE')
  })

  it('registers research intelligence routes', () => {
    const paths = researchRoutes.stack.filter((layer) => layer.route).map((layer) => layer.route.path)
    assert.ok(paths.some((p) => p.includes('intelligence')))
    assert.ok(paths.some((p) => p.includes('knowledge-map')))
    assert.ok(paths.some((p) => p.includes('compare-sources')))
    assert.ok(paths.some((p) => p.includes('refine-question')))
  })

  it('routes research intents without a second engine', () => {
    assert.equal(researchIntelligenceService.routeResearchIntent('compare source A vs B'), 'SOURCE_COMPARISON')
    assert.equal(researchIntelligenceService.routeResearchIntent('what gaps remain?'), 'RESEARCH_GAP')
    assert.equal(researchIntelligenceService.routeResearchIntent('summarize this paper'), 'SOURCE_SUMMARY')
    assert.ok(researchIntelligenceService.RESEARCH_INTENTS.includes('CITATION_HELP'))
  })

  it('labels notes with origin and noteType', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'Notes', question: 'Q' })
    const note = await researchService.addNote(studentA._id, {
      projectId: project._id,
      title: 'Observation',
      content: 'Method section is thin.',
      noteType: 'OBSERVATION',
      origin: 'USER_WRITTEN',
    })
    assert.equal(note.noteType, 'OBSERVATION')
    assert.equal(note.origin, 'USER_WRITTEN')
  })
})
