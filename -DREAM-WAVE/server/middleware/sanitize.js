// ── Input sanitization + prompt injection guard ───────────────────────────────
// Applied to all /api/ai routes to prevent abuse and prompt injection attacks

const INJECTION_PATTERNS = [
  'ignore previous instructions',
  'ignore all instructions',
  'disregard your instructions',
  'forget your instructions',
  'you are now',
  'act as',
  'pretend you are',
  'jailbreak',
  'dan mode',
  'developer mode',
  'override system',
  'system prompt',
  'new instructions:',
  'your new role',
  'ignore the above',
  'bypass',
]

const SPAM_PATTERNS = [
  /(.)\1{15,}/,          // 15+ repeated characters
  /^[^a-zA-Z0-9\s]{10,}$/, // only symbols
]

/**
 * Sanitize a string -- strip HTML tags, trim, limit length
 */
const sanitizeString = (str, maxLen = 2000) => {
  if (typeof str !== 'string') return ''
  return str
    .replace(/<[^>]*>/g, '')   // strip HTML
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLen)
}

/**
 * Check for prompt injection attempts
 */
const isInjectionAttempt = (text) => {
  const lower = text.toLowerCase()
  return INJECTION_PATTERNS.some(p => lower.includes(p))
}

/**
 * Check for spam
 */
const isSpam = (text) => {
  return SPAM_PATTERNS.some(p => p.test(text))
}

/**
 * Middleware: sanitize req.body fields and block injection/spam
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize all string fields in body
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key])
      }
    }
  }

  // Check message field specifically for injection / spam
  const msg = req.body?.message || req.body?.query || ''
  if (msg) {
    if (isInjectionAttempt(msg)) {
      return res.status(400).json({
        success: false,
        message: 'Your message contains restricted content. Please ask a genuine question.',
      })
    }
    if (isSpam(msg)) {
      return res.status(400).json({
        success: false,
        message: 'Please send a meaningful message.',
      })
    }
  }

  next()
}

module.exports = { sanitizeInput, sanitizeString, isInjectionAttempt }
