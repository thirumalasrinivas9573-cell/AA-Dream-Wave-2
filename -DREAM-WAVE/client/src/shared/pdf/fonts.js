import { Font } from '@react-pdf/renderer'
import { sanitizeText } from './sanitizeText.js'

export let PDF_FONT_FAMILY = 'Helvetica'

export let REGISTERED_FONTS = {
  base: 'Helvetica',
  hasBold: false,
  hasItalic: false,
  telugu: 'Helvetica',
  teluguBold: false,
  devanagari: 'Helvetica',
  devanagariBold: false,
}

export let INDIC_FONTS = {
  devanagari: 'Helvetica',
  telugu: 'Helvetica',
}

let fontsRegistered = false
let fontRegistrationPromise = null

export function registerPdfFonts() {
  if (fontsRegistered) return Promise.resolve(REGISTERED_FONTS)
  if (fontRegistrationPromise) return fontRegistrationPromise

  fontRegistrationPromise = (async () => {
    async function fontExists(url) {
      try {
        const res = await fetch(url, { method: 'HEAD' })
        const ct = res.headers.get('content-type') || ''
        return res.ok && !ct.includes('text/html')
      } catch (err) {
        console.warn(`[PDF Font Check] Failed to check ${url}:`, err)
        return false
      }
    }

    const [
      hasRegular,
      hasBold,
      hasItalic,
      hasDevanagari,
      hasDevanagariBold,
      hasTelugu,
      hasTeluguBold,
    ] = await Promise.all([
      fontExists('/fonts/NotoSans-Regular.ttf'),
      fontExists('/fonts/NotoSans-Bold.ttf'),
      fontExists('/fonts/NotoSans-Italic.ttf'),
      fontExists('/fonts/NotoSansDevanagari-Regular.ttf'),
      fontExists('/fonts/NotoSansDevanagari-Bold.ttf'),
      fontExists('/fonts/NotoSansTelugu-Regular.ttf'),
      fontExists('/fonts/NotoSansTelugu-Bold.ttf'),
    ])

    if (hasRegular && hasBold) {
      try {
        const fontList = [
          { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
          { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
        ]
        if (hasItalic) {
          fontList.push({ src: '/fonts/NotoSans-Italic.ttf', fontWeight: 'normal', fontStyle: 'italic' })
        }
        Font.register({ family: 'NotoSans', fonts: fontList })
        PDF_FONT_FAMILY = 'NotoSans'
        REGISTERED_FONTS.base = 'NotoSans'
        REGISTERED_FONTS.hasBold = true
        REGISTERED_FONTS.hasItalic = hasItalic
      } catch (err) {
        console.warn('[PDF Font] NotoSans registration failed. Defaulting to Helvetica.', err)
        PDF_FONT_FAMILY = 'Helvetica'
        REGISTERED_FONTS.base = 'Helvetica'
      }
    } else {
      console.warn('[PDF Font Missing] NotoSans TTF files missing or returned 404 HTML fallback. Defaulting to Helvetica.')
      PDF_FONT_FAMILY = 'Helvetica'
      REGISTERED_FONTS.base = 'Helvetica'
    }

    if (hasDevanagari) {
      try {
        if (hasDevanagariBold) {
          Font.register({
            family: 'NotoSansDevanagari',
            fonts: [
              { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 'normal' },
              { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 'bold' },
            ],
          })
          REGISTERED_FONTS.devanagariBold = true
        } else {
          Font.register({ family: 'NotoSansDevanagari', src: '/fonts/NotoSansDevanagari-Regular.ttf' })
        }
        INDIC_FONTS.devanagari = 'NotoSansDevanagari'
        REGISTERED_FONTS.devanagari = 'NotoSansDevanagari'
      } catch (err) {
        console.warn('[PDF Font] NotoSansDevanagari registration failed. Defaulting to Helvetica.', err)
        INDIC_FONTS.devanagari = REGISTERED_FONTS.base
        REGISTERED_FONTS.devanagari = REGISTERED_FONTS.base
      }
    } else {
      INDIC_FONTS.devanagari = REGISTERED_FONTS.base
      REGISTERED_FONTS.devanagari = REGISTERED_FONTS.base
    }

    if (hasTelugu) {
      try {
        if (hasTeluguBold) {
          Font.register({
            family: 'NotoSansTelugu',
            fonts: [
              { src: '/fonts/NotoSansTelugu-Regular.ttf', fontWeight: 'normal' },
              { src: '/fonts/NotoSansTelugu-Bold.ttf', fontWeight: 'bold' },
            ],
          })
          REGISTERED_FONTS.teluguBold = true
        } else {
          Font.register({ family: 'NotoSansTelugu', src: '/fonts/NotoSansTelugu-Regular.ttf' })
        }
        INDIC_FONTS.telugu = 'NotoSansTelugu'
        REGISTERED_FONTS.telugu = 'NotoSansTelugu'
      } catch (err) {
        console.warn('[PDF Font] NotoSansTelugu registration failed. Defaulting to Helvetica.', err)
        INDIC_FONTS.telugu = REGISTERED_FONTS.base
        REGISTERED_FONTS.telugu = REGISTERED_FONTS.base
      }
    } else {
      INDIC_FONTS.telugu = REGISTERED_FONTS.base
      REGISTERED_FONTS.telugu = REGISTERED_FONTS.base
    }


    fontsRegistered = true
    return REGISTERED_FONTS
  })()

  return fontRegistrationPromise
}

let warnedTelugu = false
let warnedDevanagari = false

export let LAST_EMITTED_RUNS = []

export function clearEmittedRuns() {
  LAST_EMITTED_RUNS = []
}

/**
 * Classifies string characters into script tokens and merges neutral characters:
 * - Telugu (U+0C00-0C7F) -> REGISTERED_FONTS.telugu if registered, else replaced with '?' in base family
 * - Devanagari (U+0900-097F) -> REGISTERED_FONTS.devanagari if registered, else replaced with '?' in base family
 * - ZWJ/ZWNJ (U+200C/200D), spaces, digits, punctuation, combining marks between script chars belong to that script.
 * - Leading/trailing neutrals attach to the adjacent script run.
 */
export function splitTextByScript(textStr, baseFamily = PDF_FONT_FAMILY, options = {}) {
  if (textStr === null || textStr === undefined) return []
  const str = String(textStr)
  if (!str) return []

  const isTeluguRegistered = REGISTERED_FONTS.telugu !== 'Helvetica'
  const isDevanagariRegistered = REGISTERED_FONTS.devanagari !== 'Helvetica'

  // Tokenize string into contiguous chunks of TELUGU, DEVANAGARI, LATIN, or NEUTRAL
  const tokens = []
  const tokenRegex = /([\u0C00-\u0C7F]+)|([\u0900-\u097F]+)|([A-Za-z\u00C0-\u024F]+)|([\u200C\u200D\s\d\p{P}\p{S}]+)/gu
  let match

  while ((match = tokenRegex.exec(str)) !== null) {
    if (match[1]) tokens.push({ text: match[1], type: 'TELUGU' })
    else if (match[2]) tokens.push({ text: match[2], type: 'DEVANAGARI' })
    else if (match[3]) tokens.push({ text: match[3], type: 'LATIN' })
    else if (match[4]) tokens.push({ text: match[4], type: 'NEUTRAL' })
  }

  if (!tokens.length) {
    const result = [{ text: str, fontFamily: baseFamily, script: 'LATIN' }]
    LAST_EMITTED_RUNS.push({ text: str, script: 'LATIN', fontFamily: baseFamily, fontWeight: options.fontWeight || 'normal', fontStyle: options.fontStyle || 'normal' })
    return result
  }

  // Resolve neutral tokens based on surrounding scripts
  const resolved = tokens.map((t) => ({ ...t, resolvedType: t.type }))

  for (let i = 0; i < resolved.length; i++) {
    if (resolved[i].type === 'NEUTRAL') {
      let prevScript = null
      for (let j = i - 1; j >= 0; j--) {
        if (resolved[j].type !== 'NEUTRAL') {
          prevScript = resolved[j].type
          break
        }
      }

      let nextScript = null
      for (let j = i + 1; j < resolved.length; j++) {
        if (resolved[j].type !== 'NEUTRAL') {
          nextScript = resolved[j].type
          break
        }
      }

      if (prevScript && nextScript && prevScript === nextScript) {
        resolved[i].resolvedType = prevScript
      } else if (nextScript === 'LATIN') {
        resolved[i].resolvedType = 'LATIN'
      } else if (prevScript === 'LATIN') {
        resolved[i].resolvedType = 'LATIN'
      } else if (prevScript) {
        resolved[i].resolvedType = prevScript
      } else if (nextScript) {
        resolved[i].resolvedType = nextScript
      } else {
        resolved[i].resolvedType = 'LATIN'
      }
    }
  }

  // Combine consecutive tokens sharing the same resolved type
  const mergedRuns = []
  for (const t of resolved) {
    if (mergedRuns.length > 0 && mergedRuns[mergedRuns.length - 1].type === t.resolvedType) {
      mergedRuns[mergedRuns.length - 1].text += t.text
    } else {
      mergedRuns.push({ text: t.text, type: t.resolvedType })
    }
  }

  const finalRuns = mergedRuns
    .filter((r) => r.text && r.text.length > 0)
    .map((r) => {
      let fontFamily = baseFamily
      let script = r.type

      if (r.type === 'TELUGU') {
        if (isTeluguRegistered && !options.safeMode) {
          fontFamily = REGISTERED_FONTS.telugu
        } else {
          if (!warnedTelugu && !options.safeMode) {
            console.warn('[PDF Font] Telugu font (/fonts/NotoSansTelugu-Regular.ttf) is not registered. Replacing Telugu text with "?" to prevent layout crash.')
            warnedTelugu = true
          }
          fontFamily = baseFamily
          r.text = r.text.replace(/[\u0C00-\u0C7F\u200C\u200D]+/g, '?')
          script = 'TELUGU (UNREGISTERED->?)'
        }
      } else if (r.type === 'DEVANAGARI') {
        if (isDevanagariRegistered && !options.safeMode) {
          fontFamily = REGISTERED_FONTS.devanagari
        } else {
          if (!warnedDevanagari && !options.safeMode) {
            console.warn('[PDF Font] Devanagari font (/fonts/NotoSansDevanagari-Regular.ttf) is not registered. Replacing Devanagari text with "?" to prevent layout crash.')
            warnedDevanagari = true
          }
          fontFamily = baseFamily
          r.text = r.text.replace(/[\u0900-\u097F\u200C\u200D]+/g, '?')
          script = 'DEVANAGARI (UNREGISTERED->?)'
        }
      }

      const runObj = {
        text: r.text,
        fontFamily,
        script,
        fontWeight: options.fontWeight || 'normal',
        fontStyle: options.fontStyle || 'normal',
      }

      LAST_EMITTED_RUNS.push(runObj)
      return { text: r.text, fontFamily, script }
    })

  return finalRuns
}

export function sanitizeEmojiAndText(raw, options = {}) {
  return sanitizeText(raw, options)
}



