const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    title: { type: String, required: true },
    type: { type: String, default: 'performance' },
    career: String,
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    sections: [{ title: String, content: String }],
    pdfPath: String,
  },
  { timestamps: true }
);

reportSchema.index({ organizationId: 1, user: 1 });
reportSchema.index({ user: 1, createdAt: -1 });

reportSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
