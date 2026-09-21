/**
 * MJ Memory Mongoose Models — isolated collections only
 * @module mj/memory/models
 */

const { getMongoose, isDbReady } = require('../db/connection')
const { memoryScoreFields, memoryMetaFields } = require('../db/baseSchema')
const { MJ_COLLECTIONS } = require('../constants')

let _models = null

function getModels() {
  if (_models) return _models
  const mongoose = getMongoose()
  if (!mongoose) return null

  const scoreFields = memoryScoreFields()
  const metaFields = memoryMetaFields()

  const MJMemory = mongoose.models.MJMemory || mongoose.model('MJMemory', new mongoose.Schema({
    ...metaFields,
    ...scoreFields,
    content: { type: String, required: true },
    summary: { type: String, default: '' },
    projectId: { type: String, index: true, default: null },
    source: { type: String, default: 'mj' },
  }, { timestamps: true, collection: MJ_COLLECTIONS.MEMORY }), MJ_COLLECTIONS.MEMORY)

  const MJConversation = mongoose.models.MJConversation || mongoose.model('MJConversation', new mongoose.Schema({
    ...metaFields,
    ...scoreFields,
    sessionId: { type: String, required: true, index: true },
    messages: [{
      role: { type: String, enum: ['user', 'assistant', 'system'] },
      content: String,
      timestamp: { type: Date, default: Date.now },
    }],
    summary: { type: String, default: '' },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
  }, { timestamps: true, collection: MJ_COLLECTIONS.CONVERSATIONS }), MJ_COLLECTIONS.CONVERSATIONS)

  const MJProject = mongoose.models.MJProject || mongoose.model('MJProject', new mongoose.Schema({
    ...metaFields,
    ...scoreFields,
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    sprint: { type: String, default: null },
    architectureNotes: { type: String, default: '' },
    documents: [{ title: String, content: String, addedAt: Date }],
    status: { type: String, enum: ['active', 'archived', 'completed'], default: 'active' },
  }, { timestamps: true, collection: MJ_COLLECTIONS.PROJECTS }), MJ_COLLECTIONS.PROJECTS)

  const MJPreference = mongoose.models.MJPreference || mongoose.model('MJPreference', new mongoose.Schema({
    ...metaFields,
    ...scoreFields,
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    preferenceType: { type: String, enum: ['coding', 'ui', 'language', 'general'], default: 'general' },
  }, { timestamps: true, collection: MJ_COLLECTIONS.PREFERENCES }), MJ_COLLECTIONS.PREFERENCES)

  const MJLearning = mongoose.models.MJLearning || mongoose.model('MJLearning', new mongoose.Schema({
    ...metaFields,
    ...scoreFields,
    topic: { type: String, required: true, index: true },
    skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'mastered'], default: 'beginner' },
    weakAreas: { type: [String], default: [] },
    quizHistory: [{ score: Number, total: Number, takenAt: Date }],
    progress: { type: Number, default: 0, min: 0, max: 100 },
  }, { timestamps: true, collection: MJ_COLLECTIONS.LEARNING }), MJ_COLLECTIONS.LEARNING)

  const MJTaskMemory = mongoose.models.MJTaskMemory || mongoose.model('MJTaskMemory', new mongoose.Schema({
    ...metaFields,
    ...scoreFields,
    taskId: { type: String, index: true, default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    deadline: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  }, { timestamps: true, collection: MJ_COLLECTIONS.TASKS }), MJ_COLLECTIONS.TASKS)

  const MJSession = mongoose.models.MJSession || mongoose.model('MJSession', new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    startedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
    summary: { type: String, default: '' },
    archived: { type: Boolean, default: false },
    metadata: { type: Object, default: {} },
  }, { timestamps: true, collection: MJ_COLLECTIONS.SESSIONS }), MJ_COLLECTIONS.SESSIONS)

  _models = {
    MJMemory,
    MJConversation,
    MJProject,
    MJPreference,
    MJLearning,
    MJTaskMemory,
    MJSession,
  }

  return _models
}

async function ensureIndexes() {
  if (!isDbReady()) return false
  const models = getModels()
  if (!models) return false

  await Promise.all(Object.values(models).map(m => m.createIndexes()))
  return true
}

module.exports = { getModels, ensureIndexes }
