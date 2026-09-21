/** Privacy helpers for institution-visible student data */

function isCertificateVisible(cert) {
  if (!cert) return false
  if (cert.visibility === 'private') return false
  if (cert.isInstitutionIssued) return true
  if (['INSTITUTION_VERIFIED', 'INSTITUTION_ISSUED', 'EXTERNALLY_VERIFIED'].includes(cert.verificationStatus)) {
    return true
  }
  if (['shared', 'public', 'institution'].includes(cert.visibility)) return true
  return false
}

function isDocumentVisible(doc) {
  if (!doc || doc.visibility === 'private') return false
  return ['shared', 'institution'].includes(doc.visibility)
}

function serializeVisibleCertificate(c, i) {
  return {
    id: `cert-${i}`,
    title: c.title,
    category: c.category,
    issuer: c.issuer || c.issuingOrganization,
    issuingOrganization: c.issuingOrganization || c.issuer,
    issuedAt: c.issuedAt || c.issueDate,
    issueDate: c.issueDate || c.issuedAt,
    expiryDate: c.expiryDate || '',
    credentialId: c.credentialId || '',
    verificationStatus: c.verificationStatus || 'SELF_UPLOADED',
    skillsCovered: c.skillsCovered || [],
    certificateUrl: c.certificateUrl || '',
    visibility: c.visibility,
    isInstitutionIssued: c.isInstitutionIssued ?? false,
  }
}

function serializeAchievement(a, i) {
  if (typeof a === 'string') {
    return { id: `ach-${i}`, title: a, type: 'other', verificationStatus: 'pending' }
  }
  return {
    id: `ach-${i}`,
    title: a.title,
    type: a.type || 'other',
    description: a.description || '',
    date: a.date || '',
    verificationStatus: a.verificationStatus || 'pending',
    verifiedAt: a.verifiedAt,
  }
}

function isProjectVisible(project) {
  if (!project) return false
  return project.visibility !== 'private'
}

function isAchievementVisible(achievement) {
  if (!achievement) return false
  if (typeof achievement === 'string') return true
  return achievement.visibility !== 'private'
}

module.exports = {
  isCertificateVisible,
  isDocumentVisible,
  isProjectVisible,
  isAchievementVisible,
  serializeVisibleCertificate,
  serializeAchievement,
}
