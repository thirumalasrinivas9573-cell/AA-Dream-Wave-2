const mongoose = require('mongoose')

const taskCertificateSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'skill',
      trim: true,
    },
    issuer: {
      type: String,
      default: 'Dream Wave AI',
      trim: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    verificationUrl: {
      type: String,
      trim: true,
      default: '',
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    linkedToResume: {
      type: Boolean,
      default: false,
    },
    linkedResumeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
      },
    ],
  },
  { timestamps: true },
)

taskCertificateSchema.index({ userId: 1, taskId: 1 }, { unique: true })

module.exports = mongoose.model('TaskCertificate', taskCertificateSchema)
