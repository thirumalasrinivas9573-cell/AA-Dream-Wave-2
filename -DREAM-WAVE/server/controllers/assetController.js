const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Post = require('../models/Post');
const Chat = require('../models/Chat');
const User = require('../models/User');
const MediaItem = require('../models/MediaItem');
const { Book } = require('../models/Book');
const CollabMessage = require('../models/CollabMessage');
const CollabConversation = require('../models/CollabConversation');
const CollabProject = require('../models/CollabProject');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { filenameFromUrl } = require('../utils/assetUrl');
const { getOrgRole, isOrgAdminRole } = require('../utils/orgScope');
const mediaAccess = require('../services/mediaAccessService');

const UPLOAD_DIR = path.resolve(path.join(__dirname, '..', 'uploads'));

function safeFilename(raw) {
  const name = path.basename(String(raw || ''));
  if (!name || name === '.' || name === '..' || name.includes('..')) return null;
  return name;
}

async function canAccessOrgTagged(user, Model, urlMatch) {
  if (!user.organizationId) return false;
  const role = await getOrgRole(user);
  if (!isOrgAdminRole(role)) return false;
  const hit = await Model.findOne({
    organizationId: user.organizationId,
    ...urlMatch,
  })
    .select('_id')
    .lean();
  return Boolean(hit);
}

async function canAccessBookAsset(user, filename) {
  const urls = [`/api/assets/${filename}`, `/uploads/${filename}`];
  const book = await Book.findOne({
    $or: [{ fileUrl: { $in: urls } }, { coverUrl: { $in: urls } }],
  })
    .select('scope organizationId uploadedBy')
    .lean();
  if (!book) return false;
  if (book.scope === 'public') return true;
  if (book.scope === 'personal' && String(book.uploadedBy) === String(user._id)) return true;
  if (
    user.organizationId &&
    book.organizationId &&
    String(book.organizationId) === String(user.organizationId) &&
    ['institution', 'company'].includes(book.scope)
  ) {
    return true;
  }
  if (String(book.uploadedBy) === String(user._id)) return true;
  return false;
}

function canAccessCommunityPost(user, post) {
  if (!post) return false;
  if (user.role === 'admin') return true;
  if (String(post.user) === String(user._id)) return true;
  if (!post.organizationId) {
    return !user.organizationId;
  }
  return Boolean(
    user.organizationId && String(post.organizationId) === String(user.organizationId)
  );
}

async function canAccessCollabAttachment(user, filename) {
  const urls = [`/api/assets/${filename}`, `/uploads/${filename}`];
  const msg = await CollabMessage.findOne({
    'attachments.url': { $in: urls },
  })
    .select('conversation organizationId sender')
    .lean();
  if (msg) {
    if (String(msg.sender) === String(user._id)) return true;
    if (
      user.organizationId &&
      msg.organizationId &&
      String(msg.organizationId) === String(user.organizationId)
    ) {
      const conv = await CollabConversation.findById(msg.conversation)
        .select('participants.user')
        .lean();
      if (conv?.participants?.some((p) => String(p.user) === String(user._id))) return true;
    }
  }

  const project = await CollabProject.findOne({
    'files.url': { $in: urls },
  })
    .select('createdBy members.user organizationId')
    .lean();
  if (!project) return false;
  if (String(project.createdBy) === String(user._id)) return true;
  if (project.members?.some((m) => String(m.user) === String(user._id))) return true;
  if (
    user.organizationId &&
    project.organizationId &&
    String(project.organizationId) === String(user.organizationId)
  ) {
    const role = await getOrgRole(user);
    if (isOrgAdminRole(role)) return true;
  }
  return false;
}

