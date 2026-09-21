/**
 * Pick only allowed keys from an object (mass-assignment protection).
 */
function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const { parsePagination, paginationMeta } = require('./pagination');
const { sendSuccess, sendMessage } = require('./apiResponse');

module.exports = {
  pick,
  escapeRegex,
  parsePagination,
  paginationMeta,
  sendSuccess,
  sendMessage,
};
