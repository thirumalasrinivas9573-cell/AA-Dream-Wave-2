const Organization = require('../models/Organization');
const OrgMembership = require('../models/OrgMembership');
const OrgInvite = require('../models/OrgInvite');
const { AppError } = require('../middleware/errorHandler');

const ORG_ROLES = OrgMembership.ORG_ROLES;
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

async function attachMembership(user, orgId, role, extras = {}) {
  const existing = await OrgMembership.findOne({ org: orgId, user: user._id });
  if (existing) return existing;

  const membership = await OrgMembership.create({
    org: orgId,
    user: user._id,
    role: role === ORG_ROLES.ADMIN ? ORG_ROLES.ADMIN : ORG_ROLES.MEMBER,
    memberKind: extras.memberKind || undefined,
    title: extras.title || '',
    department: extras.department || null,
    branch: extras.branch || null,
  });
  user.organizationId = orgId;
  await user.save({ validateBeforeSave: false });
  return membership;
}

/**
 * Accept a pending invite for a newly signed-up (or matching) user.
 * Prefer explicit token; otherwise match latest pending invite by email.
 */
async function acceptPendingInvite(user, inviteToken) {
  if (user.organizationId) return null;

  const email = String(user.email || '')
    .toLowerCase()
    .trim();
  let invite = null;

  if (inviteToken) {
    invite = await OrgInvite.findOne({
      tokenHash: OrgInvite.hashToken(inviteToken),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (!invite) throw new AppError('Invite is invalid or expired', 400);
    if (invite.email !== email) {
      throw new AppError('Invite email does not match signup email', 400);
    }
  } else {
    invite = await OrgInvite.findOne({
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  if (!invite) return null;

  const org = await Organization.findById(invite.org);
  if (!org) {
    invite.status = 'revoked';
    await invite.save();
    return null;
  }

  const membership = await attachMembership(user, invite.org, invite.role, {
    memberKind: invite.memberKind,
  });
  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  await invite.save();

  await OrgInvite.updateMany(
    { email, status: 'pending', _id: { $ne: invite._id } },
    { $set: { status: 'revoked' } }
  );

  return { invite, membership, organization: org };
}

function clientBaseUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0];
}

function inviteSignupUrl(token) {
  return `${clientBaseUrl()}/signup?invite=${encodeURIComponent(token)}`;
}

module.exports = {
  INVITE_TTL_MS,
  attachMembership,
  acceptPendingInvite,
  inviteSignupUrl,
  clientBaseUrl,
};
