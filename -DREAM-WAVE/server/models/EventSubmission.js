const mongoose = require('mongoose')
const { EVENT_SOURCES, SUBMISSION_STATUSES, RESULT_LABELS } = require('../constants/eventOpportunity')

const eventSubmissionSchema = new mongoose.Schema(
  {
    source: { type: String, enum: EVENT_SOURCES, required: true, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventTeam', default: null, index: true },
    submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, required: true, maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 5000 },
    repositoryUrl: { type: String, trim: true, default: '' },
    demoUrl: { type: String, trim: true, default: '' },
    presentationUrl: { type: String, trim: true, default: '' },
    documentationUrl: { type: String, trim: true, default: '' },
    /** Reference to canonical MJProject — not duplicated */
    linkedProjectId: { type: String, trim: true, default: null },
    status: { type: String, enum: SUBMISSION_STATUSES, default: 'draft', index: true },
    submittedAt: { type: Date, default: null },
    result: { type: String, enum: [...RESULT_LABELS, ''], default: '' },
    resultNotes: { type: String, trim: true, default: '' },
    isPublic: { type: Boolean, default: false },
    organizerSetResult: { type: Boolean, default: false },
  },
  { timestamps: true },
)

eventSubmissionSchema.index({ source: 1, sourceId: 1, submittedByUserId: 1 })
eventSubmissionSchema.index({ teamId: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('EventSubmission', eventSubmissionSchema)
