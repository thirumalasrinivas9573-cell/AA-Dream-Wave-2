/**
 * Phone OTP guards: E.164 validation, rate limits, verified-phone cache.
 * Persisted in MongoDB for multi-instance safety.
 */

const PhoneOtpState = require('../models/PhoneOtpState');

const E164_RE = /^\+[1-9]\d{7,14}$/;
const MAX_SENDS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;
const DUPLICATE_COOLDOWN_MS = 45 * 1000;
const VERIFIED_TTL_MS = 15 * 60 * 1000;

function assertE164(phone) {
  const value = String(phone || '').trim();
  if (!E164_RE.test(value)) {
    const err = new Error('Invalid Number');
    err.statusCode = 400;
    err.code = 'INVALID_NUMBER';
    throw err;
  }
  return value;
}

function maskPhone(phone) {
  const p = String(phone || '');
  if (p.length < 6) return '***';
  return `${p.slice(0, 3)}******${p.slice(-2)}`;
}

async function getOrCreate(phone) {
  let doc = await PhoneOtpState.findOne({ phone });
  if (!doc) {
    doc = await PhoneOtpState.create({ phone, sendTimestamps: [] });
  }
  return doc;
}

function pruneTimestamps(timestamps, now = Date.now()) {
  const cutoff = now - HOUR_MS;
  return (timestamps || []).map((t) => new Date(t)).filter((t) => t.getTime() > cutoff);
}

async function assertCanSend(phone) {
  const now = Date.now();
  const doc = await getOrCreate(phone);
  const history = pruneTimestamps(doc.sendTimestamps, now);

  if (history.length >= MAX_SENDS_PER_HOUR) {
    const err = new Error('Too Many Requests');
    err.statusCode = 429;
    err.code = 'RATE_LIMIT';
    throw err;
  }

  const last = history[history.length - 1];
  if (last && now - last.getTime() < DUPLICATE_COOLDOWN_MS) {
    const waitSec = Math.ceil((DUPLICATE_COOLDOWN_MS - (now - last.getTime())) / 1000);
    const err = new Error(`Please wait ${waitSec}s before requesting another code.`);
    err.statusCode = 429;
    err.code = 'DUPLICATE_REQUEST';
    err.waitSeconds = waitSec;
    throw err;
  }

  doc.sendTimestamps = history;
  await doc.save();
}

async function recordSend(phone) {
  const now = new Date();
  const doc = await getOrCreate(phone);
  const history = pruneTimestamps(doc.sendTimestamps, now.getTime());
  history.push(now);
  doc.sendTimestamps = history;
  await doc.save();
}

async function markVerified(phone) {
  const doc = await getOrCreate(phone);
  doc.verifiedUntil = new Date(Date.now() + VERIFIED_TTL_MS);
  await doc.save();
}

async function isPhoneVerified(phone) {
  const doc = await PhoneOtpState.findOne({ phone });
  if (!doc?.verifiedUntil) return false;
  if (doc.verifiedUntil.getTime() < Date.now()) {
    doc.verifiedUntil = null;
    await doc.save();
    return false;
  }
  return true;
}

async function consumeVerified(phone) {
  const ok = await isPhoneVerified(phone);
  if (!ok) return false;
  await PhoneOtpState.updateOne({ phone }, { $set: { verifiedUntil: null } });
  return true;
}

/** Test helpers — clear Mongo docs for a phone or all */
async function _resetGuards(phone) {
  if (phone) await PhoneOtpState.deleteOne({ phone });
  else await PhoneOtpState.deleteMany({});
}

async function _forceSendHistory(phone, timestamps) {
  await PhoneOtpState.findOneAndUpdate(
    { phone },
    { $set: { sendTimestamps: timestamps.map((t) => new Date(t)) } },
    { upsert: true },
  );
}

module.exports = {
  E164_RE,
  MAX_SENDS_PER_HOUR,
  VERIFIED_TTL_MS,
  assertE164,
  maskPhone,
  assertCanSend,
  recordSend,
  markVerified,
  isPhoneVerified,
  consumeVerified,
  _resetGuards,
  _forceSendHistory,
};
