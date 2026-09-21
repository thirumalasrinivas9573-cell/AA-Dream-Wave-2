const mongoose = require('mongoose')
const { EVENT_SOURCES, TEAM_ROLES, TEAM_INVITE_STATUSES } = require('../constants/eventOpportunity')

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true, required: true },
    role: { type: String, enum: TEAM_ROLES, default: 'member' },
    status: { type: String, enum: TEAM_INVITE_STATUSES, default: 'accepted' },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null },
  },
  { _id: true },
)

const eventTeamSchema = new mongoose.Schema(
  {
    source: { type: String, enum: EVENT_SOURCES, required: true, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    name: { type: String, trim: true, required: true, maxlength: 120 },
    captainUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [memberSchema],
    track: { type: String, trim: true, default: '' },
    theme: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['forming', 'ready', 'submitted', 'disbanded'], default: 'forming' },
  },
  { timestamps: true },
)

eventTeamSchema.index({ source: 1, sourceId: 1, captainUserId: 1 }, { unique: true })
eventTeamSchema.index({ institutionId: 1, source: 1, sourceId: 1 })

module.exports = mongoose.model('EventTeam', eventTeamSchema)
