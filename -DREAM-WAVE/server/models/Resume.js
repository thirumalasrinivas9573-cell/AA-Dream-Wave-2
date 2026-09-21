const mongoose = require('mongoose')
const crypto = require('crypto')

const datedEntrySchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 200, default: '' },
  organization: { type: String, trim: true, maxlength: 200, default: '' },
  location: { type: String, trim: true, maxlength: 160, default: '' },
  startDate: { type: String, trim: true, maxlength: 30, default: '' },
  endDate: { type: String, trim: true, maxlength: 30, default: '' },
  current: { type: Boolean, default: false },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  highlights: [{ type: String, trim: true, maxlength: 500 }],
}, { _id: true })

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 120, default: 'Professional Resume' },
  template: { type: String, enum: ['modern', 'classic', 'compact'], default: 'modern' },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
  isDefault: { type: Boolean, default: false, index: true },
  personal: {
    fullName: { type: String, trim: true, maxlength: 120, default: '' },
    headline: { type: String, trim: true, maxlength: 180, default: '' },
    email: { type: String, trim: true, maxlength: 200, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    summary: { type: String, trim: true, maxlength: 3000, default: '' },
    portfolio: { type: String, trim: true, maxlength: 1000, default: '' },
    github: { type: String, trim: true, maxlength: 1000, default: '' },
    linkedin: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  education: [{
    institution: { type: String, trim: true, maxlength: 200, default: '' },
    degree: { type: String, trim: true, maxlength: 200, default: '' },
    field: { type: String, trim: true, maxlength: 160, default: '' },
    startDate: { type: String, trim: true, maxlength: 30, default: '' },
    endDate: { type: String, trim: true, maxlength: 30, default: '' },
    cgpa: { type: String, trim: true, maxlength: 20, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
  }],
  skills: [{
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, trim: true, maxlength: 80, default: 'Technical' },
    level: { type: Number, min: 0, max: 100, default: 50 },
  }],
  projects: [{
    title: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, trim: true, maxlength: 3000, default: '' },
    technologies: [{ type: String, trim: true, maxlength: 100 }],
    githubUrl: { type: String, trim: true, maxlength: 1000, default: '' },
    demoUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  }],
  experience: { type: [datedEntrySchema], default: [] },
  internships: { type: [datedEntrySchema], default: [] },
  certifications: [{
    title: { type: String, trim: true, maxlength: 200, default: '' },
    issuer: { type: String, trim: true, maxlength: 200, default: '' },
    issuedAt: { type: String, trim: true, maxlength: 30, default: '' },
    credentialId: { type: String, trim: true, maxlength: 200, default: '' },
    url: { type: String, trim: true, maxlength: 1000, default: '' },
  }],
  achievements: [{
    title: { type: String, trim: true, maxlength: 200, default: '' },
    issuer: { type: String, trim: true, maxlength: 200, default: '' },
    date: { type: String, trim: true, maxlength: 30, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
  }],
  languages: [{
    name: { type: String, trim: true, maxlength: 100, default: '' },
    proficiency: { type: String, trim: true, maxlength: 80, default: '' },
  }],
  socialLinks: [{
    label: { type: String, trim: true, maxlength: 80, default: '' },
    url: { type: String, trim: true, maxlength: 1000, default: '' },
  }],
  references: [{
    name: { type: String, trim: true, maxlength: 120, default: '' },
    relationship: { type: String, trim: true, maxlength: 120, default: '' },
    organization: { type: String, trim: true, maxlength: 200, default: '' },
    email: { type: String, trim: true, maxlength: 200, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
  }],
  atsSnapshot: {
    strength: { type: Number, min: 0, max: 100, default: 0 },
    formattingScore: { type: Number, min: 0, max: 100, default: 0 },
    keywordMatch: { type: Number, min: 0, max: 100, default: 0 },
    missingSections: [{ type: String, maxlength: 80 }],
    missingSkills: [{ type: String, maxlength: 100 }],
    suggestions: [{ type: String, maxlength: 500 }],
    analyzedAt: Date,
    engine: { type: String, default: 'rules-v1' },
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
    select: false,
    default: () => crypto.randomBytes(24).toString('hex'),
  },
  revision: { type: Number, min: 1, default: 1 },
  lastAutosavedAt: Date,
}, { timestamps: true })

resumeSchema.index({ userId: 1, updatedAt: -1 })
resumeSchema.index({ userId: 1, status: 1, isDefault: -1 })

module.exports = mongoose.model('Resume', resumeSchema)
