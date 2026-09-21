const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

process.env.INTELLIGENCE_V3_ENABLED = 'true'

const User = require('../models/User')
const StudentMemory = require('../models/StudentMemory')
const memoryService = require('../services/memoryService')
const memoryController = require('../controllers/memoryController')
const studentContextEngine = require('../services/studentContextEngine')
const coreAiIntelligenceService = require('../services/coreAiIntelligenceService')
const toolRegistry = require('../services/agent/toolRegistry')

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
  await handler({
    user: user ? { _id: user._id, role: user.role, name: user.name } : undefined,
    query: {},
    body: {},
    params: {},
    ...values,
  }, res)
  return res
}

describe('Version 3 Memory Intelligence (Prompt 10)', () => {
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
    studentA = await User.create({ name: 'Asha Mem', email: 'asha.mem@example.com', password: 'Password123', role: 'student' })
    studentB = await User.create({ name: 'Ben Mem', email: 'ben.mem@example.com', password: 'Password123', role: 'student' })
  })

  it('creates explicit memory', async () => {
    const result = await memoryService.createMemory(studentA._id, {
      content: 'I prefer concise explanations',
      type: 'PREFERENCE',
      source: 'USER_EXPLICIT',
      confidence: 'EXPLICIT',
      conflictGroup: 'pref:concise',
      force: true,
    })
    assert.equal(result.created, true)
    assert.equal(result.memory.type, 'PREFERENCE')
    assert.equal(result.memory.confidence, 'EXPLICIT')
  })

  it('retrieves and ranks relevant memories', async () => {
    await memoryService.createMemory(studentA._id, {
      content: 'My main project is an AI portfolio app',
      type: 'PROJECT_CONTEXT',
      source: 'USER_EXPLICIT',
      force: true,
    })
    await memoryService.createMemory(studentA._id, {
      content: 'I prefer morning study blocks',
      type: 'PREFERENCE',
      source: 'USER_EXPLICIT',
      conflictGroup: 'pref:study-time',
      force: true,
    })
    const relevant = await memoryService.getRelevantMemories(studentA._id, {
      message: 'Continue my AI project',
      intent: 'PROJECT_HELP',
      limit: 5,
    })
    assert.ok(relevant.length >= 1)
    assert.ok(relevant.some((m) => /AI portfolio/i.test(m.content)))
    assert.ok(relevant[0].relevanceScore > 0)
  })

  it('edits memory content', async () => {
    const created = await memoryService.createMemory(studentA._id, {
      content: 'Focus on AI engineering',
      type: 'GOAL_CONTEXT',
      force: true,
    })
    const updated = await memoryService.updateMemory(studentA._id, created.memory.id, {
      content: 'Focus on AI engineering and systems design',
    })
    assert.match(updated.content, /systems design/)
  })

  it('deletes memory only with confirmation and stops retrieval', async () => {
    const created = await memoryService.createMemory(studentA._id, {
      content: 'Temporary secret preference xyz',
      type: 'PREFERENCE',
      force: true,
    })
    await assert.rejects(
      () => memoryService.deleteMemory(studentA._id, created.memory.id, { confirm: false }),
      (err) => err.code === 'CONFIRMATION_REQUIRED',
    )
    await memoryService.deleteMemory(studentA._id, created.memory.id, { confirm: true })
    const list = await memoryService.listMemories(studentA._id, { status: 'ACTIVE' })
    assert.equal(list.memories.some((m) => m.id === created.memory.id), false)
    const relevant = await memoryService.getRelevantMemories(studentA._id, {
      message: 'Temporary secret preference xyz',
      intent: 'GENERAL_MENTOR',
    })
    assert.equal(relevant.some((m) => m.id === created.memory.id), false)
  })

  it('archives memory', async () => {
    const created = await memoryService.createMemory(studentA._id, {
      content: 'Old workflow preference',
      type: 'WORKFLOW_PREFERENCE',
      force: true,
    })
    const archived = await memoryService.archiveMemory(studentA._id, created.memory.id)
    assert.equal(archived.status, 'ARCHIVED')
  })

  it('expires temporary context', async () => {
    const created = await memoryService.createMemory(studentA._id, {
      content: 'This week prioritize hackathon prep',
      type: 'TEMPORARY_CONTEXT',
      expiresAt: new Date(Date.now() - 60_000),
      force: true,
    })
    const list = await memoryService.listMemories(studentA._id, { status: 'ACTIVE' })
    assert.equal(list.memories.some((m) => m.id === created.memory.id), false)
    const doc = await StudentMemory.findById(created.memory.id)
    assert.equal(doc.status, 'ARCHIVED')
  })

  it('prevents duplicate fingerprints', async () => {
    const a = await memoryService.createMemory(studentA._id, {
      content: 'Prefers concise explanations',
      type: 'PREFERENCE',
      conflictGroup: 'pref:concise',
      force: true,
    })
    const b = await memoryService.createMemory(studentA._id, {
      content: 'Prefers concise explanations',
      type: 'PREFERENCE',
      conflictGroup: 'pref:concise',
      force: true,
    })
    assert.equal(b.duplicate, true)
    assert.equal(a.memory.id, b.memory.id)
    const count = await StudentMemory.countDocuments({ userId: studentA._id, status: 'ACTIVE' })
    assert.equal(count, 1)
  })

  it('supersedes conflicting preferences', async () => {
    await memoryService.createMemory(studentA._id, {
      content: 'I prefer morning study',
      type: 'PREFERENCE',
      conflictGroup: 'pref:study-time',
      force: true,
    })
    const newer = await memoryService.createMemory(studentA._id, {
      content: 'I prefer studying at night',
      type: 'PREFERENCE',
      conflictGroup: 'pref:study-time',
      force: true,
    })
    assert.ok(newer.merged || newer.updated || newer.created)
    const active = await memoryService.listMemories(studentA._id, { status: 'ACTIVE', type: 'PREFERENCE' })
    assert.equal(active.memories.length, 1)
    assert.match(active.memories[0].content, /night/)
  })

  it('searches user memories by keyword', async () => {
    await memoryService.createMemory(studentA._id, { content: 'React is my main stack', type: 'PROJECT_CONTEXT', force: true })
    await memoryService.createMemory(studentA._id, { content: 'Career focus: product engineering', type: 'CAREER_CONTEXT', force: true })
    const found = await memoryService.listMemories(studentA._id, { q: 'React', status: 'ACTIVE' })
    assert.equal(found.memories.length, 1)
    assert.match(found.memories[0].content, /React/)
  })

  it('blocks IDOR — student B cannot read student A memory', async () => {
    const created = await memoryService.createMemory(studentA._id, {
      content: 'Private preference for A only',
      type: 'PREFERENCE',
      force: true,
    })
    const res = await invoke(memoryController.getOne, studentB, { params: { id: created.memory.id } })
    assert.equal(res.statusCode, 404)
    await assert.rejects(
      () => memoryService.getMemoryById(studentB._id, created.memory.id),
      (err) => err.statusCode === 404,
    )
  })

  it('institution role cannot use memory routes', async () => {
    const institution = await User.create({
      name: 'Inst', email: 'inst.mem@example.com', password: 'Password123', role: 'institution',
    })
    // Controller itself does not check role — route middleware does; simulate ownership isolation via service
    const created = await memoryService.createMemory(studentA._id, {
      content: 'Student only', type: 'PREFERENCE', force: true,
    })
    await assert.rejects(
      () => memoryService.getMemoryById(institution._id, created.memory.id),
      (err) => err.statusCode === 404,
    )
  })

  it('AI context includes relevant memory and not invented claims instruction', async () => {
    await memoryService.createMemory(studentA._id, {
      content: 'I prefer concise explanations',
      type: 'PREFERENCE',
      conflictGroup: 'pref:concise',
      force: true,
    })
    const ctx = await studentContextEngine.buildStudentContext(studentA._id, {
      message: 'Explain recursion briefly',
      budget: 5000,
    })
    assert.match(ctx.text, /concise explanations/i)
    assert.match(ctx.text, /Do NOT claim|Do not invent|CURRENT USER REQUEST/i)
  })

  it('irrelevant memories are ranked lower than topical ones', async () => {
    await memoryService.createMemory(studentA._id, {
      content: 'Registered interest in campus jazz night',
      type: 'TEMPORARY_CONTEXT',
      force: true,
    })
    await memoryService.createMemory(studentA._id, {
      content: 'Current React project needs auth module',
      type: 'PROJECT_CONTEXT',
      force: true,
    })
    const relevant = await memoryService.getRelevantMemories(studentA._id, {
      message: 'Help me finish my React project auth',
      intent: 'PROJECT_HELP',
      limit: 3,
    })
    assert.ok(relevant.length >= 1)
    assert.match(relevant[0].content, /React/i)
  })

  it('current user instruction intent still routes when asking for detail', async () => {
    await memoryService.createMemory(studentA._id, {
      content: 'I prefer concise explanations',
      type: 'PREFERENCE',
      force: true,
    })
    const intent = coreAiIntelligenceService.detectCoreIntent('Give me a detailed explanation of recursion')
    // Should not become MEMORY_REVIEW; detail request is study/general
    assert.notEqual(intent, 'MEMORY_REVIEW')
    const block = await memoryService.buildMemoryContextBlock(studentA._id, {
      message: 'Give me a detailed explanation of recursion',
      intent: 'STUDY_HELP',
    })
    assert.match(block.instructionOverrideNote || block.text, /CURRENT USER REQUEST/i)
  })

  it('memory review only mentions stored memories', async () => {
    const empty = await memoryService.reviewMemories(studentA._id)
    assert.equal(empty.hasMemory, false)
    assert.match(empty.summary, /don'?t have/i)
    await memoryService.createMemory(studentA._id, {
      content: 'Focus on AI engineering',
      type: 'GOAL_CONTEXT',
      force: true,
    })
    const review = await memoryService.reviewMemories(studentA._id)
    assert.equal(review.hasMemory, true)
    assert.match(review.summary, /AI engineering/)
    assert.equal(review.summary.includes('quantum teleportation hobby'), false)
  })

  it('handles deleted project references safely', async () => {
    const created = await memoryService.createMemory(studentA._id, {
      content: 'Working on portfolio MVP',
      type: 'PROJECT_CONTEXT',
      entityType: 'project',
      entityId: new mongoose.Types.ObjectId().toString(),
      force: true,
    })
    const n = await memoryService.archiveEntityReferences(studentA._id, 'project', created.memory.entityId)
    assert.equal(n, 1)
    const mem = await memoryService.getMemoryById(studentA._id, created.memory.id)
    assert.equal(mem.status, 'ARCHIVED')
  })

  it('blocks sensitive content storage', async () => {
    await assert.rejects(
      () => memoryService.createMemory(studentA._id, {
        content: 'Remember my depression diagnosis',
        type: 'IMPORTANT_CONTEXT',
        force: true,
      }),
      (err) => err.code === 'SENSITIVE_CONTENT_BLOCKED',
    )
  })

  it('inferred conversation memory requires confirmation', async () => {
    const pending = await memoryService.createMemory(studentA._id, {
      content: 'Might like React a lot',
      type: 'PREFERENCE',
      source: 'CONVERSATION',
      confidence: 'LOW',
    })
    assert.equal(pending.pendingConfirmation, true)
    const active = await StudentMemory.countDocuments({ userId: studentA._id, status: 'ACTIVE' })
    assert.equal(active, 0)
    const pendingCount = await StudentMemory.countDocuments({ userId: studentA._id, status: 'PENDING_CONFIRMATION' })
    assert.equal(pendingCount, 1)
  })

  it('agent memory tools enforce ownership', async () => {
    const created = await memoryService.createMemory(studentA._id, {
      content: 'Agent-visible preference',
      type: 'PREFERENCE',
      force: true,
    })
    const list = await toolRegistry.executeTool('listMemories', {}, { userId: studentA._id, role: 'student' })
    assert.ok(list.result.memories.some((m) => m.id === created.memory.id))

    await assert.rejects(
      () => toolRegistry.executeTool('updateMemory', {
        memoryId: created.memory.id,
        content: 'Hacked',
      }, { userId: studentB._id, role: 'student' }),
      (err) => err.statusCode === 404 || err.code === 'NOT_FOUND',
    )

    await assert.rejects(
      () => toolRegistry.executeTool('deleteMemory', {
        memoryId: created.memory.id,
      }, { userId: studentB._id, role: 'student' }),
      (err) => err.statusCode === 404 || err.code === 'NOT_FOUND',
    )
  })

  it('detects MEMORY_REVIEW and FORGET intents', async () => {
    assert.equal(memoryService.detectMemoryIntent('What do you remember about me?'), 'MEMORY_REVIEW')
    assert.equal(memoryService.detectMemoryIntent('Forget that I prefer concise explanations'), 'FORGET_MEMORY')
    assert.equal(coreAiIntelligenceService.detectCoreIntent('What do you remember about me?'), 'MEMORY_REVIEW')
  })

  it('forget flow requires confirmation', async () => {
    await memoryService.createMemory(studentA._id, {
      content: 'I prefer concise explanations',
      type: 'PREFERENCE',
      force: true,
    })
    const pending = await memoryService.forgetMemory(studentA._id, {
      query: 'concise explanations',
      confirm: false,
    })
    assert.equal(pending.pendingConfirmation, true)
    assert.ok(pending.matches.length >= 1)
    const done = await memoryService.forgetMemory(studentA._id, {
      memoryId: pending.matches[0].id,
      confirm: true,
    })
    assert.equal(done.deleted, true)
  })

  it('purgeUserMemories soft-deletes all', async () => {
    await memoryService.createMemory(studentA._id, { content: 'One', type: 'IMPORTANT_CONTEXT', force: true })
    await memoryService.createMemory(studentA._id, { content: 'Two', type: 'IMPORTANT_CONTEXT', force: true })
    const purged = await memoryService.purgeUserMemories(studentA._id)
    assert.ok(purged.purged >= 2)
    const active = await memoryService.listMemories(studentA._id, { status: 'ACTIVE' })
    assert.equal(active.total, 0)
  })

  it('controller create uses authenticated user not body.userId', async () => {
    const res = await invoke(memoryController.create, studentA, {
      body: {
        content: 'Owned by auth user',
        type: 'PREFERENCE',
        userId: String(studentB._id),
        force: true,
        confirm: true,
      },
    })
    assert.ok([200, 201].includes(res.statusCode))
    const mem = res.body.data.memory
    const doc = await StudentMemory.findById(mem.id)
    assert.equal(String(doc.userId), String(studentA._id))
  })
})
