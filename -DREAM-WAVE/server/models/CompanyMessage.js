const mongoose = require('mongoose');

const companyMessageSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'JobApplication', default: null },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, maxlength: 4000 },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

companyMessageSchema.index({ organizationId: 1, createdAt: -1 });
companyMessageSchema.index({ toUser: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('CompanyMessage', companyMessageSchema);
