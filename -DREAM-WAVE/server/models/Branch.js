const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },
    address: { type: String, default: '', maxlength: 300 },
    city: { type: String, default: '', maxlength: 80 },
    phone: { type: String, default: '', maxlength: 40 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index(
  { organizationId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string', $gt: '' } } }
);
branchSchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);
