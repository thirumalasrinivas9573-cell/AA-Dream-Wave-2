const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'lead', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const collabTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 4000 },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [teamMemberSchema], default: [] },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
    sharedNotes: { type: String, default: '', maxlength: 50000 },
    sharedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    sharedRoadmapIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' }],
    tags: [{ type: String, maxlength: 40 }],
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: true }
);

collabTeamSchema.index({ 'members.user': 1, status: 1 });
collabTeamSchema.index({ name: 'text', description: 'text', tags: 'text' });
collabTeamSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('CollabTeam', collabTeamSchema);
