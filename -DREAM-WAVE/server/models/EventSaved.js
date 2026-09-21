const mongoose = require('mongoose')
const { EVENT_SOURCES } = require('../constants/eventOpportunity')

const eventSavedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    source: { type: String, enum: EVENT_SOURCES, required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

eventSavedSchema.index({ userId: 1, source: 1, sourceId: 1 }, { unique: true })

module.exports = mongoose.model('EventSaved', eventSavedSchema)
