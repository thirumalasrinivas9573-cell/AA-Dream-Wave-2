/**
 * Shared OpenAI / Gemini client — lazy init so the API server can boot without keys.
 * Supports OPENAI_API_KEY or GEMINI_API_KEY (via Google's OpenAI-compatible endpoint).
 */
const OpenAI = require('openai');

let client = null;

function getApiKey() {
  return (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
}

function getOpenAI() {
  if (client) return client;
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured');
    err.statusCode = 503;
    throw err;
  }
  const isGemini = Boolean(
    process.env.GEMINI_API_KEY ||
    apiKey.startsWith('AIza') ||
    (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes('googleapis'))
  );
  const options = {
    apiKey,
    timeout: Number(process.env.OPENAI_TIMEOUT_MS) || 45000,
  };
  if (isGemini) {
    options.baseURL = process.env.GEMINI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
  } else if (process.env.OPENAI_BASE_URL) {
    options.baseURL = process.env.OPENAI_BASE_URL;
  }
  client = new OpenAI(options);
  return client;
}

/** Proxy so existing `openai.chat.completions.create(...)` call sites keep working. */
const openai = new Proxy(
  {},
  {
    get(_target, prop) {
      return getOpenAI()[prop];
    },
  }
);

module.exports = { getOpenAI, openai, getApiKey };

