/**
 * Centralized Gemini AI Service
 * Encapsulates Google Gemini API integration using Google's OpenAI-compatible endpoint.
 *
 * Provides:
 * - Centralized environment configuration
 * - Input validation & sanitization
 * - Robust error handling (missing key, invalid key, rate limits, timeouts, empty responses)
 * - Safe server-side logging without secret leakage
 * - Structured JSON and chat completion helpers
 *
 * @module services/geminiService
 */

const OpenAI = require('openai');

// ── Configuration ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'gemini-flash-latest';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_TIMEOUT_MS = 60000;
const MAX_INPUT_CHARS = 32000;

let _client = null;
let _cachedKey = null;

/**
 * Mask an API key for safe server logging (e.g., "AIza...makM")
 * @param {string} key
 * @returns {string}
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '[not set]';
  const clean = key.trim();
  if (clean.length <= 8) return '****';
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

/**
 * Retrieve the trimmed GEMINI_API_KEY from process.env
 * @returns {string}
 */
function getApiKey() {
  return (process.env.GEMINI_API_KEY || '').trim();
}

/**
 * Retrieve the active Gemini model name
 * @returns {string}
 */
function getModel() {
  return (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
}

/**
 * Retrieve the configured base URL
 * @returns {string}
 */
function getBaseUrl() {
  return (process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).trim();
}

/**
 * Retrieve or instantiate the singleton OpenAI-compatible Gemini client
 * @returns {OpenAI}
 */
function getClient() {
  const currentKey = getApiKey();
  if (!currentKey) {
    const error = new Error('GEMINI_API_KEY is missing or empty in server/.env');
    error.statusCode = 503;
    error.code = 'MISSING_GEMINI_API_KEY';
    throw error;
  }

  // Re-instantiate if the API key changed in runtime
  if (_client && _cachedKey === currentKey) {
    return _client;
  }

  const timeout = Number(process.env.OPENAI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const baseURL = getBaseUrl();

  console.log(`[GeminiService] Initialized client (model: ${getModel()}, base: ${baseURL}, key: ${maskApiKey(currentKey)})`);

  _client = new OpenAI({
    apiKey: currentKey,
    baseURL,
    timeout,
  });
  _cachedKey = currentKey;

  return _client;
}

// ── Request Validation ────────────────────────────────────────────────────────

/**
 * Validate and sanitize user-provided text prompt
 * @param {string} text
 * @param {string} [fieldLabel='Input']
 * @returns {string}
 */
function validateText(text, fieldLabel = 'Input') {
  if (text === undefined || text === null) {
    const err = new Error(`${fieldLabel} is required.`);
    err.statusCode = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }
  const clean = String(text).trim();
  if (!clean) {
    const err = new Error(`${fieldLabel} cannot be empty.`);
    err.statusCode = 400;
    err.code = 'EMPTY_INPUT';
    throw err;
  }
  if (clean.length > MAX_INPUT_CHARS) {
    // Truncate to safeguard token budget
    return clean.slice(0, MAX_INPUT_CHARS);
  }
  return clean;
}

/**
 * Validate and normalize messages array
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Array<{role: string, content: string}>}
 */
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    const err = new Error('Messages must be a non-empty array.');
    err.statusCode = 400;
    err.code = 'INVALID_MESSAGES';
    throw err;
  }

  const validRoles = new Set(['system', 'user', 'assistant']);
  return messages.map((m, idx) => {
    if (!m || typeof m !== 'object') {
      const err = new Error(`Message at index ${idx} must be an object.`);
      err.statusCode = 400;
      err.code = 'INVALID_MESSAGE_FORMAT';
      throw err;
    }
    const role = validRoles.has(m.role) ? m.role : 'user';
    const content = validateText(m.content, `Message content at index ${idx}`);
    return { role, content };
  });
}

// ── Error Normalization ───────────────────────────────────────────────────────

/**
 * Translate raw API errors into clean, structured application errors
 * @param {Error} err
 * @param {string} operation
 * @returns {Error}
 */
