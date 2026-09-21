const mongoose = require('mongoose');
const {
  PLANS,
  ORG_TYPES,
  INSTITUTION_KINDS,
  COMPANY_SIZES,
  VERIFICATION_STATUS,
} = require('../config/constants');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    type: {
      type: String,
      enum: Object.values(ORG_TYPES),
      default: ORG_TYPES.INSTITUTION,
      index: true,
    },
    institutionKind: {
      type: String,
      enum: Object.values(INSTITUTION_KINDS),
      default: INSTITUTION_KINDS.SCHOOL,
      index: true,
    },
    plan: { type: String, enum: Object.values(PLANS), default: PLANS.FREE },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profile: {
      description: { type: String, default: '', maxlength: 2000 },
      website: { type: String, default: '', maxlength: 200 },
      phone: { type: String, default: '', maxlength: 40 },
      email: { type: String, default: '', maxlength: 120 },
      address: { type: String, default: '', maxlength: 300 },
      city: { type: String, default: '', maxlength: 80 },
      state: { type: String, default: '', maxlength: 80 },
      country: { type: String, default: '', maxlength: 80 },
      logoUrl: { type: String, default: '' },
    },
    company: {
      industry: { type: String, default: '', maxlength: 120 },
      size: { type: String, enum: [...COMPANY_SIZES, ''], default: '' },
      locations: [
        {
          label: { type: String, default: '', maxlength: 80 },
          city: { type: String, default: '', maxlength: 80 },
          state: { type: String, default: '', maxlength: 80 },
          country: { type: String, default: '', maxlength: 80 },
          isPrimary: { type: Boolean, default: false },
        },
      ],
      verificationStatus: {
        type: String,
        enum: VERIFICATION_STATUS,
        default: 'unverified',
        index: true,
      },
      verificationNotes: { type: String, default: '', maxlength: 500 },
      verifiedAt: { type: Date, default: null },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    settings: {
      timezone: { type: String, default: 'UTC', maxlength: 60 },
      locale: { type: String, default: 'en', maxlength: 10 },
      attendanceRequiredPercent: { type: Number, default: 75, min: 0, max: 100 },
      notificationsEnabled: { type: Boolean, default: true },
      academicYearLabel: { type: String, default: '', maxlength: 40 },
      hiringNotifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
