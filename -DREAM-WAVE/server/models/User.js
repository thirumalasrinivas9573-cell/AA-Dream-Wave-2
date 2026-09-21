const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    // Not globally unique — one email may own Student + Institution + Company accounts.
    // Uniqueness is (email, role); see compound index below.
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  aaid: {
    type: String,
    unique: true,
    sparse: true,
    default: () => 'AAID' + crypto.randomBytes(6).toString('hex').toUpperCase(),
  },
  profileImage: {
    type: String,
    default: ''
  },
  level: {
    type: Number,
    default: 1
  },
  credits: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  goals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }],
  certificates: [{
    type: {
      type: String,
      default: 'completion',
    },
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      default: '',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  planActivatedAt: {
    type: Date,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    default: null,
  },
  verificationOTP: {
    type: String,
    default: null,
  },
  verificationOTPExpires: {
    type: Date,
    default: null,
  },
  resetPasswordOTP: {
    type: String,
    default: null,
  },
  resetPasswordOTPExpires: {
    type: Date,
    default: null,
  },
  role: {
    type: String,
    enum: ['student', 'institution', 'company', 'admin'],
    required: false,
  },
  suspended: {
    type: Boolean,
    default: false,
  },
  // Server-owned lifecycle. Clients must never write this field.
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_VERIFICATION'],
    default: 'ACTIVE',
    index: true,
  },
  // Server-owned. Updated only on successful authentication events.
  lastLoginAt: {
    type: Date,
    default: null,
    index: true,
  },
  // Canonical institution link for students (optional until verified/linked).
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    default: null,
    index: true,
  },
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  organizationName: {
    type: String,
    default: '',
    trim: true,
  },
  learningGoal: {
    type: String,
    default: '',
    trim: true,
  },
  phone: {
    type: String,
    default: '',
    trim: true,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  phoneOTP: {
    type: String,
    default: null,
  },
  phoneOTPExpires: {
    type: Date,
    default: null,
  },
  registrationComplete: {
    type: Boolean,
    default: true, // legacy users are complete; portal wizard sets false until finish
  },
  emailOtpAttempts: { type: Number, default: 0 },
  emailOtpSentAt: { type: Date, default: null },
  phoneOtpAttempts: { type: Number, default: 0 },
  phoneOtpSentAt: { type: Date, default: null },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  passwordHistory: { type: [String], default: [] },
});

// One portal account per email (student / institution / company / admin)
userSchema.index({ email: 1, role: 1 }, { unique: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate AAID fallback (default handles this — kept for backward compat)
userSchema.pre('save', function(next) {
  if (!this.aaid) {
    this.aaid = 'AAID' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
