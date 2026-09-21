const mongoose = require('mongoose');
const { MEMBER_KINDS } = require('../config/constants');

const ORG_ROLES = { OWNER: 'owner', ADMIN: 'admin', MEMBER: 'member' };

const orgMembershipSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: Object.values(ORG_ROLES),
      default: ORG_ROLES.MEMBER,
    },
    memberKind: {
      type: String,
      enum: Object.values(MEMBER_KINDS),
      default: MEMBER_KINDS.STAFF,
      index: true,
    },
    title: { type: String, default: '', maxlength: 120 },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

orgMembershipSchema.index({ org: 1, user: 1 }, { unique: true });
orgMembershipSchema.index({ org: 1, memberKind: 1 });
orgMembershipSchema.index({ org: 1, role: 1 });

module.exports = mongoose.model('OrgMembership', orgMembershipSchema);
module.exports.ORG_ROLES = ORG_ROLES;
