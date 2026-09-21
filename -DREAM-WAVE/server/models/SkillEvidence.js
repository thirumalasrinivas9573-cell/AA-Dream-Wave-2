const mongoose = require('mongoose')
const { EVIDENCE_TYPES } = require('../constants/adaptiveLearning')

const skillEvidenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skillId: { type: String, required: true, index: true },
    skillName: { type: String, required: true },
    evidenceType: { type: String, enum: EVIDENCE_TYPES, required: true },
    title: { type: String, default: '' },
    score: { type: Number, default: null, min: 0, max: 100 },
    passed: { type: Boolean, default: null },
    sourceRef: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    resourceType: { type: String, default: '' },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudySession', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

skillEvidenceSchema.index({ userId: 1, skillId: 1, recordedAt: -1 })

module.exports = mongoose.model('SkillEvidence', skillEvidenceSchema)
