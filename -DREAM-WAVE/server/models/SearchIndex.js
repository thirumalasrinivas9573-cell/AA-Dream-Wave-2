const mongoose = require('mongoose');

const searchIndexSchema = new mongoose.Schema({
  query: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  filters: { type: mongoose.Schema.Types.Mixed },
  resultCounts: { type: mongoose.Schema.Types.Mixed },
  day: { type: String, index: true },
  scope: { type: String, enum: ['public', 'workspace'], default: 'public' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
}, { timestamps: true });

searchIndexSchema.index({ userId: 1, createdAt: -1 });
searchIndexSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SearchIndex', searchIndexSchema);
