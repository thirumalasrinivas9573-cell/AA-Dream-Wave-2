const mongoose = require('mongoose');

const mentorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    headline: { type: String, default: '', maxlength: 200 },
    bio: { type: String, default: '', maxlength: 5000 },
    expertise: [{ type: String, maxlength: 80 }],
    domains: [{ type: String, maxlength: 80 }],
    languages: [{ type: String, maxlength: 40 }],
    availability: {
      timezone: { type: String, default: 'Asia/Kolkata', maxlength: 60 },
      slots: [
        {
          day: {
            type: String,
            enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
            required: true,
          },
          start: { type: String, maxlength: 8 },
          end: { type: String, maxlength: 8 },
        },
      ],
      acceptingBookings: { type: Boolean, default: true },
    },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    sessionCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

mentorProfileSchema.index({ expertise: 1, isActive: 1 });
mentorProfileSchema.index({ headline: 'text', bio: 'text', expertise: 'text' });

module.exports = mongoose.model('MentorProfile', mentorProfileSchema);
