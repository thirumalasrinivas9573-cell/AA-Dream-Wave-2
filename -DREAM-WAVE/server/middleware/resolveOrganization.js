const Institution = require('../models/Institution')
const Company = require('../models/Company')
const InstitutionMember = require('../models/InstitutionMember')

async function ensureInstitutionProfile(user) {
  let institution = await Institution.findOne({
    $or: [{ ownerUserId: user._id }, { ownerId: user._id }],
  })
  if (!institution) {
    institution = await Institution.create({
      ownerId: user._id,
      ownerUserId: user._id,
      name: user.organizationName?.trim() || user.name || 'Institution',
      email: user.email,
      contact: { email: user.email },
      status: 'pending',
      verified: false,
    })
  } else {
    let dirty = false
    if (!institution.ownerId) { institution.ownerId = user._id; dirty = true }
    if (!institution.ownerUserId) { institution.ownerUserId = user._id; dirty = true }
    if (dirty) await institution.save()
  }
  return institution
}

async function ensureCompanyProfile(user) {
  let company = await Company.findOne({ ownerUserId: user._id })
  if (!company) {
    company = await Company.create({
      ownerUserId: user._id,
      name: user.organizationName?.trim() || user.name || 'Company',
      email: user.email,
    })
  }
  return company
}

async function resolveInstitutionForUser(user) {
  const owned = await Institution.findOne({
    $or: [{ ownerUserId: user._id }, { ownerId: user._id }],
  })
  if (owned) return owned

  // Prefer OWNER/ADMIN memberships when a user belongs to multiple institutions.
  const membership = await InstitutionMember.findOne({
    userId: user._id,
    active: { $ne: false },
  }).sort({ role: 1, updatedAt: -1 })
  if (membership) {
    const institution = await Institution.findById(membership.institutionId)
    if (institution) return institution
  }

  return ensureInstitutionProfile(user)
}

async function resolveCompanyForUser(user) {
  const owned = await Company.findOne({ ownerUserId: user._id })
  if (owned) return owned

  const memberCompany = await Company.findOne({
    'recruiterTeam.userId': user._id,
  })
  if (memberCompany) return memberCompany

  return ensureCompanyProfile(user)
}

/**
 * Resolves organization from authenticated session — never trust client-supplied org IDs.
 */
async function resolveOrganization(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    if (req.user.role === 'institution') {
      req.institution = await resolveInstitutionForUser(req.user)
    } else if (req.user.role === 'company') {
      req.company = await resolveCompanyForUser(req.user)
    }

    next()
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Organization resolution failed' })
  }
}

module.exports = {
  resolveOrganization,
  ensureInstitutionProfile,
  ensureCompanyProfile,
  resolveInstitutionForUser,
  resolveCompanyForUser,
}
