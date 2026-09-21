/**
 * Prompt Injection Guard
 * @module mj/brain/security/PromptGuard
 */

const { MJLogger } = require('../../logger')

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?(prior|previous|above)/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /api[_\s]?key/i,
  /secret[_\s]?key/i,
]

class PromptGuard {
  constructor() {
    this._logger = MJLogger.child('PromptGuard')
  }

  /**
   * Sanitize and validate user input.
   * @param {string} input
   * @returns {{ safe: boolean, sanitized: string, warnings: Array }}
   */
  validate(input) {
    const warnings = []
    if (!input || typeof input !== 'string') {
      return { safe: false, sanitized: '', warnings: [{ type: 'invalid_input', message: 'Input must be a non-empty string' }] }
    }

    let sanitized = input.trim().slice(0, 10000)

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        warnings.push({ type: 'injection_attempt', message: 'Potential prompt injection detected and neutralized' })
        sanitized = sanitized.replace(pattern, '[filtered]')
      }
    }

    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

    if (warnings.length) {
      this._logger.warning('Prompt guard triggered', { warningCount: warnings.length })
    }

    return { safe: warnings.length === 0, sanitized, warnings }
  }

  /** Validate AI output before returning */
  validateOutput(content) {
    if (!content) return { safe: true, content: '' }

    const warnings = []
    let safe = content

    if (/sk-[a-zA-Z0-9]{20,}/.test(content)) {
      warnings.push({ type: 'api_key_leak', message: 'Potential API key in output — redacted' })
      safe = content.replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED]')
    }

    return { safe: warnings.length === 0, content: safe, warnings }
  }
}

module.exports = { PromptGuard }
