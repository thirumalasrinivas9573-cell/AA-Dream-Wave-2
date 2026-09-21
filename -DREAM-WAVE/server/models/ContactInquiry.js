const mongoose = require('mongoose');

const contactInquirySchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  subject: { type: String, default: 'General inquiry' },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
}, { timestamps: true });

contactInquirySchema.index({ institutionId: 1, status: 1, createdAt: -1 });
contactInquirySchema.index({ companyId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ContactInquiry', contactInquirySchema);
