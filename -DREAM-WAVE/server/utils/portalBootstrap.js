const Institution = require('../models/Institution');
const CompanyProfile = require('../models/CompanyProfile');
const { ensureUniqueSlug } = require('./portalHelpers');

async function bootstrapPortalProfile(user) {
  if (!user?.role) return null;
  if (user.role === 'institution') {
    const existing = await Institution.findOne({
      $or: [{ ownerId: user._id }, { ownerUserId: user._id }],
    });
    if (existing) {
      // Keep dual ownership fields aligned for all institution APIs.
      let dirty = false;
      if (!existing.ownerId) { existing.ownerId = user._id; dirty = true; }
      if (!existing.ownerUserId) { existing.ownerUserId = user._id; dirty = true; }
      if (dirty) await existing.save();
      return existing;
    }
    const name = user.organizationName || `${user.name}'s Institution`;
    return Institution.create({
      ownerId: user._id,
      ownerUserId: user._id,
      name,
      slug: await ensureUniqueSlug(Institution, name),
      contact: { email: user.email },
      email: user.email,
      // Institutional authority must be reviewed — email ownership ≠ verified institution admin.
      status: 'pending',
      verified: false,
    });
  }
  if (user.role === 'company') {
    const existing = await CompanyProfile.findOne({ ownerId: user._id });
    if (existing) return existing;
    const name = user.organizationName || `${user.name}'s Company`;
    return CompanyProfile.create({
      ownerId: user._id,
      name,
      slug: await ensureUniqueSlug(CompanyProfile, name),
      contact: { email: user.email },
      status: 'pending',
    });
  }
  return null;
}

module.exports = { bootstrapPortalProfile };