function normalizeGeminiError(err, operation = 'generate') {
  const status = Number(err.status || err.statusCode || 0);
  const rawMsg = err.message || 'Unknown error';

  let statusCode = 502;
  let code = 'GEMINI_ERROR';
  let message = `Gemini ${operation} failed.`;

  // 1. Missing API key
  if (err.code === 'MISSING_GEMINI_API_KEY') {
    statusCode = 503;
    code = 'MISSING_API_KEY';
    message = 'Gemini API key is not configured on the server.';
  }
  // 2. Invalid API Key
  else if (status === 401 || /api key not valid|unauthorized|invalid_api_key/i.test(rawMsg)) {
    statusCode = 401;
    code = 'INVALID_API_KEY';
    message = 'Gemini API key is invalid or unauthorized.';
  }
  // 3. Service Overloaded / Temporarily Unavailable
  else if (status === 503 || /overloaded|temporarily unavailable|service unavailable/i.test(rawMsg)) {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'Gemini service is temporarily unavailable or overloaded. Please try again.';
  }
  // 4. Rate Limit / Quota
  else if (status === 429 || /rate limit|quota|resource_exhausted/i.test(rawMsg)) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Gemini rate limit exceeded. Please wait a moment and try again.';
  }
  // 5. Timeout
  else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED' || status === 408 || status === 504 || /timeout/i.test(rawMsg)) {
    statusCode = 504;
    code = 'TIMEOUT';
    message = 'Gemini API request timed out. Please try again.';
  }
  // 6. Empty Response / Token Exhaustion
  else if (err.code === 'EMPTY_AI_RESPONSE' || /finish_reason:\s*length/i.test(rawMsg)) {
    statusCode = 502;
    code = 'EMPTY_RESPONSE';
    message = 'Gemini returned an empty response. Token budget may have been exceeded.';
  }
  // 7. Model Not Found
  else if (status === 404 || /model.*not found/i.test(rawMsg)) {
    statusCode = 502;
    code = 'MODEL_NOT_FOUND';
    message = `Configured Gemini model (${getModel()}) was not found or is unavailable.`;
  }
  // 8. Generic upstream error
  else {
    message = `Gemini service error: ${rawMsg}`;
  }

  const normalized = new Error(message);
  normalized.statusCode = statusCode;
  normalized.status = statusCode;
  normalized.code = code;
  normalized.originalError = err;
  return normalized;
}

