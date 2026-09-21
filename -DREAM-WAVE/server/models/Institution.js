const mongoose = require('mongoose');

/**
 * Merged Institution schema:
 * - integration-v1 (Thirumala): rich public portal profile (ownerId, slug, contact, stats, …)
 * - feature/ui-threejs (Lasya): partnership/org resolution fields (ownerUserId, type, departments, …)
 * Both owner fields are kept and synced so existing controllers remain compatible.
 */
const institutionSchema = new mongoose.Schema({
  // Ownership — Thirumala portal uses ownerId; Lasya resolveOrganization uses ownerUserId
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true, unique: true },

  slug: { type: String, unique: true, sparse: true, trim: true },
  name: { type: String, required: true, trim: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'approved', index: true },

  // Type — keep both institutionType (portal) and type (partnership discovery)
  institutionType: {
    type: String,
    enum: ['university', 'engineering', 'medical', 'college', 'school', 'training', 'bootcamp', 'other'],
    default: 'college',
    index: true,
  },
  type: {
    type: String,
    enum: ['university', 'college', 'school', 'institute', 'other'],
    default: 'college',
  },
  code: { type: String, trim: true, default: '' },

  establishedYear: { type: Number, default: null },
  ranking: { type: Number, default: null, index: true },
  verified: { type: Boolean, default: true },

  logo: { type: String, default: '' },
  logoUrl: { type: String, trim: true, default: '' },
  banner: { type: String, default: '' },
  about: { type: String, default: '' },
  description: { type: String, trim: true, default: '' },
  mission: { type: String, default: '' },
  vision: { type: String, default: '' },
  history: { type: String, default: '' },

  // Flat contact fields used by Lasya partnership discovery search
  email: { type: String, trim: true, lowercase: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '', index: true },
  state: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: '', index: true },
  departments: [{ type: String, trim: true }],
  programs: [{ type: String, trim: true }],

  leadership: {
    chairmanMessage: { type: String, default: '' },
    principalMessage: { type: String, default: '' },
    directorMessage: { type: String, default: '' },
  },
  campus: {
    laboratories: { type: String, default: '' },
    library: { type: String, default: '' },
    hostels: { type: String, default: '' },
    sports: { type: String, default: '' },
    transportation: { type: String, default: '' },
    cafeteria: { type: String, default: '' },
    medical: { type: String, default: '' },
    hostelAvailable: { type: Boolean, default: false },
  },
  academicCalendar: { type: String, default: '' },
  placementTimeline: { type: String, default: '' },
  internshipsInfo: { type: String, default: '' },
  contact: {
    email: String,
    phone: String,
    website: String,
    address: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
  },
  social: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String,
    youtube: String,
  },
  location: { lat: Number, lng: Number },
  admissionInfo: { type: String, default: '' },
  scholarships: { type: String, default: '' },
  brochureUrl: { type: String, default: '' },
  facilities: [{ type: String }],
  achievements: [{ title: String, year: String, description: String }],
  research: [{ title: String, summary: String, url: String }],
  recruiters: [{ name: String, logo: String, package: String }],
  aiInsights: {
    bestCourses: [{ type: String }],
    trendingPrograms: [{ type: String }],
    industryDemand: { type: String, default: '' },
    placementForecast: { type: String, default: '' },
    salaryOutlook: { type: String, default: '' },
    futureSkills: [{ type: String }],
    admissionCompetition: { type: String, default: '' },
    careerOpportunities: [{ type: String }],
    summary: { type: String, default: '' },
    generatedAt: { type: Date },
  },
  stats: {
    studentCount: { type: Number, default: 0 },
    facultyCount: { type: Number, default: 0 },
    placementRate: { type: Number, default: 0 },
    highestPackage: { type: Number, default: 0 },
    averagePackage: { type: Number, default: 0 },
    visitors: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    aiRating: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    courseViews: { type: Number, default: 0 },
    galleryViews: { type: Number, default: 0 },
    placementViews: { type: Number, default: 0 },
    studentInterest: { type: Number, default: 0 },
  },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

const TYPE_TO_INSTITUTION = {
  university: 'university',
  college: 'college',
  school: 'school',
  institute: 'other',
  other: 'other',
};
const INSTITUTION_TO_TYPE = {
  university: 'university',
  engineering: 'college',
  medical: 'college',
  college: 'college',
  school: 'school',
  training: 'institute',
  bootcamp: 'institute',
  other: 'other',
};

institutionSchema.pre('validate', function syncOwnerAndContact(next) {
  if (this.ownerId && !this.ownerUserId) this.ownerUserId = this.ownerId;
  if (this.ownerUserId && !this.ownerId) this.ownerId = this.ownerUserId;

  if (this.institutionType && (!this.type || this.isModified('institutionType'))) {
    this.type = INSTITUTION_TO_TYPE[this.institutionType] || 'other';
  } else if (this.type && (!this.institutionType || this.isModified('type'))) {
    this.institutionType = TYPE_TO_INSTITUTION[this.type] || 'other';
  }

  if (!this.logoUrl && this.logo) this.logoUrl = this.logo;
  if (!this.logo && this.logoUrl) this.logo = this.logoUrl;
  if (!this.description && this.about) this.description = this.about;
  if (!this.about && this.description) this.about = this.description;

  this.contact = this.contact || {};
  const flatToContact = ['email', 'phone', 'website', 'address', 'city', 'state', 'country'];
  for (const key of flatToContact) {
    if (this[key] && !this.contact[key]) this.contact[key] = this[key];
    if (this.contact[key] && !this[key]) this[key] = this.contact[key];
  }
  next();
});

institutionSchema.index({ name: 'text', about: 'text', mission: 'text', city: 'text', country: 'text', description: 'text' });
institutionSchema.index({ 'contact.state': 1, 'contact.city': 1 });
institutionSchema.index({ 'stats.aiRating': -1 });
institutionSchema.index({ 'stats.placementRate': -1 });
institutionSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Institution', institutionSchema);
