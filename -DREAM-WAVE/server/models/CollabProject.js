const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'lead', 'contributor', 'viewer'], default: 'contributor' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    dueDate: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, maxlength: 80 },
    detail: { type: String, default: '', maxlength: 500 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 240 },
    url: { type: String, required: true, maxlength: 500 },
    mimeType: { type: String, default: '', maxlength: 120 },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const collabProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 8000 },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'CollabTeam', default: null, index: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
    members: { type: [projectMemberSchema], default: [] },
    milestones: { type: [milestoneSchema], default: [] },
    activity: { type: [activitySchema], default: [] },
    files: { type: [fileSchema], default: [] },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'archived'],
      default: 'planning',
      index: true,
    },
    tags: [{ type: String, maxlength: 40 }],
  },
  { timestamps: true }
);

collabProjectSchema.index({ 'members.user': 1, status: 1 });
collabProjectSchema.index({ title: 'text', description: 'text', tags: 'text' });
collabProjectSchema.index({ organizationId: 1, updatedAt: -1 });

module.exports = mongoose.model('CollabProject', collabProjectSchema);
