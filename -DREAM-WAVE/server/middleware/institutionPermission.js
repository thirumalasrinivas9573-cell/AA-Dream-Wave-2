const InstitutionMember = require('../models/InstitutionMember')
const { roleHasPermission } = require('../constants/institutionPermissions')

async function ensureInstitutionMember(user, institution) {
  if (!user || !institution) return null

  let member = await InstitutionMember.findOne({
    institutionId: institution._id,
    userId: user._id,
  })

  if (!member) {
    const isOwner = institution.ownerUserId?.toString() === user._id.toString()
    member = await InstitutionMember.create({
      institutionId: institution._id,
      userId: user._id,
      role: isOwner ? 'OWNER' : 'VIEWER',
    })
  } else if (
    institution.ownerUserId?.toString() === user._id.toString() &&
    member.role !== 'OWNER'
  ) {
    member.role = 'OWNER'
    await member.save()
  }

  return member
}

async function resolveInstitutionMember(req, res, next) {
  try {
    if (!req.user || !req.institution) return next()

    req.institutionMember = await ensureInstitutionMember(req.user, req.institution)
    next()
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Member resolution failed' })
  }
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    const role = req.institutionMember?.role
    if (!role) {
      return res.status(403).json({ success: false, message: 'Institution membership required' })
    }
    const allowed = permissions.some((p) => roleHasPermission(role, p))
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }
    next()
  }
}

module.exports = {
  ensureInstitutionMember,
  resolveInstitutionMember,
  requirePermission,
}
