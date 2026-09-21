const mongoose = require('mongoose')
const { CONNECTION_TYPES, CONNECTION_STATUSES } = require('../constants/institutionAlumni')

const institutionAlumniConnectionSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    fromAlumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumni',
      required: true,
      index: true,
    },
    toAlumniId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionAlumni',
      default: null,
      index: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    connectionType: { type: String, enum: CONNECTION_TYPES, default: 'professional', index: true },
    status: { type: String, enum: CONNECTION_STATUSES, default: 'pending', index: true },
    message: { type: String, trim: true, default: '' },
    initiatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

institutionAlumniConnectionSchema.index(
  { institutionId: 1, fromAlumniId: 1, toAlumniId: 1 },
  { unique: true, partialFilterExpression: { toAlumniId: { $ne: null } } },
)

module.exports = mongoose.model('InstitutionAlumniConnection', institutionAlumniConnectionSchema)
