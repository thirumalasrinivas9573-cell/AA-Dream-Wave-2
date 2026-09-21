const mongoose = require('mongoose')

const dayAvailabilitySchema = {
  enabled: { type: Boolean, default: true },
  minutes: { type: Number, min: 0, max: 24 * 60, default: 120 },
  morningMinutes: { type: Number, min: 0, max: 12 * 60, default: 0 },
  eveningMinutes: { type: Number, min: 0, max: 12 * 60, default: 0 },
}

const plannerPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  timezone: {
    type: String,
    default: 'UTC',
    trim: true,
  },
  availableTodayMinutes: {
    type: Number,
    min: 0,
    max: 24 * 60,
    default: 180,
  },
  weeklyAvailability: {
    monday: dayAvailabilitySchema,
    tuesday: dayAvailabilitySchema,
    wednesday: dayAvailabilitySchema,
    thursday: dayAvailabilitySchema,
    friday: dayAvailabilitySchema,
    saturday: dayAvailabilitySchema,
    sunday: dayAvailabilitySchema,
  },
  preferredStudyTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', 'flexible'],
    default: 'flexible',
  },
  sessionLengthMinutes: {
    type: Number,
    min: 15,
    max: 180,
    default: 45,
  },
  shortBreakMinutes: {
    type: Number,
    min: 0,
    max: 60,
    default: 5,
  },
  longBreakMinutes: {
    type: Number,
    min: 0,
    max: 90,
    default: 15,
  },
  maxDailyStudyMinutes: {
    type: Number,
    min: 30,
    max: 24 * 60,
    default: 360,
  },
  preferredDifficultyMix: {
    type: String,
    enum: ['easy-first', 'hard-first', 'balanced'],
    default: 'balanced',
  },
  defaultTimerMode: {
    type: String,
    enum: ['custom', '25', '45', '60'],
    default: '45',
  },
  breakReminders: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true })

module.exports = mongoose.model('PlannerPreferences', plannerPreferencesSchema)
