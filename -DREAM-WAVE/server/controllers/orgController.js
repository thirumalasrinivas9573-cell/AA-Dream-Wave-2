const Organization = require('../models/Organization');
const OrgMembership = require('../models/OrgMembership');
const OrgInvite = require('../models/OrgInvite');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { PLANS, ORG_TYPES, INSTITUTION_KINDS, MEMBER_KINDS, COMPANY_SIZES } = require('../config/constants');
const { sendEmail } = require('../utils/sendEmail');
const {
  INVITE_TTL_MS,
  attachMembership,
  inviteSignupUrl,
} = require('../services/orgInviteService');
const analyticsService = require('../services/analyticsService');
const { auditFromRequest } = require('../utils/audit');

const ORG_ROLES = OrgMembership.ORG_ROLES;

function slugify(name) {
  const base = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || `org-${Date.now().toString(36)}`;
}

async function uniqueSlug(name) {
  let slug = slugify(name);
  let n = 0;
  while (await Organization.exists({ slug: n ? `${slug}-${n}` : slug })) {
    n += 1;
    if (n > 50) throw new AppError('Could not allocate organization slug', 500);
  }
  return n ? `${slug}-${n}` : slug;
}

function publicOrg(org) {
  return {
    id: org._id,
    name: org.name,
    slug: org.slug,
    type: org.type || 'institution',
    institutionKind: org.institutionKind || INSTITUTION_KINDS.SCHOOL,
    plan: org.plan,
    owner: org.owner,
    profile: org.profile || {},
    company: org.company || {},
    settings: org.settings || {},
    createdAt: org.createdAt,
  };
}

function publicInvite(invite) {
  return {
    id: invite._id,
    email: invite.email,
    role: invite.role,
    memberKind: invite.memberKind || MEMBER_KINDS.STAFF,
    status: invite.status,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

exports.create = asyncHandler(async (req, res) => {
  if (req.user.organizationId) {
    throw new AppError('You already belong to an organization', 400);
  }

  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 120) {
    throw new AppError('Organization name must be 2–120 characters', 400);
  }

  const rawType = String(req.body.type || ORG_TYPES.INSTITUTION).toLowerCase();
  const type = Object.values(ORG_TYPES).includes(rawType) ? rawType : ORG_TYPES.INSTITUTION;

  const rawKind = String(req.body.institutionKind || INSTITUTION_KINDS.SCHOOL).toLowerCase();
  const institutionKind = Object.values(INSTITUTION_KINDS).includes(rawKind)
    ? rawKind
    : INSTITUTION_KINDS.SCHOOL;

  const slug = await uniqueSlug(name);
  const orgData = {
    name,
    slug,
    type,
    institutionKind,
    plan: PLANS.FREE,
    owner: req.user._id,
  };
  if (type === ORG_TYPES.COMPANY && req.body.company && typeof req.body.company === 'object') {
    orgData.company = {
      industry: String(req.body.company.industry || '').slice(0, 120),
      size: COMPANY_SIZES.includes(req.body.company.size) ? req.body.company.size : '',
      locations: Array.isArray(req.body.company.locations)
        ? req.body.company.locations.slice(0, 10)
        : [],
    };
  }
  if (type === ORG_TYPES.COMPANY && req.body.profile && typeof req.body.profile === 'object') {
    orgData.profile = {
      description: String(req.body.profile.description || '').slice(0, 2000),
      website: String(req.body.profile.website || '').slice(0, 200),
      phone: String(req.body.profile.phone || '').slice(0, 40),
      email: String(req.body.profile.email || '').slice(0, 120),
      address: String(req.body.profile.address || '').slice(0, 300),
      city: String(req.body.profile.city || '').slice(0, 80),
      state: String(req.body.profile.state || '').slice(0, 80),
      country: String(req.body.profile.country || '').slice(0, 80),
    };
  }
  const org = await Organization.create(orgData);

  await OrgMembership.create({
    org: org._id,
    user: req.user._id,
    role: ORG_ROLES.OWNER,
    memberKind: MEMBER_KINDS.STAFF,
  });

  req.user.organizationId = org._id;
  await req.user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    data: {
      organization: publicOrg(org),
      membership: { role: ORG_ROLES.OWNER },
    },
  });
});

