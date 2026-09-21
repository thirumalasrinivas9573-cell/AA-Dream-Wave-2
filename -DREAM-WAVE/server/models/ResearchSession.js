const mongoose = require('mongoose')
const { FACT_LABELS } = require('../constants/knowledgeDiscovery')

const citationSchema = new mongoose.Schema(
  {
    sourceType: { type: String, required: true },
    sourceId: { type: String, default: '' },
    title: { type: String, default: '' },
    section: { type: String, default: '' },
    page: { type: Number, default: null },
    excerpt: { type: String, default: '' },
    authority: { type: Number, default: 60 },
    href: { type: String, default: '' },
  },
  { _id: true },
)

const researchSessionSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, default: null },
    role: { type: String, default: 'student' },
    question: { type: String, required: true },
    intent: { type: String, default: 'RESEARCH' },
    plan: [{ order: Number, step: String, agentId: String }],
    status: { type: String, enum: ['PLANNING', 'RETRIEVING', 'SYNTHESIZING', 'COMPLETED', 'FAILED'], default: 'PLANNING' },
    sources: [citationSchema],
    keyFindings: [{
      label: { type: String, enum: FACT_LABELS, default: 'SOURCE_FACT' },
      text: { type: String, default: '' },
    }],
    answer: { type: String, default: '' },
    limitations: [{ type: String }],
    nextActions: [{ type: String }],
    synthesisUsedAi: { type: Boolean, default: false },
  },
  { timestamps: true },
)

module.exports = mongoose.model('ResearchSession', researchSessionSchema)
