const OrgMembership = require('../models/OrgMembership');
const Organization = require('../models/Organization');
const { AppError } = require('./errorHandler');
const asyncHandler = require('../utils/asyncHandler');
const { MEMBER_KINDS, ORG_TYPES } = require('../config/constants');

const ORG_ROLES = OrgMembership.ORG_ROLES;

/**
 * Requires protect first. Loads membership for :id org param into req.orgMembership.
 */
function requireOrgRoles(...roles) {
  const allowed = roles.length ? roles : Object.values(ORG_ROLES);
  return asyncHandler(async (req, _res, next) => {
    const orgId = req.params.id;
    if (!orgId) throw new AppError('Organization id required', 400);

    const membership = await OrgMembership.findOne({ org: orgId, user: req.user._id });
    if (!membership) throw new AppError('Forbidden. Not a member of this organization.', 403);
    if (!allowed.includes(membership.role)) {
      throw new AppError('Forbidden. Insufficient organization role.', 403);
    }

    req.orgMembership = membership;
    next();
  });
}

/** Any org member (owner/admin/member). */
function requireOrgMember() {
  return requireOrgRoles(ORG_ROLES.OWNER, ORG_ROLES.ADMIN, ORG_ROLES.MEMBER);
}

/** Owner/admin or teacher memberKind — for attendance marking. */
function requireOrgAdminOrTeacher() {
  return asyncHandler(async (req, _res, next) => {
    const orgId = req.params.id;
    if (!orgId) throw new AppError('Organization id required', 400);

    const membership = await OrgMembership.findOne({ org: orgId, user: req.user._id });
    if (!membership) throw new AppError('Forbidden. Not a member of this organization.', 403);

    const isAdmin =
      membership.role === ORG_ROLES.OWNER || membership.role === ORG_ROLES.ADMIN;
    const isTeacher = membership.memberKind === MEMBER_KINDS.TEACHER;
    if (!isAdmin && !isTeacher) {
      throw new AppError('Forbidden. Teachers or admins only.', 403);
    }

    req.orgMembership = membership;
    next();
  });
}

/** Ensures org exists, is company type, and caller is a member with allowed roles. */
function requireCompanyOrg(...roles) {
  const allowed = roles.length ? roles : [ORG_ROLES.OWNER, ORG_ROLES.ADMIN, ORG_ROLES.MEMBER];
  return asyncHandler(async (req, _res, next) => {
    const orgId = req.params.id;
    if (!orgId) throw new AppError('Organization id required', 400);

    const org = await Organization.findById(orgId);
    if (!org) throw new AppError('Organization not found', 404);
    if (org.type !== ORG_TYPES.COMPANY) {
      throw new AppError('This endpoint requires a company organization', 400);
    }

    const membership = await OrgMembership.findOne({ org: orgId, user: req.user._id });
    if (!membership) throw new AppError('Forbidden. Not a member of this organization.', 403);
    if (!allowed.includes(membership.role)) {
      throw new AppError('Forbidden. Insufficient organization role.', 403);
    }

    req.organization = org;
    req.orgMembership = membership;
    next();
  });
}

/** Company owner/admin or recruiter memberKind. */
function requireCompanyRecruiter() {
  return asyncHandler(async (req, _res, next) => {
    const orgId = req.params.id;
    if (!orgId) throw new AppError('Organization id required', 400);

    const org = await Organization.findById(orgId);
    if (!org) throw new AppError('Organization not found', 404);
    if (org.type !== ORG_TYPES.COMPANY) {
      throw new AppError('This endpoint requires a company organization', 400);
    }

    const membership = await OrgMembership.findOne({ org: orgId, user: req.user._id });
    if (!membership) throw new AppError('Forbidden. Not a member of this organization.', 403);

    const isAdmin =
      membership.role === ORG_ROLES.OWNER || membership.role === ORG_ROLES.ADMIN;
    const isRecruiter = membership.memberKind === MEMBER_KINDS.RECRUITER;
    if (!isAdmin && !isRecruiter) {
      throw new AppError('Forbidden. Recruiters or admins only.', 403);
    }

    req.organization = org;
    req.orgMembership = membership;
    next();
  });
}

module.exports = {
  requireOrgRoles,
  requireOrgMember,
  requireOrgAdminOrTeacher,
  requireCompanyOrg,
  requireCompanyRecruiter,
  ORG_ROLES,
};
