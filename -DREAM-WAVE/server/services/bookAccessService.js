const Organization = require('../models/Organization');
const { ORG_TYPES } = require('../config/constants');

async function accessibleBookFilter(user, extra = {}) {
  const clauses = [{ scope: 'public' }, { scope: 'personal', uploadedBy: user._id }];
  if (user.organizationId) {
    const org = await Organization.findById(user.organizationId).select('type').lean();
    if (org?.type === ORG_TYPES.INSTITUTION) {
      clauses.push({ scope: 'institution', organizationId: user.organizationId });
    } else if (org?.type === ORG_TYPES.COMPANY) {
      clauses.push({ scope: 'company', organizationId: user.organizationId });
    } else {
      clauses.push({ organizationId: user.organizationId });
    }
  }
  return { $and: [{ $or: clauses }, extra] };
}

module.exports = { accessibleBookFilter };
