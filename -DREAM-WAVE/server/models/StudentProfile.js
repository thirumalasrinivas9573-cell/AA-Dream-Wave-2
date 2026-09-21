const mongoose = require('mongoose')

const VISIBILITY = ['private', 'unlisted', 'public']

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  type: {
    type: String,
    enum: ['technical', 'soft', 'programming-language', 'framework', 'tool', 'spoken-language'],
    default: 'technical',
  },
  proficiency: { type: Number, min: 0, max: 100, default: 50 },
  years: { type: Number, min: 0, max: 80, default: 0 },
  verified: { type: Boolean, default: false },
  visibility: { type: String, enum: VISIBILITY, default: 'public' },
}, { timestamps: true })

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  technologies: [{ type: String, trim: true, maxlength: 80 }],
  githubUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  demoUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  screenshots: [{ type: String, trim: true, maxlength: 1000 }],
  status: { type: String, enum: ['planned', 'in-progress', 'completed', 'archived'], default: 'in-progress' },
  startedAt: Date,
  completedAt: Date,
  featured: { type: Boolean, default: false },
  visibility: { type: String, enum: VISIBILITY, default: 'public' },
  sortOrder: { type: Number, default: 0 },
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' },
}, { timestamps: true })

const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  type: {
    type: String,
    enum: ['competition', 'hackathon', 'sports', 'research', 'award', 'badge', 'academic', 'project', 'certification', 'leadership', 'community', 'other'],
    default: 'other',
  },
  issuer: { type: String, trim: true, maxlength: 200, default: '' },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  evidenceUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  awardedAt: Date,
  featured: { type: Boolean, default: false },
  visibility: { type: String, enum: VISIBILITY, default: 'public' },
  verified: { type: Boolean, default: false },
  relatedProjectId: { type: String, default: '' },
  relatedSkill: { type: String, trim: true, maxlength: 100, default: '' },
  shareToCommunity: { type: Boolean, default: false },
}, { timestamps: true })

const credentialSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  category: {
    type: String,
    enum: ['academic', 'course', 'skill', 'competition', 'professional', 'other'],
    default: 'other',
  },
  issuer: { type: String, required: true, trim: true, maxlength: 200 },
  credentialId: { type: String, trim: true, maxlength: 200, default: '' },
  verificationUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  documentUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  skills: [{ type: String, trim: true, maxlength: 100 }],
  issuedAt: Date,
  expiresAt: Date,
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected', 'expired', 'revoked'],
    default: 'unverified',
  },
  visibility: { type: String, enum: VISIBILITY, default: 'public' },
  featured: { type: Boolean, default: false },
  fileHash: { type: String, trim: true, maxlength: 128, default: '' },
}, { timestamps: true })

const academicJourneySchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['school', 'intermediate', 'diploma', 'undergraduate', 'postgraduate', 'other'],
    default: 'undergraduate',
  },
  institution: { type: String, required: true, trim: true, maxlength: 200 },
  program: { type: String, trim: true, maxlength: 200, default: '' },
  specialization: { type: String, trim: true, maxlength: 200, default: '' },
  startYear: { type: Number, min: 1950, max: 2100 },
  endYear: { type: Number, min: 1950, max: 2100 },
  status: { type: String, enum: ['completed', 'in-progress', 'planned'], default: 'in-progress' },
  visibility: { type: String, enum: VISIBILITY, default: 'public' },
  verified: { type: Boolean, default: false },
}, { timestamps: true })

const experienceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  organization: { type: String, trim: true, maxlength: 200, default: '' },
  type: {
    type: String,
    enum: ['internship', 'employment', 'volunteer', 'research', 'freelance', 'leadership', 'other'],
    default: 'internship',
  },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  startDate: Date,
  endDate: Date,
  current: { type: Boolean, default: false },
  visibility: { type: String, enum: VISIBILITY, default: 'public' },
}, { timestamps: true })

const studentProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    immutable: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 40,
    match: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
  },
  displayName: { type: String, trim: true, maxlength: 120, default: '' },
  profilePhoto: { type: String, trim: true, maxlength: 1000, default: '' },
  coverBanner: { type: String, trim: true, maxlength: 1000, default: '' },
  headline: { type: String, trim: true, maxlength: 180, default: '' },
  bio: { type: String, trim: true, maxlength: 2000, default: '' },
  location: { type: String, trim: true, maxlength: 200, default: '' },
  languages: [{ type: String, trim: true, maxlength: 80 }],
  links: [{
    label: { type: String, trim: true, maxlength: 80 },
    url: { type: String, trim: true, maxlength: 1000 },
  }],
  academic: {
    institution: { type: String, trim: true, maxlength: 200, default: '' },
    department: { type: String, trim: true, maxlength: 200, default: '' },
    course: { type: String, trim: true, maxlength: 200, default: '' },
    semester: { type: String, trim: true, maxlength: 40, default: '' },
    year: { type: String, trim: true, maxlength: 40, default: '' },
    cgpa: { type: Number, min: 0, max: 10, default: 0 },
    completedCourses: [{ type: String, trim: true, maxlength: 200 }],
    activeCourses: [{ type: String, trim: true, maxlength: 200 }],
  },
  academicJourney: { type: [academicJourneySchema], default: [] },
  experience: { type: [experienceSchema], default: [] },
  careerDirection: {
    targetRole: { type: String, trim: true, maxlength: 120, default: '' },
    interests: [{ type: String, trim: true, maxlength: 80 }],
    visibility: { type: String, enum: VISIBILITY, default: 'public' },
  },
  portfolio: {
    intro: { type: String, trim: true, maxlength: 2000, default: '' },
    featuredProjectIds: [{ type: String }],
    featuredCredentialIds: [{ type: String }],
    featuredAchievementIds: [{ type: String }],
    projectOrder: [{ type: String }],
    sections: {
      about: { type: Boolean, default: true },
      academic: { type: Boolean, default: true },
      skills: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
      credentials: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
      experience: { type: Boolean, default: true },
      career: { type: Boolean, default: true },
    },
  },
  viewCount: { type: Number, default: 0, min: 0 },
  usernameChangedAt: { type: Date, default: null },
  skills: { type: [skillSchema], default: [] },
  projects: { type: [projectSchema], default: [] },
  achievements: { type: [achievementSchema], default: [] },
  credentials: { type: [credentialSchema], default: [] },
  privacy: {
    visibility: { type: String, enum: VISIBILITY, default: 'private' },
    discoverable: { type: Boolean, default: false },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    showAcademic: { type: Boolean, default: true },
    showLearning: { type: Boolean, default: true },
    showSkills: { type: Boolean, default: true },
    showProjects: { type: Boolean, default: true },
    showAchievements: { type: Boolean, default: true },
    showCredentials: { type: Boolean, default: true },
    showExperience: { type: Boolean, default: true },
    showCareer: { type: Boolean, default: true },
    showLinks: { type: Boolean, default: true },
  },
  preferences: {
    theme: { type: String, enum: ['system', 'dark', 'light'], default: 'system' },
    language: { type: String, trim: true, maxlength: 20, default: 'en' },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: false },
    weeklySummary: { type: Boolean, default: true },
  },
  sectionOrder: {
    type: [String],
    default: ['overview', 'about', 'academic', 'skills', 'projects', 'credentials', 'achievements', 'experience', 'career'],
  },
  revision: { type: Number, min: 1, default: 1 },
}, { timestamps: true })

studentProfileSchema.index({ 'privacy.visibility': 1, 'privacy.discoverable': 1, updatedAt: -1 })
studentProfileSchema.index({ displayName: 'text', headline: 'text', 'skills.name': 'text' })

module.exports = mongoose.model('StudentProfile', studentProfileSchema)
