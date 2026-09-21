const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.RESEARCH_V3_ENABLED = 'true'
process.env.INTELLIGENCE_V3_ENABLED = 'true'

const User = require('../models/User')
const Goal = require('../models/Goal')
const KnowledgeGraphEdge = require('../models/KnowledgeGraphEdge')
const researchService = require('../services/researchService')
const researchDocumentService = require('../services/researchDocumentService')
const researchGroundingService = require('../services/researchGroundingService')
const researchSynthesisService = require('../services/researchSynthesisService')
const knowledgeGraphService = require('../services/knowledgeGraphService')
const researchController = require('../controllers/researchController')

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

describe('Version 3 research workspace', () => {
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
    studentA = await User.create({ name: 'Asha', email: 'asha.research@example.com', password: 'Password123', role: 'student' })
    studentB = await User.create({ name: 'Ben', email: 'ben.research@example.com', password: 'Password123', role: 'student' })
  })

  it('creates research project with question and ownership', async () => {
    const project = await researchService.createProject(studentA._id, {
      title: 'Transformer Models',
      question: 'How do transformer models work?',
      status: 'DRAFT',
    })
    assert.ok(project._id)
    assert.equal(project.question, 'How do transformer models work?')
    const cross = await researchService.getOwnedProject(studentB._id, project._id).catch(() => null)
    assert.equal(cross, null)
  })

  it('indexes source text and retrieves relevant chunks', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'DB Comparison', question: 'MongoDB vs PostgreSQL' })
    const source = await researchService.addSource(studentA._id, project._id, {
      title: 'MongoDB Notes',
      rawText: 'MongoDB is a document database with flexible schema. PostgreSQL is a relational database with ACID transactions.',
    })
    assert.ok(source.chunkCount >= 1)
    const chunks = await researchDocumentService.retrieveProjectChunks(project._id, 'PostgreSQL ACID', { limit: 3 })
    assert.ok(chunks.length >= 1)
  })

  it('deduplicates identical source content via hash', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'Dedup Test', question: 'Test' })
    const text = 'Same content for hash deduplication test in research workspace.'
    const s1 = await researchService.addSource(studentA._id, project._id, { title: 'Source A', rawText: text })
    const s2 = await researchService.addSource(studentA._id, project._id, { title: 'Source B', rawText: text })
    assert.equal(String(s1._id), String(s2._id))
  })

  it('adds private notes and claims with citations', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'ML Plant Disease', question: 'Detection methods?' })
    const note = await researchService.addNote(studentA._id, { projectId: project._id, title: 'CNN approach', content: 'Convolutional networks for leaf images.' })
    const claim = await researchService.addClaim(studentA._id, {
      projectId: project._id,
      text: 'CNNs are used for image-based plant disease detection.',
      citations: [{ sourceTitle: 'Literature', excerpt: 'CNN leaf classification', confidence: 'medium' }],
    })
    assert.ok(note._id)
    assert.ok(claim._id)
    assert.equal(claim.citations.length, 1)
  })

  it('links project to goal and syncs knowledge graph', async () => {
    const goal = await Goal.create({ userId: studentA._id, title: 'AI Engineer', category: 'Research' })
    const project = await researchService.createProject(studentA._id, {
      title: 'AI Skills Research',
      question: 'What skills for AI engineer?',
      goalId: goal._id,
      status: 'ACTIVE',
    })
    await knowledgeGraphService.syncFromCanonical(studentA._id, { force: true })
    const edges = await KnowledgeGraphEdge.find({ studentId: studentA._id })
    assert.ok(edges.some((e) => e.relationType === 'SUPPORTS_GOAL' && e.sourceType === 'research_project'))
    assert.ok(edges.some((e) => e.targetType === 'research_project'))
  })

  it('returns grounded chat fallback without OpenAI key', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'Chat Test', question: 'Explain attention?' })
    await researchService.addSource(studentA._id, project._id, {
      title: 'Attention Paper Notes',
      rawText: 'Self-attention allows models to weigh relationships between tokens in a sequence.',
    })
    const owned = await researchService.getOwnedProject(studentA._id, project._id)
    const result = await researchGroundingService.groundedChat(studentA._id, owned, { question: 'What is self-attention?' })
    assert.ok(result.answer)
    assert.ok(Array.isArray(result.citations))
  })

  it('proposes research plan without inventing specific sources', async () => {
    const project = await researchService.createProject(studentA._id, {
      title: 'Career Research',
      question: 'Skills for backend developer?',
    })
    const plan = await researchSynthesisService.proposeResearchPlan(project)
    assert.ok(plan.steps.length >= 3)
    assert.ok(plan.disclaimer)
  })

  it('synthesizes from indexed sources with connections structure', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'Synthesis Test', question: 'What is RAG?' })
    await researchService.addSource(studentA._id, project._id, {
      title: 'RAG Overview',
      rawText: 'Retrieval augmented generation combines search with language models to ground answers in documents.',
    })
    const owned = await researchService.getOwnedProject(studentA._id, project._id)
    const output = await researchSynthesisService.synthesizeProject(studentA._id, owned)
    assert.ok(output.synthesis || output.findings)
    assert.ok(output.connections)
  })

  it('enforces cross-student isolation', async () => {
    const project = await researchService.createProject(studentA._id, { title: 'Private Research', question: 'Secret?' })
    const res = await invoke(researchController.getProject, studentB, { params: { id: String(project._id) } })
    assert.equal(res.statusCode, 404)
  })

  it('controller overview returns project counts', async () => {
    await researchService.createProject(studentA._id, { title: 'One', question: 'Q1' })
    const res = await invoke(researchController.overview, studentA)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.success, true)
  })
})
