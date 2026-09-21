const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const { parseUserAgent } = require('./userAgent');

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL_MS = parseInt(process.env.JWT_REFRESH_TTL_MS || String(30 * 24 * 60 * 60 * 1000), 10);
const REFRESH_TTL_SHORT_MS = parseInt(process.env.JWT_REFRESH_TTL_SHORT_MS || String(24 * 60 * 60 * 1000), 10);
const COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'dw_refresh';

function generateAccessToken(userId, familyId) {
  return jwt.sign(
    { id: userId, sid: familyId, type: 'access' },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_TTL,
      issuer: 'dream-wave-api',
      audience: 'dream-wave-client',
      subject: String(userId),
    },
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions(maxAgeMs) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/api/auth',
  };
}

function setRefreshCookie(res, raw, maxAgeMs) {
  if (!res || typeof res.cookie !== 'function') return;
  res.cookie(COOKIE_NAME, raw, cookieOptions(maxAgeMs));
}

function clearRefreshCookie(res) {
  if (!res || typeof res.clearCookie !== 'function') return;
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(0), maxAge: 0 });
}

function readRefreshFromReq(req) {
  // Production clients use the HttpOnly cookie. Body support is retained only
  // for native/legacy clients and can be disabled with COOKIE_REFRESH_ONLY.
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  if (process.env.COOKIE_REFRESH_ONLY === 'true') return null;
  return req.body?.refreshToken || null;
}

async function issueRefreshToken(userId, meta = {}, { remember = true, familyId = null } = {}) {
  const raw = crypto.randomBytes(48).toString('hex');
  const family = familyId || crypto.randomUUID();
  const ttl = remember ? REFRESH_TTL_MS : REFRESH_TTL_SHORT_MS;
  const expiresAt = new Date(Date.now() + ttl);
  const ua = meta.userAgent || '';
  const { device, browser } = parseUserAgent(ua);
  const doc = await RefreshToken.create({
    userId,
    tokenHash: hashToken(raw),
    familyId: family,
    expiresAt,
    userAgent: String(ua).slice(0, 500),
    ip: String(meta.ip || '').slice(0, 100),
    device,
    browser,
    remember: Boolean(remember),
    loginAt: new Date(),
    lastUsedAt: new Date(),
  });
  return { raw, expiresAt, ttl, id: doc._id, familyId: family };
}

async function rotateRefreshToken(oldRaw, meta = {}) {
  const oldHash = hashToken(oldRaw);
  const now = new Date();
  const existing = await RefreshToken.findOneAndUpdate(
    { tokenHash: oldHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, lastUsedAt: now } },
    { new: true },
  );
  if (!existing) {
    // A replayed rotated token is evidence of theft. Revoke its entire family.
    const replayed = await RefreshToken.findOne({ tokenHash: oldHash });
    if (replayed?.familyId) {
      await RefreshToken.updateMany(
        { userId: replayed.userId, familyId: replayed.familyId, revokedAt: null },
        { $set: { revokedAt: now } },
      );
    }
    return null;
  }
  const remember = existing.remember !== false;
  const next = await issueRefreshToken(existing.userId, meta, {
    remember,
    familyId: existing.familyId,
  });
  existing.replacedByHash = hashToken(next.raw);
  await existing.save();
  const accessToken = generateAccessToken(existing.userId, next.familyId);
  return {
    userId: existing.userId,
    accessToken,
    refreshToken: next.raw,
    ttl: next.ttl,
    sessionId: next.id,
  };
}

async function revokeRefreshToken(raw) {
  if (!raw) return;
  const existing = await RefreshToken.findOne({ tokenHash: hashToken(raw) });
  if (!existing) return;
  await RefreshToken.updateMany(
    { userId: existing.userId, familyId: existing.familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

async function revokeAllForUser(userId) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

async function revokeSessionById(userId, sessionId) {
  const session = await RefreshToken.findOne({ _id: sessionId, userId });
  if (!session) return { deletedCount: 0 };
  const result = await RefreshToken.updateMany(
    { userId, familyId: session.familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  return { deletedCount: result.modifiedCount };
}

async function listSessions(userId, currentRaw) {
  const currentHash = currentRaw ? hashToken(currentRaw) : null;
  const rows = await RefreshToken.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .sort({ lastUsedAt: -1 })
    .select('_id userAgent ip device browser createdAt loginAt lastUsedAt expiresAt remember tokenHash')
    .lean();
  return rows.map((r) => ({
    id: r._id,
    userAgent: r.userAgent || '',
    ip: r.ip || '',
    device: r.device || 'Unknown device',
    browser: r.browser || 'Unknown browser',
    loginAt: r.loginAt || r.createdAt,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt || r.createdAt,
    lastActivity: r.lastUsedAt || r.createdAt,
    expiresAt: r.expiresAt,
    remember: r.remember !== false,
    current: Boolean(currentHash && r.tokenHash === currentHash),
  }));
}

async function issueSession(userId, meta = {}, { remember = true } = {}) {
  // Back-compat: issueSession(userId, userAgentString)
  if (typeof meta === 'string') meta = { userAgent: meta };
  const next = await issueRefreshToken(userId, meta, { remember });
  const token = generateAccessToken(userId, next.familyId);
  return {
    token,
    refreshToken: next.raw,
    ttl: next.ttl,
    sessionId: next.id,
  };
}

async function touchSession(raw) {
  if (!raw) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(raw), revokedAt: null },
    { $set: { lastUsedAt: new Date() } },
  );
}

async function isSessionFamilyActive(userId, familyId) {
  if (!userId || !familyId) return false;
  return Boolean(await RefreshToken.exists({
    userId,
    familyId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }));
}

module.exports = {
  generateAccessToken,
  issueSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  revokeSessionById,
  listSessions,
  touchSession,
  isSessionFamilyActive,
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshFromReq,
  COOKIE_NAME,
  ACCESS_TTL,
  REFRESH_TTL_MS,
  REFRESH_TTL_SHORT_MS,
};
