const MediaItem = require('../models/MediaItem');
const Organization = require('../models/Organization');
const OrgMembership = require('../models/OrgMembership');
const { AppError } = require('../middleware/errorHandler');
const { ORG_TYPES } = require('../config/constants');
const { filenameFromUrl } = require('../utils/assetUrl');

async function accessibleMediaFilter(user, extra = {}) {
  const clauses = [
    { scope: 'public', status: 'published' },
    { scope: 'personal', uploadedBy: user._id },
  ];
  if (user.organizationId) {
    const org = await Organization.findById(user.organizationId).select('type').lean();
    if (org?.type === ORG_TYPES.INSTITUTION) {
      clauses.push({
        scope: 'institution',
        organizationId: user.organizationId,
        $or: [{ status: 'published' }, { uploadedBy: user._id }],
      });
    } else if (org?.type === ORG_TYPES.COMPANY) {
      clauses.push({
        scope: 'company',
        organizationId: user.organizationId,
        $or: [{ status: 'published' }, { uploadedBy: user._id }],
      });
    } else {
      clauses.push({ organizationId: user.organizationId, status: 'published' });
    }
  }
  if (user.role === 'admin') {
    return { $and: [extra] };
  }
  return { $and: [{ $or: clauses }, extra] };
}

async function assertCanAccessMedia(user, media) {
  if (!media) throw new AppError('Media not found', 404);
  if (user.role === 'admin') return true;
  if (media.scope === 'public' && media.status === 'published') return true;
  if (media.scope === 'public' && String(media.uploadedBy) === String(user._id)) return true;
  if (media.scope === 'personal' && String(media.uploadedBy) === String(user._id)) return true;
  if (
    media.organizationId &&
    user.organizationId &&
    String(media.organizationId) === String(user.organizationId)
  ) {
    if (media.status === 'published' || String(media.uploadedBy) === String(user._id)) return true;
    const membership = await OrgMembership.findOne({
      org: user.organizationId,
      user: user._id,
    })
      .select('role')
      .lean();
    if (membership && ['owner', 'admin'].includes(membership.role)) return true;
  }
  throw new AppError('Media not found', 404);
}

async function assertCanManageMedia(user, media) {
  await assertCanAccessMedia(user, media);
  if (user.role === 'admin') return true;
  if (String(media.uploadedBy) === String(user._id)) return true;
  if (
    media.organizationId &&
    user.organizationId &&
    String(media.organizationId) === String(user.organizationId)
  ) {
    const membership = await OrgMembership.findOne({
      org: user.organizationId,
      user: user._id,
    })
      .select('role')
      .lean();
    if (membership && ['owner', 'admin'].includes(membership.role)) return true;
  }
  throw new AppError('Forbidden', 403);
}

function resolveScopeForUser(user, requested) {
  const scope = requested || (user.organizationId ? 'institution' : 'personal');
  if (scope === 'public' && user.role !== 'admin') {
    return user.organizationId ? 'institution' : 'personal';
  }
  if ((scope === 'institution' || scope === 'company') && !user.organizationId) {
    return 'personal';
  }
  return scope;
}

async function findMediaByFilename(filename) {
  const urls = [`/api/assets/${filename}`, `/uploads/${filename}`];
  return MediaItem.findOne({
    $or: [{ fileUrl: { $in: urls } }, { thumbnailUrl: { $in: urls } }],
  });
}

function mediaFilename(media) {
  return filenameFromUrl(media?.fileUrl);
}

module.exports = {
  accessibleMediaFilter,
  assertCanAccessMedia,
  assertCanManageMedia,
  resolveScopeForUser,
  findMediaByFilename,
  mediaFilename,
};