exports.me = asyncHandler(async (req, res) => {
  if (!req.user.organizationId) {
    return res.json({ success: true, data: { organization: null, membership: null } });
  }

  const org = await Organization.findById(req.user.organizationId);
  if (!org) {
    return res.json({ success: true, data: { organization: null, membership: null } });
  }

  const membership = await OrgMembership.findOne({ org: org._id, user: req.user._id });
  res.json({
    success: true,
    data: {
      organization: publicOrg(org),
      membership: membership
        ? { role: membership.role, memberKind: membership.memberKind || MEMBER_KINDS.STAFF }
        : null,
    },
  });
});

/** Institution overview (CTO-014) — owner/admin only via route middleware. */
exports.overview = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) throw new AppError('Organization not found', 404);

  const data = await analyticsService.getOrgOverview(org._id);
  res.json({
    success: true,
    data: {
      ...data,
      viewerRole: req.orgMembership?.role || null,
    },
  });
});

exports.listMembers = asyncHandler(async (req, res) => {
  const filter = { org: req.params.id };
  if (req.query.memberKind) filter.memberKind = req.query.memberKind;
  if (req.query.role) filter.role = req.query.role;
  const members = await OrgMembership.find(filter)
    .populate('user', 'name email aaid plan role')
    .populate('department', 'name code')
    .populate('branch', 'name code')
    .sort({ createdAt: 1 })
    .limit(500);

  res.json({
    success: true,
    data: {
      members: members.map((m) => ({
        id: m._id,
        role: m.role,
        memberKind: m.memberKind || MEMBER_KINDS.STAFF,
        title: m.title || '',
        department: m.department,
        branch: m.branch,
        user: m.user
          ? {
              id: m.user._id,
              name: m.user.name,
              email: m.user.email,
              aaid: m.user.aaid,
              plan: m.user.plan,
            }
          : null,
        createdAt: m.createdAt,
      })),
    },
  });
});

