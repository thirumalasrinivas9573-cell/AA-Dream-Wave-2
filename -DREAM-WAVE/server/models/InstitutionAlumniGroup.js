const mongoose = require('mongoose')
const { GROUP_TYPES, GROUP_STATUSES } = require('../constants/institutionAlumni')

const institutionAlumniGroupSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    name: { type: String, trim: true, required: true },
    nameNormalized: { type: String, trim: true, required: true, index: true },
    description: { type: String, trim: true, default: '' },
    groupType: { type: String, enum: GROUP_TYPES, default: 'interest', index: true },
    chapterLocation: { type: String, trim: true, default: '' },
    interestTags: [{ type: String, trim: true }],
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InstitutionAlumni' }],
    memberCount: { type: Number, default: 0 },
    status: { type: String, enum: GROUP_STATUSES, default: 'active', index: true },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionAlumniGroupSchema.pre('validate', function preValidate(next) {
  if (this.name) {
    this.nameNormalized = String(this.name).trim().toLowerCase().replace(/\s+/g, ' ')
  }
  next()
})

institutionAlumniGroupSchema.index({ institutionId: 1, nameNormalized: 1 }, { unique: true })
institutionAlumniGroupSchema.index({ name: 'text', description: 'text' })

module.exports = mongoose.model('InstitutionAlumniGroup', institutionAlumniGroupSchema)
