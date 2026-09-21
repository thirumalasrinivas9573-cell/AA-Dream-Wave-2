const mongoose = require('mongoose')
const {
  WORKSPACE_STATUSES,
  SOURCE_TYPES,
  AUTHORITY_LEVELS,
  CLAIM_TYPES,
  CLAIM_STATUSES,
  REPORT_STATUSES,
  REPORT_TEMPLATES,
  TIMELINE_EVENTS,
} = require('../constants/researchWorkspace')

const sourceSnapshotSchema = new mongoose.Schema(
  {
    sourceRefId: { type: String, required: true },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    canonicalSourceId: { type: String, default: '' },
    title: { type: String, default: 'UNKNOWN' },
    author: { type: String, default: 'UNKNOWN' },
    organization: { type: String, default: 'UNKNOWN' },
    date: { type: String, default: 'UNKNOWN' },
    url: { type: String, default: '' },
    page: { type: Number, default: null },
    section: { type: String, default: '' },
    authority: { type: String, enum: AUTHORITY_LEVELS, default: 'UNKNOWN' },
    excerpt: { type: String, default: '' },
    href: { type: String, default: '' },
    snapshotAt: { type: Date, default: Date.now },
    sourceUpdated: { type: Boolean, default: false },
    addedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true },
)

const evidenceSchema = new mongoose.Schema(
  {
    claimId: { type: String, default: '' },
    sourceRefId: { type: String, default: '' },
    location: { type: String, default: '' },
    page: { type: Number, default: null },
    section: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    quote: { type: String, default: '' },
    limitations: [{ type: String }],
  },
  { _id: true },
)

const claimSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, enum: CLAIM_TYPES, default: 'FACT' },
    supportingSourceRefs: [{ type: String }],
    status: { type: String, enum: CLAIM_STATUSES, default: 'PENDING' },
  },
  { _id: false },
)

const reportSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    citations: [{ sourceRefId: String, label: String }],
  },
  { _id: false },
)

const reportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true },
    version: { type: Number, default: 1 },
    template: { type: String, enum: REPORT_TEMPLATES, default: 'ACADEMIC_RESEARCH' },
    title: { type: String, default: '' },
    status: { type: String, enum: REPORT_STATUSES, default: 'DRAFT' },
    sections: [reportSectionSchema],
    references: [{
      sourceRefId: String,
      citation: String,
    }],
    qualityIssues: [{ type: String }],
    approvedAt: { type: Date, default: null },
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true, timestamps: true },
)

const timelineSchema = new mongoose.Schema(
  {
    event: { type: String, enum: TIMELINE_EVENTS, required: true },
    description: { type: String, default: '' },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
)

const noteSchema = new mongoose.Schema(
  {
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    contentType: { type: String, enum: ['USER_NOTE', 'AI_SUMMARY', 'AI_RECOMMENDATION'], default: 'USER_NOTE' },
  },
  { _id: true, timestamps: true },
)

const researchWorkspaceSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    tenantRole: { type: String, enum: ['student', 'institution', 'company'], default: 'student' },
    title: { type: String, required: true },
    researchQuestion: { type: String, required: true },
    description: { type: String, default: '' },
    subquestions: [{ type: String }],
    scope: { type: String, default: '' },
    dateRange: { from: String, to: String },
    status: { type: String, enum: WORKSPACE_STATUSES, default: 'DRAFT', index: true },
    sources: [sourceSnapshotSchema],
    evidence: [evidenceSchema],
    claims: [claimSchema],
    synthesis: {
      keyFindings: [{ label: String, text: String, sourceRefs: [String] }],
      agreements: [{ type: String }],
      contradictions: [{ sourceA: String, sourceB: String, description: String }],
      gaps: [{ type: String }],
      limitations: [{ type: String }],
      evidenceMatrix: [{ claim: String, sources: mongoose.Schema.Types.Mixed, status: String }],
      updatedAt: { type: Date, default: null },
    },
    methodology: {
      searchScope: { type: String, default: '' },
      sourceTypes: [{ type: String }],
      sourceCount: { type: Number, default: 0 },
      filters: { type: mongoose.Schema.Types.Mixed, default: {} },
      generatedAt: { type: Date, default: null },
    },
    reports: [reportSchema],
    notes: [noteSchema],
    timeline: [timelineSchema],
    graphRefs: [{ entityType: String, entityId: String, label: String }],
    collaborators: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
    }],
    plan: [{ order: Number, step: String, agentId: String }],
  },
  { timestamps: true },
)

researchWorkspaceSchema.index({ ownerUserId: 1, status: 1, updatedAt: -1 })

module.exports = mongoose.model('ResearchWorkspace', researchWorkspaceSchema)
