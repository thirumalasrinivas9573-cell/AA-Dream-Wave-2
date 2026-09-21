const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['institution', 'company'], required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  recipientName: { type: String, required: true, trim: true },
  recipientEmail: { type: String, default: '' },
  title: { type: String, required: true, trim: true },
  type: { type: String, default: 'completion' },
  issuedAt: { type: Date, default: Date.now },
  url: { type: String, default: '' },
}, { timestamps: true });

certificateSchema.index({ ownerType: 1, ownerId: 1, issuedAt: -1 });
certificateSchema.index({ recipientEmail: 1, issuedAt: -1 });

module.exports = mongoose.model('PortalCertificate', certificateSchema);
