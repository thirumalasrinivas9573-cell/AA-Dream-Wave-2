const mongoose = require('mongoose')
const {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  DIFFICULTY_LEVELS,
  HEALTH_STATUSES,
  EVIDENCE_STRENGTH,
  EVIDENCE_TYPES,
} = require('../constants/projectIntelligence')

const milestoneSchema = new mongoose.Schema(
  {
    milestoneId: { type: String, required: true },
    order: { type: Number, default: 0 },
    title: { type: String, required: true },
    status: { type: String, enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'], default: 'NOT_STARTED' },
    dependsOn: [{ type: String }],
    taskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    completedAt: { type: Date, default: null },
  },
  { _id: false },
)

const evidenceSchema = new mongoose.Schema(
  {
    evidenceId: { type: String, required: true },
    type: { type: String, enum: EVIDENCE_TYPES, default: 'ARTIFACT' },
    strength: { type: String, enum: EVIDENCE_STRENGTH, default: 'PLANNED' },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    skillsDemonstrated: [{ type: String }],
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const portfolioProjectSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, default: null },
    tenantRole: { type: String, enum: ['student', 'institution', 'company'], default: 'student' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    projectType: { type: String, enum: PROJECT_TYPES, default: 'PORTFOLIO_PROJECT' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'IDEA', index: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: 'INTERMEDIATE' },
    skills: [{ type: String }],
    technologies: [{ type: String }],
    problemStatement: { type: String, default: '' },
    objective: { type: String, default: '' },
    scope: { type: String, default: '' },
    features: [{ type: String }],
    requirements: {
      functional: [{ type: String }],
      nonFunctional: [{ type: String }],
      constraints: [{ type: String }],
      successCriteria: [{ type: String }],
    },
    architecture: {
      frontend: { type: String, default: '' },
      backend: { type: String, default: '' },
      database: { type: String, default: '' },
      authentication: { type: String, default: '' },
      ai: { type: String, default: '' },
      apis: { type: String, default: '' },
      deployment: { type: String, default: '' },
    },
    milestones: [milestoneSchema],
    evidence: [evidenceSchema],
    repositoryReference: { url: String, authorized: { type: Boolean, default: false }, label: String },
    deploymentReference: { url: String, environment: String, lastDeployed: Date, verified: { type: Boolean, default: false } },
    demoReference: { url: String, type: { type: String, enum: ['LIVE', 'SCREENSHOT', 'VIDEO', 'DOC'], default: 'DOC' } },
    health: { type: String, enum: HEALTH_STATUSES, default: 'ON_TRACK' },
    blockers: [{ type: String }],
    careerGoal: { type: String, default: '' },
    careerRelevance: { type: String, default: '' },
    opportunityRefs: [{ source: String, opportunityId: String, title: String, matchSkills: [String] }],
    graphRefs: [{ entityType: String, entityId: String, label: String }],
    aiGenerated: {
      plan: { type: Boolean, default: false },
      architecture: { type: Boolean, default: false },
      readme: { type: Boolean, default: false },
      codeSamples: { type: Boolean, default: false },
    },
    documentation: { readme: String, testPlan: String, securityNotes: String },
    teamMembers: [{ userId: mongoose.Schema.Types.ObjectId, role: String, contribution: String }],
    timeline: [{ event: String, description: String, at: { type: Date, default: Date.now } }],
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
)

portfolioProjectSchema.index({ ownerUserId: 1, status: 1, updatedAt: -1 })

module.exports = mongoose.model('PortfolioProject', portfolioProjectSchema)
