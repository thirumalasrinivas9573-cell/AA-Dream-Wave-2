const OrgMembership = require('../models/OrgMembership');

/**
 * Shared org scoping for student resources (CTO-009–011 + student platform).
 * Covers Goals / Tasks / Chat / Documents / Habits / Skills / StudyPlans / Roadmaps / Quizzes
 * / Reports / Resumes / PlannerEvents.
 */

async function getOrgRole(user) {
  if (!user?.organizationId) return null;
  const membership = await OrgMembership.findOne({
    org: user.organizationId,
    user: user._id,
  })
    .select('role')
    .lean();
  return membership?.role || null;
}

function isOrgAdminRole(role) {
  return role === 'owner' || role === 'admin';
}

/** Fields to merge into Model.create(...) — never trust client organizationId. */
function orgCreateStamp(user) {
  const stamp = { user: user._id };
  if (user.organizationId) stamp.organizationId = user.organizationId;
  return stamp;
}

/** Mongo filter for list endpoints. */
async function orgListFilter(user, extra = {}) {
  if (!user.organizationId) {
    return { ...extra, user: user._id };
  }
  const role = await getOrgRole(user);
  if (isOrgAdminRole(role)) {
    return {
      ...extra,
      $or: [{ user: user._id }, { organizationId: user.organizationId }],
    };
  }
  return { ...extra, user: user._id };
}

/**
 * Load a document by id if the user may access it; otherwise null.
 * Org owners/admins may read member resources in the same organization.
 */
async function findAccessible(Model, user, id) {
  const doc = await Model.findById(id);
  if (!doc) return null;
  if (String(doc.user) === String(user._id)) return doc;
  if (user.role === 'admin') return doc;

  if (
    user.organizationId &&
    doc.organizationId &&
    String(doc.organizationId) === String(user.organizationId)
  ) {
    const role = await getOrgRole(user);
    if (isOrgAdminRole(role)) return doc;
  }
  return null;
}

/**
 * Load a document only when the caller may mutate it (owner or platform admin).
 * Org admins retain read via findAccessible but cannot rewrite member data.
 */
async function findMutable(Model, user, id) {
  const doc = await Model.findById(id);
  if (!doc) return null;
  if (String(doc.user) === String(user._id)) return doc;
  if (user.role === 'admin') return doc;
  return null;
}

module.exports = {
  getOrgRole,
  isOrgAdminRole,
  orgCreateStamp,
  orgListFilter,
  findAccessible,
  findMutable,
};
