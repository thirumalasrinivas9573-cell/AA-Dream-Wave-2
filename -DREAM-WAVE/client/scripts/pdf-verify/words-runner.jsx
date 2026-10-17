import React from 'react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import * as fontkit from 'fontkit'
import { Font, renderToBuffer } from '@react-pdf/renderer'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

import { ReportPdf } from '../../src/modules/student/pages/ReportPdf.jsx'
import { registerPdfFonts } from '../../src/shared/pdf/fonts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(__dirname, '../..')
const ROOT_DIR = path.resolve(CLIENT_DIR, '..')
const FONTS_DIR = path.resolve(CLIENT_DIR, 'public/fonts')
const OUT_DIR = path.resolve(__dirname, 'out')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

// Helper for local font resolution in Node
const originalFsOpen = fs.promises.open
fs.promises.open = function (filePath, flags, mode) {
  const pStr = String(filePath)
  if (pStr.includes('fonts') || pStr.includes('NotoSans')) {
    const filename = path.basename(pStr)
    const realPath = path.resolve(FONTS_DIR, filename)
    if (fs.existsSync(realPath)) {
      return originalFsOpen.call(fs.promises, realPath, flags, mode)
    }
  }
  return originalFsOpen.call(fs.promises, filePath, flags, mode)
}

const origReadFile = fs.promises.readFile
fs.promises.readFile = function (filePath, options) {
  const pStr = String(filePath)
  if (pStr.includes('fonts') || pStr.includes('NotoSans')) {
    const filename = path.basename(pStr)
    const realPath = path.resolve(FONTS_DIR, filename)
    if (fs.existsSync(realPath)) {
      return origReadFile.call(fs.promises, realPath, options)
    }
  }
  return origReadFile.call(fs.promises, filePath, options)
}

const origFileSync = fs.readFileSync
fs.readFileSync = function (filePath, options) {
  const pStr = String(filePath)
  if (pStr.includes('fonts') || pStr.includes('NotoSans')) {
    const filename = path.basename(pStr)
    const realPath = path.resolve(FONTS_DIR, filename)
    if (fs.existsSync(realPath)) {
      return origFileSync.call(fs, realPath, options)
    }
  }
  return origFileSync.call(fs, filePath, options)
}

// Mock fetch for local fonts before registerPdfFonts
if (!globalThis.__originalFetch) {
  globalThis.__originalFetch = globalThis.fetch
}
globalThis.fetch = async (input, options) => {
  const urlStr = typeof input === 'string' ? input : (input && input.url) ? input.url : String(input)
  if (urlStr.toLowerCase().includes('fonts')) {
    const filename = path.basename(urlStr)
    const fontPath = path.resolve(FONTS_DIR, filename)
    if (fs.existsSync(fontPath)) {
      const fontBuffer = fs.readFileSync(fontPath)
      const ab = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength)
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h && h.toLowerCase() === 'content-type' ? 'font/ttf' : null) },
        arrayBuffer: async () => ab,
        text: async () => '',
      }
    }
  }
  if (globalThis.__originalFetch) return globalThis.__originalFetch(input, options)
  throw new Error(`Unhandled fetch: ${urlStr}`)
}

await registerPdfFonts()

const teluguFontPath = path.resolve(FONTS_DIR, 'NotoSansTelugu-Regular.ttf')
const fkTeluguFont = fontkit.openSync(teluguFontPath)

// Initialize layout engine
try { fkTeluguFont.layout('గైడెన్స్') } catch (e) {}

const gpos = fkTeluguFont._layoutEngine.engine && fkTeluguFont._layoutEngine.engine.GPOSProcessor
const GPOSProto = gpos ? Object.getPrototypeOf(gpos) : null
if (!GPOSProto) throw new Error('GPOSProcessor prototype not found')

const origGetAnchor = GPOSProto.getAnchor
const origApplyAnchor = GPOSProto.applyAnchor

// Built from escapes as specified
const line1Str = '\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D'
const line2Str = '\u0C2A\u0C4D\u0C30\u0C3E\u0C1C\u0C46\u0C15\u0C4D\u0C1F\u0C4D \u0C15\u0C4D\u0C30\u0C2E\u0C02 \u0C36\u0C4D\u0C30\u0C40'

const words = [
  { name: 'Word 1 (డ్రీమ్)', str: '\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D' },
  { name: 'Word 2 (వేవ్)', str: '\u0C35\u0C47\u0C35\u0C4D' },
  { name: 'Word 3 (ప్రాజెక్ట్)', str: '\u0C2A\u0C4D\u0C30\u0C3E\u0C1C\u0C46\u0C15\u0C4D\u0C1F\u0C4D' },
  { name: 'Word 4 (క్రమం)', str: '\u0C15\u0C4D\u0C30\u0C2E\u0C02' },
  { name: 'Word 5 (శ్రీ)', str: '\u0C36\u0C4D\u0C30\u0C40' },
]

function getWordGlyphs(font, str, patchVariant) {
  if (patchVariant === 'Z') {
    GPOSProto.getAnchor = function (anchor) {
      if (!anchor) return { x: 0, y: 0 }
      return origGetAnchor.call(this, anchor)
    }
    GPOSProto.applyAnchor = origApplyAnchor
  } else if (patchVariant === 'S') {
    GPOSProto.getAnchor = function (anchor) {
      if (!anchor) return { x: 0, y: 0 }
      return origGetAnchor.call(this, anchor)
    }
    GPOSProto.applyAnchor = function (markRecord, baseAnchor, baseGlyphIndex) {
      if (!baseAnchor || !markRecord || !markRecord.markAnchor) return
      return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex)
    }
  }

  let glyphRun = font.layout(str)

  GPOSProto.getAnchor = origGetAnchor
  GPOSProto.applyAnchor = origApplyAnchor

  return glyphRun.glyphs.map((g, i) => ({
    id: g.id,
    name: g.name,
    xAdvance: glyphRun.positions[i].xAdvance,
    xOffset: glyphRun.positions[i].xOffset,
    yOffset: glyphRun.positions[i].yOffset,
  }))
}

