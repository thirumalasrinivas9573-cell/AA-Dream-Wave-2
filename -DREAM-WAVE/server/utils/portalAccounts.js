/**
 * Multi-portal account helpers.
 * One email may own separate User rows for student / institution / company.
 */
const User = require('../models/User');
const { assertE164 } = require('./phoneOtpGuard');

const PORTAL_ROLES = ['student', 'institution', 'company'];
const AUTH_ROLES = [...PORTAL_ROLES, 'admin'];

const PORTAL_LABEL = {
  student: 'Student',
  institution: 'Institution',
  company: 'Company',
  admin: 'Admin',
};

const PORTAL_SIGNUP_PATH = {
  student: '/student/signup',
  institution: '/institution/signup',
  company: '/company/signup',
};

function isPortal(value) {
  return PORTAL_ROLES.includes(value);
}

function isAuthRole(value) {
  return AUTH_ROLES.includes(value);
}

function portalLabel(portal) {
  return PORTAL_LABEL[portal] || String(portal || 'portal');
}

function articleFor(portal) {
  return portal === 'institution' ? 'an' : 'a';
}

/** "This Institution account already exists." */
function portalAlreadyExistsMessage(portal) {
  return `This ${portalLabel(portal)} account already exists.`;
}

/**
 * "This email is registered as a Student account, not an Institution account."
 */
function wrongPortalLoginMessage(portal, existingRoles = []) {
  const wanted = portalLabel(portal);
  const roles = (existingRoles || []).filter((r) => PORTAL_LABEL[r] && r !== portal);
  if (!roles.length) {
    return `This email is not registered as ${articleFor(portal)} ${wanted} account.`;
  }
  if (roles.length === 1) {
    const r = roles[0];
    return `This email is registered as ${articleFor(r)} ${PORTAL_LABEL[r]} account, not ${articleFor(portal)} ${wanted} account.`;
  }
  const listed = roles.map((r) => PORTAL_LABEL[r]).join(' and ');
  return `This email is registered as ${listed} accounts, not ${articleFor(portal)} ${wanted} account.`;
}

function wrongPortalPayload(portal, existingRoles = []) {
  return {
    success: false,
    message: wrongPortalLoginMessage(portal, existingRoles),
    code: 'WRONG_PORTAL',
    portal,
    existingRoles,
    signupPath: PORTAL_SIGNUP_PATH[portal] || null,
    canCreatePortal: Boolean(PORTAL_SIGNUP_PATH[portal]),
  };
}

async function findByEmailAndPortal(email, portal) {
  if (!email || !isAuthRole(portal)) return null;
  return User.findOne({
    email: String(email).toLowerCase().trim(),
    role: portal,
  });
}

/**
 * Legacy broken signups created rows with missing/null role.
 * Those accounts cannot be found by (email, role) and get stuck on login/403.
 */
async function findOrphanByEmail(email) {
  if (!email) return null;
  return User.findOne({
    email: String(email).toLowerCase().trim(),
    $or: [{ role: null }, { role: { $exists: false } }, { role: '' }],
  });
}

/** Attach a portal role to a legacy orphan account and mark it usable. */
async function claimOrphanAccount(user, portal) {
  if (!user || !isAuthRole(portal)) return null;
  user.role = portal;
  user.emailVerified = true;
  user.emailVerifiedAt = user.emailVerifiedAt || new Date();
  user.registrationComplete = true;
  if (!user.accountStatus || user.accountStatus === 'PENDING_VERIFICATION') {
    user.accountStatus = 'ACTIVE';
  }
  await user.save();
  return user;
}

async function findByPhoneAndPortal(phone, portal) {
  if (!phone || !isAuthRole(portal)) return null;
  return User.findOne({ phone, role: portal });
}

/** All portal accounts sharing an email (any registration state). */
async function listAccountsByEmail(email) {
  if (!email) return [];
  return User.find({ email: String(email).toLowerCase().trim() });
}

async function listRolesForEmail(email) {
  const rows = await listAccountsByEmail(email);
  return [...new Set(rows.map((u) => u.role).filter(Boolean))];
}

/**
 * Resolve login identity for a specific portal only.
 * Does not return accounts from other portals.
 */
async function findUserByIdentifier(identifier, portal) {
  const raw = String(identifier || '').trim();
  if (!raw || !isAuthRole(portal)) return null;

  if (raw.startsWith('+') || /^\d{10,15}$/.test(raw)) {
    try {
      const phone = assertE164(raw.startsWith('+') ? raw : `+${raw}`);
      return findByPhoneAndPortal(phone, portal);
    } catch {
      return null;
    }
  }

  const byPortal = await findByEmailAndPortal(raw, portal);
  if (byPortal) return byPortal;

  // Do not auto-claim here — password must be verified first.
  return findOrphanByEmail(raw);
}

/**
 * Sibling portal roles for an identifier (email or phone), excluding `portal`.
 */
async function findSiblingRoles(identifier, portal) {
  const raw = String(identifier || '').trim();
  if (!raw) return [];

  let query;
  if (raw.startsWith('+') || /^\d{10,15}$/.test(raw)) {
    try {
      const phone = assertE164(raw.startsWith('+') ? raw : `+${raw}`);
      query = { phone };
    } catch {
      return [];
    }
  } else {
    query = { email: raw.toLowerCase() };
  }

  const rows = await User.find(query).select('role registrationComplete');
  return [...new Set(
    rows
      .filter((u) => u.role && u.role !== portal)
      .map((u) => u.role),
  )];
}

module.exports = {
  PORTAL_ROLES,
  AUTH_ROLES,
  PORTAL_LABEL,
  PORTAL_SIGNUP_PATH,
  isPortal,
  isAuthRole,
  portalLabel,
  articleFor,
  portalAlreadyExistsMessage,
  wrongPortalLoginMessage,
  wrongPortalPayload,
  findByEmailAndPortal,
  findByPhoneAndPortal,
  findOrphanByEmail,
  claimOrphanAccount,
  listAccountsByEmail,
  listRolesForEmail,
  findUserByIdentifier,
  findSiblingRoles,
};
