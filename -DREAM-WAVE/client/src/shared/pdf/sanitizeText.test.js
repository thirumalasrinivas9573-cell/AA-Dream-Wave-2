import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeText } from './sanitizeText.js'
import { splitTextByScript, REGISTERED_FONTS } from './fonts.js'

test('sanitizeText preserves currency symbol ₹6 LPA', () => {
  assert.equal(sanitizeText('₹6 LPA'), '₹6 LPA')
})

test('sanitizeText preserves em dash "a — b"', () => {
  assert.equal(sanitizeText('a — b'), 'a — b')
})

test('sanitizeText preserves curly quotes "“quoted”"', () => {
  assert.equal(sanitizeText('“quoted”'), '“quoted”')
})

test('sanitizeText preserves Map<String,int> in code context', () => {
  assert.equal(sanitizeText('Map<String,int>', { isCode: true }), 'Map<String,int>')
})

test('sanitizeText preserves math operators "x < 5 and y > 3"', () => {
  assert.equal(sanitizeText('x < 5 and y > 3'), 'x < 5 and y > 3')
})

test('sanitizeText preserves Telugu ZWNJ conjunct', () => {
  const teluguWithZwnj = 'వచ్చి\u200Cన'
  assert.equal(sanitizeText(teluguWithZwnj), teluguWithZwnj)
})

test('sanitizeText removes emojis including emoji ZWJ sequence', () => {
  const emojiStr = 'Hello 🚀\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 World'
  assert.equal(sanitizeText(emojiStr).trim(), 'Hello  World')
})

test('sanitizeText replaces missing text-presentation symbols (✔ ✓ ✗ ✘ ⚠ ❤ ★ ☆ ☑ ☐)', () => {
  const input = 'Checks: ✔ ✓ ☑ ☐ ✗ ✘ ⚠ | Symbols: ❤ ★ ☆'
  const expected = 'Checks: [x] [x] [x] [ ] [-] [-] (!) | Symbols:'
  assert.equal(sanitizeText(input).trim(), expected)
})

test('splitTextByScript handles Telugu word with ZWNJ as a single run when registered', () => {
  REGISTERED_FONTS.telugu = 'NotoSansTelugu'
  const word = 'ప్లాట్\u200Cఫారమ్'
  const runs = splitTextByScript(word, 'Helvetica')
  assert.equal(runs.length, 1)
  assert.equal(runs[0].text, word)
  assert.equal(runs[0].fontFamily, 'NotoSansTelugu')
})

test('splitTextByScript splits "Hello తెలుగు world" into Latin and Indic runs when registered', () => {
  REGISTERED_FONTS.telugu = 'NotoSansTelugu'
  const text = 'Hello తెలుగు world'
  const runs = splitTextByScript(text, 'Helvetica')
  assert.equal(runs.length, 3)
  assert.equal(runs[0].text, 'Hello ')
  assert.equal(runs[1].text, 'తెలుగు')
  assert.equal(runs[1].fontFamily, 'NotoSansTelugu')
  assert.equal(runs[2].text, ' world')
})

test('splitTextByScript keeps two Devanagari words separated by a space in one run when registered', () => {
  REGISTERED_FONTS.devanagari = 'NotoSansDevanagari'
  const text = 'दो शब्द'
  const runs = splitTextByScript(text, 'Helvetica')
  assert.equal(runs.length, 1)
  assert.equal(runs[0].text, 'दो शब्द')
  assert.equal(runs[0].fontFamily, 'NotoSansDevanagari')
})

test('splitTextByScript keeps plain Latin text as a single run', () => {
  const text = 'Hello World 123'
  const runs = splitTextByScript(text, 'Helvetica')
  assert.equal(runs.length, 1)
  assert.equal(runs[0].text, 'Hello World 123')
})

test('splitTextByScript replaces Telugu word with "?" when Telugu font is unregistered', () => {
  REGISTERED_FONTS.telugu = 'Helvetica'
  const word = 'వచ్చి\u200Cన'
  const runs = splitTextByScript(word, 'Helvetica')
  assert.equal(runs.length, 1)
  assert.equal(runs[0].text, '?')
  assert.equal(runs[0].fontFamily, 'Helvetica')
})

test('splitTextByScript leaves Latin text untouched when script font is unregistered', () => {
  REGISTERED_FONTS.telugu = 'Helvetica'
  const latinText = 'Dream Wave AI System 2026'
  const runs = splitTextByScript(latinText, 'Helvetica')
  assert.equal(runs.length, 1)
  assert.equal(runs[0].text, latinText)
  assert.equal(runs[0].fontFamily, 'Helvetica')
})

test('sanitizeText in safeMode keeps ₹6 LPA, a — b, “quotes”, but replaces Telugu text with "?"', () => {
  const input = 'Benchmark: ₹6 LPA — “quotes” summary: వచ్చి\u200Cన'
  const sanitized = sanitizeText(input, { safeMode: true })
  assert.equal(sanitized, 'Benchmark: ₹6 LPA — “quotes” summary: ?')
})

test('missing-font detection treats an HTML response (404 dev server fallback) as missing font', () => {
  const checkFontValidity = (resOk, contentType) => resOk && !contentType.includes('text/html')
  assert.equal(checkFontValidity(true, 'text/html; charset=utf-8'), false)
  assert.equal(checkFontValidity(true, 'font/ttf'), true)
  assert.equal(checkFontValidity(false, 'font/ttf'), false)
})