async function main() {
  console.log('================================================================================')
  console.log('STARTING 48PT WORDS RENDERING & GLYPH POSITION EXPERIMENT')
  console.log('================================================================================')

  // ---------------------------------------------------------------------------
  // 1. PER-GLYPH xOffset AND yOffset COMPARISON UNDER Z AND S
  // ---------------------------------------------------------------------------
  console.log('\n--- PER-GLYPH LAYOUT COMPARISON UNDER VARIANTS Z vs S ---')
  for (const w of words) {
    console.log(`\nGlyph layout for ${w.name} ("${w.str}"):`)
    const glyphsZ = getWordGlyphs(fkTeluguFont, w.str + ' ', 'Z')
    const glyphsS = getWordGlyphs(fkTeluguFont, w.str + ' ', 'S')

    console.log('Variant Z:')
    console.table(glyphsZ)
    console.log('Variant S:')
    console.table(glyphsS)
  }

  // ---------------------------------------------------------------------------
  // 2. RENDER SINGLE-PAGE PDFs AT 48PT WITH REACT-PDF
  // ---------------------------------------------------------------------------
  console.log('\n--- RENDERING 48PT PDFs WITH REAL REACT-PDF PIPELINE ---')

  async function renderWordsPdf(patchVariant, filename) {
    let nullAnchorHits = 0

    if (patchVariant === 'Z') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) {
          nullAnchorHits++
          return { x: 0, y: 0 }
        }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = origApplyAnchor
    } else if (patchVariant === 'S') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) {
          nullAnchorHits++
          return { x: 0, y: 0 }
        }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = function (markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) {
          nullAnchorHits++
          return
        }
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex)
      }
    }

    const doc = (
      <ReportPdf
        workspace={{ title: `Variant ${patchVariant}` }}
        report={{
          title: `PDF Verification ${patchVariant}`,
          sections: [
            {
              key: 'line1',
              title: `Label: ${patchVariant} - Line 1`,
              content: line1Str,
            },
            {
              key: 'line2',
              title: `Label: ${patchVariant} - Line 2`,
              content: line2Str,
            },
          ],
        }}
        options={{ forceFont: 'NotoSansTelugu', fontSize: 48 }}
      />
    )

    try {
      const buffer = await renderToBuffer(doc)
      const outPath = path.resolve(OUT_DIR, filename)
      fs.writeFileSync(outPath, buffer)
      console.log(`Successfully rendered ${filename} (${buffer.length} bytes, Patch Variant: ${patchVariant}, Null-Anchor Hits: ${nullAnchorHits})`)
    } catch (e) {
      console.error(`Failed to render ${filename}:`, e.message)
    } finally {
      GPOSProto.getAnchor = origGetAnchor
      GPOSProto.applyAnchor = origApplyAnchor
    }

    return nullAnchorHits
  }

  const hitsZ = await renderWordsPdf('Z', 'words-z.pdf')
  const hitsS = await renderWordsPdf('S', 'words-s.pdf')

  // ---------------------------------------------------------------------------
  // 3. VERIFY BOTH PDFs WITH pdfjs-dist
  // ---------------------------------------------------------------------------
  console.log('\n--- VERIFYING GENERATED PDFs WITH pdfjs-dist ---')
  const targetFiles = ['words-z.pdf', 'words-s.pdf']
  const verificationResults = []

  for (const filename of targetFiles) {
    const filePath = path.resolve(OUT_DIR, filename)
    if (!fs.existsSync(filePath)) continue

    const stat = fs.statSync(filePath)
    const buffer = fs.readFileSync(filePath)
    const data = new Uint8Array(buffer)

    let pageCount = 0
    let textContentStr = ''
    let teluguCharCount = 0

    try {
      const loadingTask = pdfjsLib.getDocument({ data })
      const pdfDoc = await loadingTask.promise
      pageCount = pdfDoc.numPages

      for (let p = 1; p <= pageCount; p++) {
        const page = await pdfDoc.getPage(p)
        const tc = await page.getTextContent()
        const pageText = tc.items.map((item) => item.str).join(' ')
        textContentStr += pageText + ' '
      }

      for (const char of textContentStr) {
        const code = char.codePointAt(0)
        if (code >= 0x0c00 && code <= 0x0c7f) {
          teluguCharCount++
        }
      }
    } catch (e) {
      textContentStr = `ERROR: ${e.message}`
    }

    verificationResults.push({
      file: filename,
      sizeBytes: stat.size,
      pageCount,
      extractedTextLength: textContentStr.length,
      teluguCharCountInU0C00_U0C7F: teluguCharCount,
      nullAnchorHits: filename === 'words-z.pdf' ? hitsZ : hitsS,
    })
  }

  console.table(verificationResults)

  console.log('\n================================================================================')
  console.log('WORDS VERIFICATION COMPLETED SUCCESSFULLY')
  console.log('================================================================================')
}

main().catch((err) => {
  console.error('FATAL WORDS RUNNER ERROR:', err)
  process.exit(1)
})
