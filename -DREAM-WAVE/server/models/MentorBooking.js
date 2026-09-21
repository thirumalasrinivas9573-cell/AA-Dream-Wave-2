const mongoose = require('mongoose');

const mentorBookingSchema = new mongoose.Schema(
  {
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    topic: { type: String, required: true, maxlength: 240 },
    notes: { type: String, default: '', maxlength: 4000 },
    scheduledAt: { type: Date, required: true, index: true },
    durationMin: { type: Number, default: 30, min: 15, max: 180 },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'],
      default: 'requested',
      index: true,
    },
    sessionNotes: { type: String, default: '', maxlength: 8000 },
    rating: { type: Number, default: null, min: 1, max: 5 },
    ratingComment: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

mentorBookingSchema.index({ mentor: 1, scheduledAt: -1 });
mentorBookingSchema.index({ mentee: 1, scheduledAt: -1 });

module.exports = mongoose.model('MentorBooking', mentorBookingSchema);
