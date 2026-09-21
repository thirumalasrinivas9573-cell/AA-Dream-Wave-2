const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  payload: {
    books: [{ type: mongoose.Schema.Types.Mixed }],
    courses: [{ type: mongoose.Schema.Types.Mixed }],
    institutions: [{ type: mongoose.Schema.Types.Mixed }],
    companies: [{ type: mongoose.Schema.Types.Mixed }],
    jobs: [{ type: mongoose.Schema.Types.Mixed }],
    internships: [{ type: mongoose.Schema.Types.Mixed }],
    learningPaths: [{ type: mongoose.Schema.Types.Mixed }],
    careerRoadmaps: [{ type: mongoose.Schema.Types.Mixed }],
  },
  reason: { type: String, default: '' },
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
}, { timestamps: true });

recommendationSchema.index({ userId: 1, generatedAt: -1 });
recommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
