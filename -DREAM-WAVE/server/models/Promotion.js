const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['institution', 'company'], required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  ownerName: { type: String, default: '' },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  category: {
    type: String,
    enum: ['news', 'event', 'seminar', 'workshop', 'competition', 'hackathon', 'admission', 'scholarship', 'result', 'announcement', 'job', 'internship', 'training', 'product', 'service', 'other'],
    default: 'news',
    index: true,
  },
  image: { type: String, default: '' },
  link: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected', 'published'], default: 'pending', index: true },
  publishedAt: { type: Date },
  views: { type: Number, default: 0 },
  engagement: { type: Number, default: 0 },
}, { timestamps: true });

promotionSchema.index({ title: 'text', content: 'text' });
promotionSchema.index({ ownerType: 1, ownerId: 1, status: 1, publishedAt: -1 });

module.exports = mongoose.model('Promotion', promotionSchema);
