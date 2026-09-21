const mongoose = require('mongoose')

const interviewPanelSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: '' },
    members: [
      {
        name: { type: String, trim: true, required: true },
        role: { type: String, trim: true, default: '' },
        department: { type: String, trim: true, default: '' },
        expertise: [{ type: String, trim: true }],
        email: { type: String, trim: true, default: '' },
        availability: { type: String, trim: true, default: '' },
      },
    ],
    assignedApplicationIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'RecruitmentApplication' },
    ],
    isActive: { type: Boolean, default: true },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

interviewPanelSchema.index({ companyId: 1, name: 1 })

module.exports = mongoose.model('InterviewPanel', interviewPanelSchema)
