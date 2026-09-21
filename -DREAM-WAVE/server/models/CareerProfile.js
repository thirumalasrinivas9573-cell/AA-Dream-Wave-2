const mongoose = require('mongoose')

const careerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    immutable: true,
  },
  targetCareer: { type: String, trim: true, maxlength: 160, default: '' },
  targetRoles: [{ type: String, trim: true, maxlength: 120 }],
  preferredLocations: [{ type: String, trim: true, maxlength: 120 }],
  preferredIndustries: [{ type: String, trim: true, maxlength: 120 }],
  preferredWorkModes: [{
    type: String,
    enum: ['onsite', 'remote', 'hybrid'],
  }],
  preferredJobTypes: [{
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'remote', 'graduate', 'apprenticeship', 'campus'],
  }],
  salaryExpectation: {
    min: { type: Number, min: 0, default: 0 },
    max: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, maxlength: 8, default: 'INR' },
  },
  openToJobs: { type: Boolean, default: true },
  openToInternships: { type: Boolean, default: true },
  recruiterVisible: { type: Boolean, default: false },
  requiredSkills: [{ type: String, trim: true, maxlength: 100 }],
  revision: { type: Number, min: 1, default: 1 },
}, { timestamps: true })

careerProfileSchema.index({ targetRoles: 1 })
careerProfileSchema.index({ recruiterVisible: 1, updatedAt: -1 })

module.exports = mongoose.model('CareerProfile', careerProfileSchema)
