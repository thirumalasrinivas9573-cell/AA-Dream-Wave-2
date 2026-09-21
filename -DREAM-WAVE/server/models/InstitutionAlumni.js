const mongoose = require('mongoose')
const {
  ALUMNI_STATUSES,
  VERIFICATION_STATUSES,
  PROFILE_VISIBILITY,
  CONTACT_PREFERENCES,
  ALUMNI_INDUSTRIES,
  normalizeEmail,
  normalizeAlumniName,
} = require('../constants/institutionAlumni')

const careerEntrySchema = new mongoose.Schema(
  {
    company: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    startDate: { type: String, trim: true, default: '' },
    endDate: { type: String, trim: true, default: '' },
    isCurrent: { type: Boolean, default: false },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true },
)

const educationEntrySchema = new mongoose.Schema(
  {
    institution: { type: String, trim: true, default: '' },
    degree: { type: String, trim: true, default: '' },
    field: { type: String, trim: true, default: '' },
    graduationYear: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true },
)

const profileHistorySchema = new mongoose.Schema(
  {
    action: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
)

const institutionAlumniSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    linkedStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstitutionStudent',
      default: null,
      index: true,
    },
    fullName: { type: String, trim: true, required: true },
    nameNormalized: { type: String, trim: true, required: true, index: true },
    email: { type: String, trim: true, default: '' },
    emailNormalized: { type: String, trim: true, default: '', index: true },
    phone: { type: String, trim: true, default: '' },
    graduationYear: { type: String, trim: true, default: '', index: true },
    department: { type: String, trim: true, default: '', index: true },
    degree: { type: String, trim: true, default: '' },
    currentCompany: { type: String, trim: true, default: '', index: true },
    currentRole: { type: String, trim: true, default: '', index: true },
    industry: { type: String, enum: ALUMNI_INDUSTRIES, default: 'other', index: true },
    skills: [{ type: String, trim: true }],
    location: {
      city: { type: String, trim: true, default: '', index: true },
      state: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
    },
    professionalSummary: { type: String, trim: true, default: '' },
    contactPreference: { type: String, enum: CONTACT_PREFERENCES, default: 'platform_message' },
    socialLinks: {
      linkedin: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
      github: { type: String, trim: true, default: '' },
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'pending',
      index: true,
    },
    profileVisibility: { type: String, enum: PROFILE_VISIBILITY, default: 'institution' },
    careerHistory: [careerEntrySchema],
    education: [educationEntrySchema],
    higherEducation: {
      degree: { type: String, trim: true, default: '' },
      institution: { type: String, trim: true, default: '' },
      field: { type: String, trim: true, default: '' },
      year: { type: String, trim: true, default: '' },
    },
    certifications: [
      {
        name: { type: String, trim: true, default: '' },
        issuer: { type: String, trim: true, default: '' },
        year: { type: String, trim: true, default: '' },
        url: { type: String, trim: true, default: '' },
      },
    ],
    achievements: [{ type: String, trim: true }],
    awards: [{ type: String, trim: true }],
    publications: [
      {
        title: { type: String, trim: true, default: '' },
        venue: { type: String, trim: true, default: '' },
        year: { type: String, trim: true, default: '' },
        url: { type: String, trim: true, default: '' },
      },
    ],
    portfolioLinks: [
      {
        title: { type: String, trim: true, default: '' },
        url: { type: String, trim: true, default: '' },
        type: { type: String, trim: true, default: 'portfolio' },
      },
    ],
    resumeUrl: { type: String, trim: true, default: '' },
    isMentorAvailable: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ALUMNI_STATUSES, default: 'active', index: true },
    profileHistory: [profileHistorySchema],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

institutionAlumniSchema.pre('validate', function preValidate(next) {
  if (this.fullName) this.nameNormalized = normalizeAlumniName(this.fullName)
  if (this.email) this.emailNormalized = normalizeEmail(this.email)
  next()
})

institutionAlumniSchema.index({ institutionId: 1, emailNormalized: 1 }, {
  unique: true,
  partialFilterExpression: { emailNormalized: { $type: 'string', $ne: '' } },
})
institutionAlumniSchema.index({ institutionId: 1, linkedStudentId: 1 }, {
  unique: true,
  partialFilterExpression: { linkedStudentId: { $ne: null } },
})
institutionAlumniSchema.index({ fullName: 'text', currentCompany: 'text', professionalSummary: 'text' })
institutionAlumniSchema.index({ institutionId: 1, department: 1, graduationYear: 1 })
institutionAlumniSchema.index({ institutionId: 1, 'location.country': 1 })
institutionAlumniSchema.index({ institutionId: 1, currentCompany: 1 })

module.exports = mongoose.model('InstitutionAlumni', institutionAlumniSchema)
