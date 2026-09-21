const crypto = require('crypto');
const mongoose = require('mongoose');
const OrgMembership = require('./OrgMembership');
const { MEMBER_KINDS } = require('../config/constants');

const ORG_ROLES = OrgMembership.ORG_ROLES;
const INVITE_STATUSES = ['pending', 'accepted', 'revoked', 'expired'];

const orgInviteSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: {
      type: String,
      enum: [ORG_ROLES.ADMIN, ORG_ROLES.MEMBER],
      default: ORG_ROLES.MEMBER,
    },
    memberKind: {
      type: String,
      enum: Object.values(MEMBER_KINDS),
      default: MEMBER_KINDS.STAFF,
    },
    tokenHash: { type: String, required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: INVITE_STATUSES, default: 'pending', index: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date,
  },
  { timestamps: true }
);

orgInviteSchema.index({ tokenHash: 1 }, { unique: true });
orgInviteSchema.index(
  { org: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
orgInviteSchema.index({ status: 1, expiresAt: 1 });

orgInviteSchema.statics.hashToken = function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

orgInviteSchema.statics.createToken = function createToken() {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('OrgInvite', orgInviteSchema);
module.exports.INVITE_STATUSES = INVITE_STATUSES;
