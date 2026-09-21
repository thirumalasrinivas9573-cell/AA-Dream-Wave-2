const Company = require('../models/Company')
const { hasPermission, permissionsForRole } = require('../constants/companyPermissions')

async function resolveCompanyMember(req, res, next) {
  try {
    if (!req.company?._id || !req.user?._id) {
      return res.status(403).json({ success: false, message: 'Company context required' })
    }

    const company = await Company.findById(req.company._id).select('ownerUserId recruiterTeam')
    if (!company) {
      return res.status(403).json({ success: false, message: 'Company not found' })
    }

    const isOwner = company.ownerUserId.toString() === req.user._id.toString()
    const member = (company.recruiterTeam || []).find(
      (m) => m.userId && m.userId.toString() === req.user._id.toString(),
    )

    if (!isOwner && !member) {
      return res.status(403).json({ success: false, message: 'Company membership required' })
    }

    const role = isOwner ? 'recruitment_admin' : member.role
    req.companyMember = {
      role,
      permissions: permissionsForRole(role),
      isOwner,
    }
    next()
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Company member resolution failed' })
  }
}

function requireCompanyPermission(permission) {
  return (req, res, next) => {
    if (!req.companyMember) {
      return res.status(403).json({ success: false, message: 'Company membership required' })
    }
    if (req.companyMember.isOwner || hasPermission(req.companyMember.role, permission)) {
      return next()
    }
    return res.status(403).json({ success: false, message: 'Insufficient permissions' })
  }
}

module.exports = {
  resolveCompanyMember,
  requireCompanyPermission,
}
