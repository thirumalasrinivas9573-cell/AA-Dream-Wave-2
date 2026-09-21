const mongoose = require('mongoose');

const portalEventSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['institution', 'company'], required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: [
      'event', 'seminar', 'workshop', 'competition', 'hackathon', 'webinar', 'training',
      'conference', 'open-day', 'coding-challenge', 'hiring-drive', 'campus-recruitment',
      'announcement', 'other',
    ],
    default: 'event',
  },
  venue: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  status: { type: String, enum: ['draft', 'published', 'cancelled', 'completed'], default: 'published' },
  image: { type: String, default: '' },
  registrations: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('PortalEvent', portalEventSchema);
