const mongoose = require('mongoose')
const { PROGRAM_ACTIVITY_TYPES } = require('../constants/institutionPrograms')

const programActivitySchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionProgram',
      required: true,
      index: true,
    },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    type: { type: String, enum: PROGRAM_ACTIVITY_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, trim: true, default: 'system' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

programActivitySchema.index({ programId: 1, createdAt: -1 })

module.exports = mongoose.model('ProgramActivity', programActivitySchema)