exports.listInvites = asyncHandler(async (req, res) => {
  const invites = await OrgInvite.find({
    org: req.params.id,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({
    success: true,
    data: { invites: invites.map(publicInvite) },
  });
});

exports.revokeInvite = asyncHandler(async (req, res) => {
  const invite = await OrgInvite.findOne({
    _id: req.params.inviteId,
    org: req.params.id,
    status: 'pending',
  });
  if (!invite) throw new AppError('Invite not found', 404);
  invite.status = 'revoked';
  await invite.save();
  res.json({ success: true, message: 'Invite revoked' });
});

exports.previewInvite = asyncHandler(async (req, res) => {
  const invite = await OrgInvite.findOne({
    tokenHash: OrgInvite.hashToken(req.params.token),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });
  if (!invite) throw new AppError('Invite is invalid or expired', 404);

  const org = await Organization.findById(invite.org).select('name slug');
  if (!org) throw new AppError('Invite is invalid or expired', 404);

  res.json({
    success: true,
    data: {
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      organization: { id: org._id, name: org.name, slug: org.slug },
    },
  });
});

exports.addMember = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '')
    .toLowerCase()
    .trim();
  if (!email) throw new AppError('Email is required', 400);

  const role = req.body.role === ORG_ROLES.ADMIN ? ORG_ROLES.ADMIN : ORG_ROLES.MEMBER;
  if (role === ORG_ROLES.OWNER) throw new AppError('Cannot assign owner via invite', 400);

  const rawKind = String(req.body.memberKind || MEMBER_KINDS.STAFF).toLowerCase();
  const memberKind = Object.values(MEMBER_KINDS).includes(rawKind) ? rawKind : MEMBER_KINDS.STAFF;

  const org = await Organization.findById(req.params.id);
  if (!org) throw new AppError('Organization not found', 404);

  const target = await User.findOne({ email });
  if (target) {
    if (target.organizationId && String(target.organizationId) !== String(req.params.id)) {
      throw new AppError('User already belongs to another organization', 400);
    }

    const existing = await OrgMembership.findOne({ org: req.params.id, user: target._id });
    if (existing) throw new AppError('User is already a member', 400);

    const membership = await attachMembership(target, req.params.id, role, { memberKind });

    await OrgInvite.updateMany(
      { org: req.params.id, email, status: 'pending' },
      { $set: { status: 'revoked' } }
    );

    return res.status(201).json({
      success: true,
      data: {
        status: 'joined',
        membership: {
          id: membership._id,
          role: membership.role,
          memberKind: membership.memberKind,
          user: { id: target._id, name: target.name, email: target.email },
        },
      },
    });
  }

  const existingInvite = await OrgInvite.findOne({
    org: req.params.id,
    email,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });
  if (existingInvite) {
    throw new AppError('A pending invite already exists for this email', 400);
  }

  const rawToken = OrgInvite.createToken();
  const invite = await OrgInvite.create({
    org: req.params.id,
    email,
    role,
    memberKind,
    tokenHash: OrgInvite.hashToken(rawToken),
    invitedBy: req.user._id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const signupUrl = inviteSignupUrl(rawToken);
  await sendEmail({
    to: email,
    subject: `You're invited to ${org.name} on Dream Wave`,
    text: `Join ${org.name} on Dream Wave AI: ${signupUrl}`,
    html: `<p>You've been invited to join <strong>${org.name}</strong> on Dream Wave AI.</p>
           <p><a href="${signupUrl}">Create your account</a> to accept (link expires in 14 days).</p>`,
  });

  res.status(201).json({
    success: true,
    data: {
      status: 'pending_invite',
      invite: publicInvite(invite),
    },
  });
});

/** Change member role (admin ↔ member). Cannot assign owner. */
exports.updateMemberRole = asyncHandler(async (req, res) => {
  const role = req.body.role === ORG_ROLES.ADMIN ? ORG_ROLES.ADMIN : ORG_ROLES.MEMBER;
  const membership = await OrgMembership.findOne({
    _id: req.params.membershipId,
    org: req.params.id,
  }).populate('user', 'name email');
  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.role === ORG_ROLES.OWNER) {
    throw new AppError('Cannot change the owner role via this endpoint', 400);
  }

  membership.role = role;
  await membership.save();

  await auditFromRequest(req, {
    action: 'org.member_role_changed',
    resource: 'OrgMembership',
    resourceId: membership._id,
    meta: { orgId: req.params.id, role },
  });

  res.json({
    success: true,
    data: {
      membership: {
        id: membership._id,
        role: membership.role,
        user: membership.user
          ? {
              id: membership.user._id,
              name: membership.user.name,
              email: membership.user.email,
            }
          : null,
      },
    },
  });
});

/** Remove member from org. Cannot remove the owner. */
exports.removeMember = asyncHandler(async (req, res) => {
  const membership = await OrgMembership.findOne({
    _id: req.params.membershipId,
    org: req.params.id,
  });
  if (!membership) throw new AppError('Membership not found', 404);
  if (membership.role === ORG_ROLES.OWNER) {
    throw new AppError('Cannot remove the organization owner', 400);
  }

  const targetUser = await User.findById(membership.user);
  await OrgMembership.deleteOne({ _id: membership._id });

  if (targetUser && String(targetUser.organizationId) === String(req.params.id)) {
    targetUser.organizationId = null;
    await targetUser.save({ validateBeforeSave: false });
  }

  await auditFromRequest(req, {
    action: 'org.member_removed',
    resource: 'OrgMembership',
    resourceId: membership._id,
    meta: { orgId: req.params.id, userId: membership.user },
  });

  res.json({ success: true, message: 'Member removed' });
});