async function canAccess(user, filename) {
  if (user.role === 'admin') return true;

  const suffix = filename;
  const ownProfile =
    user.profileImage && filenameFromUrl(user.profileImage) === suffix;
  if (ownProfile) return true;

  if (await canAccessBookAsset(user, suffix)) return true;

  const fileUrls = { $or: [{ fileUrl: `/api/assets/${suffix}` }, { fileUrl: `/uploads/${suffix}` }] };
  const attachmentUrls = {
    'messages.attachments.url': { $in: [`/api/assets/${suffix}`, `/uploads/${suffix}`] },
  };
  const mediaUrls = {
    $or: [
      { fileUrl: { $in: [`/api/assets/${suffix}`, `/uploads/${suffix}`] } },
      { thumbnailUrl: { $in: [`/api/assets/${suffix}`, `/uploads/${suffix}`] } },
    ],
  };

  const doc = await Document.findOne({ user: user._id, ...fileUrls })
    .select('_id')
    .lean();
  if (doc) return true;

  if (await canAccessOrgTagged(user, Document, fileUrls)) return true;

  const chat = await Chat.findOne({ user: user._id, ...attachmentUrls })
    .select('_id')
    .lean();
  if (chat) return true;

  if (await canAccessOrgTagged(user, Chat, attachmentUrls)) return true;

  const media = await MediaItem.findOne(mediaUrls);
  if (media) {
    try {
      await mediaAccess.assertCanAccessMedia(user, media);
      return true;
    } catch {
      /* fall through */
    }
  }

  if (await canAccessCollabAttachment(user, suffix)) return true;

  const sharedPost = await Post.findOne({
    $or: [{ image: `/api/assets/${suffix}` }, { image: `/uploads/${suffix}` }],
  })
    .select('_id user organizationId')
    .lean();
  if (sharedPost && canAccessCommunityPost(user, sharedPost)) return true;

  // Avatars: same-org members only (no global avatar leak).
  if (user.organizationId) {
    const sharedAvatar = await User.findOne({
      organizationId: user.organizationId,
      $or: [{ profileImage: `/api/assets/${suffix}` }, { profileImage: `/uploads/${suffix}` }],
    })
      .select('_id')
      .lean();
    if (sharedAvatar) return true;
  }

  return false;
}

function contentTypeForFilename(filename, fallback) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.json': 'application/json',
  };
  return fallback || map[ext] || 'application/octet-stream';
}

function sendWithRange(req, res, filePath, contentType) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (contentType) res.setHeader('Content-Type', contentType);

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.status(416);
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      res.status(416);
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }
    const chunkEnd = Math.min(end, fileSize - 1);
    const chunkSize = chunkEnd - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${chunkEnd}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);
    return fs.createReadStream(filePath, { start, end: chunkEnd }).pipe(res);
  }

  res.setHeader('Content-Length', fileSize);
  return fs.createReadStream(filePath).pipe(res);
}

exports.getAsset = asyncHandler(async (req, res) => {
  const filename = safeFilename(req.params.filename);
  if (!filename) throw new AppError('Invalid asset', 400);

  const allowed = await canAccess(req.user, filename);
  if (!allowed) throw new AppError('Forbidden', 403);

  const filePath = path.resolve(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep) && filePath !== UPLOAD_DIR) {
    throw new AppError('Invalid asset', 400);
  }
  if (!fs.existsSync(filePath)) throw new AppError('Asset not found', 404);

  const media = await MediaItem.findOne({
    $or: [
      { fileUrl: { $in: [`/api/assets/${filename}`, `/uploads/${filename}`] } },
      { thumbnailUrl: { $in: [`/api/assets/${filename}`, `/uploads/${filename}`] } },
    ],
  })
    .select('mimeType')
    .lean();

  const isMediaBinary =
    media ||
    /\.(mp4|webm|mov|mkv|mp3|wav|m4a|aac|ogg|flac)$/i.test(filename);

  if (isMediaBinary) {
    return sendWithRange(req, res, filePath, media?.mimeType || undefined);
  }

  const isInlineImage = /\.(png|jpe?g|gif|webp)$/i.test(filename);
  const contentType = contentTypeForFilename(filename, media?.mimeType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', contentType);
  if (!isInlineImage) {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }
  return res.sendFile(filePath);
});
