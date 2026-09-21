const mongoose = require('mongoose')

const companySchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    industry: { type: String, trim: true, default: '', index: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    logoUrl: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '', index: true },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    about: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    companySize: { type: String, trim: true, default: '' },
    headquarters: { type: String, trim: true, default: '' },
    hiringDepartments: [{ type: String, trim: true }],
    hiringLocations: [
      {
        city: { type: String, trim: true, default: '' },
        country: { type: String, trim: true, default: '' },
        workMode: { type: String, enum: ['remote', 'hybrid', 'office', ''], default: '' },
      },
    ],
    hrContacts: [
      {
        name: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        role: { type: String, trim: true, default: '' },
      },
    ],
    recruiterTeam: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        name: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' },
        role: { type: String, trim: true, default: 'recruiter' },
      },
    ],
    careersPageUrl: { type: String, trim: true, default: '' },
    socialLinks: {
      linkedin: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      github: { type: String, trim: true, default: '' },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending_verification'],
      default: 'active',
      index: true,
    },
    pipelineStages: [
      {
        key: { type: String, trim: true, required: true },
        label: { type: String, trim: true, required: true },
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
      },
    ],
    verified: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: true },
    activeJobsCount: { type: Number, default: 0, min: 0 },
    activeInternshipsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

companySchema.index({ name: 'text', industry: 'text', location: 'text' })
companySchema.index({ isPublic: 1, name: 1 })

module.exports = mongoose.model('Company', companySchema)