async function executeWithRetry(fn, operation, maxRetries = 2) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = Number(err.status || err.statusCode || 0);
      const isTransient = status === 429 || status === 503 || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || /connection error|overloaded|network/i.test(err.message);
      if (!isTransient || attempt > maxRetries) {
        throw normalizeGeminiError(err, operation);
      }
      const delayMs = attempt * 1500;
      console.warn(`[GeminiService] Transient failure (status ${status || err.code}) on ${operation}. Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw normalizeGeminiError(lastErr, operation);
}

/**
 * Execute a chat completion call against Gemini
 *
 * @param {Object} options
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {string} [options.systemInstruction]
 * @param {number} [options.temperature=0.7]
 * @param {number} [options.maxTokens=2048]
 * @param {string} [options.model]
 * @returns {Promise<{ content: string, model: string, usage: Object, latencyMs: number }>}
 */
async function generateChat({ messages, systemInstruction, temperature = 0.7, maxTokens = 2048, model }) {
  const start = Date.now();
  const client = getClient();
  const targetModel = model || getModel();

  const validatedMessages = validateMessages(messages);
  const fullMessages = [];

  if (systemInstruction) {
    fullMessages.push({ role: 'system', content: validateText(systemInstruction, 'systemInstruction') });
  }
  fullMessages.push(...validatedMessages);

  // Safeguard: Gemini thinking/reasoning models need adequate token room
  const effectiveMaxTokens = Math.max(1000, Number(maxTokens) || 2048);

  const res = await executeWithRetry(
    () => client.chat.completions.create({
      model: targetModel,
      messages: fullMessages,
      temperature,
      max_tokens: effectiveMaxTokens,
    }),
    'chat'
  );

  const choice = res.choices?.[0];
  const content = choice?.message?.content;
  const finishReason = choice?.finish_reason;

  if (typeof content !== 'string' || !content.trim()) {
    const err = new Error(`Gemini returned empty message content (finish_reason: ${finishReason || 'unknown'}).`);
    err.code = 'EMPTY_AI_RESPONSE';
    err.finishReason = finishReason;
    throw normalizeGeminiError(err, 'chat');
  }

  const latencyMs = Date.now() - start;
  console.log(`[GeminiService] Chat completion success (${targetModel}, ${latencyMs}ms, finish: ${finishReason || 'ok'})`);

  return {
    content: content.trim(),
    model: targetModel,
    usage: res.usage || null,
    latencyMs,
  };
}

/**
 * Execute a structured JSON completion call against Gemini
 *
 * @param {Object} options
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {string} [options.systemInstruction]
 * @param {number} [options.temperature=0.4]
 * @param {number} [options.maxTokens=4096]
 * @param {string} [options.model]
 * @returns {Promise<{ data: Object, raw: string, model: string, latencyMs: number }>}
 */
async function generateStructuredJSON({ messages, systemInstruction, temperature = 0.4, maxTokens = 4096, model }) {
  const start = Date.now();
  const client = getClient();
  const targetModel = model || getModel();

  const validatedMessages = validateMessages(messages);
  const systemPrompt = [
    systemInstruction ? validateText(systemInstruction, 'systemInstruction') : '',
    'You must respond strictly with valid JSON. Do not include markdown code fences (```json or ```). Return pure parseable JSON only.',
  ].filter(Boolean).join('\n\n');

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...validatedMessages,
  ];

  const effectiveMaxTokens = Math.max(1500, Number(maxTokens) || 4096);

  const res = await executeWithRetry(
    () => client.chat.completions.create({
      model: targetModel,
      messages: fullMessages,
      temperature,
      response_format: { type: 'json_object' },
      max_tokens: effectiveMaxTokens,
    }),
    'structuredJSON'
  );

  const choice = res.choices?.[0];
  const raw = choice?.message?.content;
  const finishReason = choice?.finish_reason;

  if (typeof raw !== 'string' || !raw.trim()) {
    const err = new Error(`Gemini returned empty structured content (finish_reason: ${finishReason || 'unknown'}).`);
    err.code = 'EMPTY_AI_RESPONSE';
    err.finishReason = finishReason;
    throw normalizeGeminiError(err, 'structuredJSON');
  }

  let parsed = null;
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Attempt secondary extraction if model wrapped JSON in text
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      const parseErr = new Error('Gemini output could not be parsed as JSON.');
      parseErr.statusCode = 502;
      parseErr.code = 'INVALID_JSON_RESPONSE';
      throw normalizeGeminiError(parseErr, 'structuredJSON');
    }
  }

  const latencyMs = Date.now() - start;
  console.log(`[GeminiService] JSON completion success (${targetModel}, ${latencyMs}ms)`);

  return {
    data: parsed,
    raw,
    model: targetModel,
    latencyMs,
  };
}

/**
 * Convenient single-prompt text generation
 * @param {string} prompt
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
async function generateText(prompt, options = {}) {
  const cleanPrompt = validateText(prompt, 'prompt');
  const result = await generateChat({
    messages: [{ role: 'user', content: cleanPrompt }],
    ...options,
  });
  return result.content;
}

/**
 * Self-test method to verify connectivity and API key validity
 * @returns {Promise<{ ok: boolean, model: string, latencyMs: number, message: string }>}
 */
async function testConnection() {
  const start = Date.now();
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      model: getModel(),
      latencyMs: 0,
      message: 'GEMINI_API_KEY is not set in server/.env',
    };
  }

  try {
    const res = await generateChat({
      messages: [{ role: 'user', content: 'Say hello in one word.' }],
      maxTokens: 1000,
    });
    return {
      ok: true,
      model: res.model,
      latencyMs: Date.now() - start,
      reply: res.content,
      message: `Gemini API connected successfully (${res.model}, key: ${maskApiKey(apiKey)})`,
    };
  } catch (err) {
    return {
      ok: false,
      model: getModel(),
      latencyMs: Date.now() - start,
      code: err.code || 'CONNECTION_FAILED',
      message: err.message,
    };
  }
}

module.exports = {
  getApiKey,
  getModel,
  getBaseUrl,
  getClient,
  maskApiKey,
  validateText,
  validateMessages,
  normalizeGeminiError,
  generateChat,
  generateStructuredJSON,
  generateText,
  testConnection,
};
