/**
 * Text & Emoji sanitizer for PDF rendering.
 * Contains NO @react-pdf imports.
 */

const KNOWN_HTML_TAGS = /<\/?(script|style|iframe|div|span|p|br|img|a|b|i|em|strong|table|tr|td|th|ul|ol|li|h[1-6])\b[^>]*>/gi

// Regex matching emoji presentation symbols, skin-tone modifiers, variation selectors, and emoji ZWJ sequences
const EMOJI_REGEX = /(?:\p{Emoji_Presentation}|\uFE0F|[\uD83C\uDFFB-\uD83C\uDFFF])+(?:\u200D(?:\p{Emoji_Presentation}|\uFE0F|[\uD83C\uDFFB-\uD83C\uDFFF])+)*/gu

// Symbol replacements for text-presentation symbols missing in Noto Sans
const SYMBOL_REPLACEMENTS = [
  [/[\u2713\u2714\u2611]/g, '[x]'],  // ✔, ✓, ☑ -> [x]
  [/[\u2610]/g, '[ ]'],             // ☐ -> [ ]
  [/[\u2717\u2718]/g, '[-]'],       // ✗, ✘ -> [-]
  [/\u26A0/g, '(!)'],               // ⚠ -> (!)
  [/[\u2764\u2605\u2606]/g, ''],    // ❤, ★, ☆ -> removed
]


export function sanitizeText(raw, options = {}) {
  if (raw === null || raw === undefined) return ''
  let str = String(raw)

  // Strip known HTML tags only if not inside code block
  if (!options.isCode) {
    str = str.replace(KNOWN_HTML_TAGS, '')
    // Unescape common HTML entities
    str = str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  // Safe mode: replace characters outside Latin-1, general punctuation (excluding ZWNJ/ZWJ), currency symbols, and common math with '?'
  if (options.safeMode) {
    str = str.replace(/[^\t\r\n\u0020-\u007E\u00A0-\u00FF\u2000-\u200B\u200E-\u206F\u20A0-\u20CF\u2200-\u22FF]/gu, '?')
    str = str.replace(/\?+/g, '?')
    return str
  }




  // Replace text-presentation symbols missing in Noto Sans
  for (const [pattern, replacement] of SYMBOL_REPLACEMENTS) {
    str = str.replace(pattern, replacement)
  }

  // Remove emojis and emoji ZWJ sequences while preserving Indic ZWJ (\u200D) and ZWNJ (\u200C)
  str = str.replace(EMOJI_REGEX, '')

  // eslint-disable-next-line no-control-regex
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')



  return str
}

export default sanitizeText

