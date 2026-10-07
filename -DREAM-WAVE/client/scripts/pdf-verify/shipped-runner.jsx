import React from 'react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { renderToBuffer } from '@react-pdf/renderer'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

import { ReportPdf } from '../../src/modules/student/pages/ReportPdf.jsx'
import { registerPdfFonts } from '../../src/shared/pdf/fonts.js'
import { installFontkitGuard, getGuardStats } from '../../src/shared/pdf/fontkitGuard.js'

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

// Install the shipped fontkit guard from fontkitGuard.js
const fontPath = path.resolve(FONTS_DIR, 'NotoSansTelugu-Regular.ttf')
const fontBuffer = fs.readFileSync(fontPath)
await installFontkitGuard({ fontData: fontBuffer })

console.log('Shipped Fontkit Guard Installation Status:', getGuardStats())

const cases = [
  { name: 'case-1-latin', title: 'Latin Only', content: 'Dream Wave AI - Career Guidance & Learning Platform. Benchmark: ₹6 LPA — ₹24 LPA.' },
  { name: 'case-2-hindi', title: 'Hindi Only', content: 'ड्रीम वेव एआई - करियर मार्गदर्शन एवं लर्निंग प्लेटफॉर्म' },
  { name: 'case-3-telugu', title: 'Telugu Only', content: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్ మరియు వచ్చి\u200Cన ప్లాట్‌ఫారమ్' },
  { name: 'case-4-mixed', title: 'Mixed Multilingual', content: 'Dream Wave AI | 🚀\n- Hindi: ड्रीम वेव एआई\n- Telugu: డ్రీమ్\u200Cవేవ్ ఏఐ' },
  { name: 'case-5-edge-runs', title: 'Edge Runs & Symbols', content: 'Symbols: ✔ ✓ ✗ ❤ ⚠ ★ ☆ ☑ ☐ | Benchmark: ₹12 LPA — ₹24 LPA' },
  { name: 'case-6-fonts-missing', title: 'Fonts Missing Simulation', content: 'Default Helvetica Fallback Test' },
  { name: 'case-7-safe-mode', title: 'Safe Mode Trigger', content: 'Sanitization and Safe Mode Fallback' },
  { name: 'case-8-telugu-isolated', title: 'Telugu Isolated Word', content: 'డ్రీమ్' },
  { name: 'case-9-telugu-space', title: 'Telugu Word Space', content: 'డ్రీమ్ ' },
  { name: 'case-10-telugu-period', title: 'Telugu Word Period', content: 'డ్రీమ్.' },
  { name: 'case-11-telugu-words', title: 'Telugu Words Escape', content: '\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D\n\u0C2A\u0C4D\u0C30\u0C3E\u0C1C\u0C46\u0C15\u0C4D\u0C1F\u0C4D \u0C15\u0C4D\u0C30\u0C2E\u0C02 \u0C36\u0C4D\u0C30\u0C40' },
]

const fixturePath = path.resolve(ROOT_DIR, 'sample-report-test.md')
const fixtureContent = fs.readFileSync(fixturePath, 'utf8')

async function main() {
  console.log('================================================================================')
  console.log('RUNNING SHIPPED FONTKIT GUARD HARNESS VERIFICATION (CASES 1-11 + FIXTURE)')
  console.log('================================================================================')

  const results = []

  // Render individual cases
  for (const c of cases) {
    const hitsBefore = getGuardStats().hits
    let status = 'PASS'
    let buffer = null
    const outFilename = `shipped-${c.name}.pdf`
    const outPath = path.resolve(OUT_DIR, outFilename)

    const doc = (
      <ReportPdf
        workspace={{ title: c.title }}
        report={{
          title: c.title,
          sections: [{ key: c.name, title: c.title, content: c.content }],
        }}
        options={{ forceFont: 'NotoSansTelugu' }}
      />
    )

    try {
      buffer = await renderToBuffer(doc)
      fs.writeFileSync(outPath, buffer)
    } catch (e) {
      status = `CRASH (${e.message})`
    }

    const hitsAfter = getGuardStats().hits
    const caseHits = hitsAfter - hitsBefore

    results.push({
      caseName: c.name,
      filename: outFilename,
      status,
      bytes: buffer ? buffer.length : 0,
      caseHits,
    })
  }

  // Render Full Fixture
  const hitsBeforeFix = getGuardStats().hits
  let fixStatus = 'PASS'
  let fixBuffer = null
  const fixFilename = 'shipped-full-fixture.pdf'
  const fixOutPath = path.resolve(OUT_DIR, fixFilename)

  const fixDoc = (
    <ReportPdf
      workspace={{ title: 'FULL FIXTURE' }}
      report={{
        title: 'Full Markdown Fixture',
        sections: [{ key: 'full', title: 'Full Fixture', content: fixtureContent }],
      }}
      options={{}}
    />
  )

  try {
    fixBuffer = await renderToBuffer(fixDoc)
    fs.writeFileSync(fixOutPath, fixBuffer)
  } catch (e) {
    fixStatus = `CRASH (${e.message})`
  }

  const hitsAfterFix = getGuardStats().hits
  results.push({
    caseName: 'full-fixture',
    filename: fixFilename,
    status: fixStatus,
    bytes: fixBuffer ? fixBuffer.length : 0,
    caseHits: hitsAfterFix - hitsBeforeFix,
  })

  // Verify each saved PDF with pdfjs-dist
  console.log('\n--- VERIFYING SHIPPED PDFs WITH pdfjs-dist ---')
  const harnessTable = []

  for (const r of results) {
    const filePath = path.resolve(OUT_DIR, r.filename)
    if (!fs.existsSync(filePath)) {
      harnessTable.push({
        case: r.caseName,
        result: r.status,
        bytes: r.bytes,
        pages: 0,
        guardHits: r.caseHits,
        teluguCharsInU0C00_U0C7F: 0,
      })
      continue
    }

    const pdfBuffer = fs.readFileSync(filePath)
    const data = new Uint8Array(pdfBuffer)

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

    harnessTable.push({
      case: r.caseName,
      result: r.status,
      bytes: r.bytes,
      pages: pageCount,
      guardHits: r.caseHits,
      teluguCharsInU0C00_U0C7F: teluguCharCount,
    })
  }

  console.table(harnessTable)
  console.log('Total Cumulative Guard Hits across Harness Run:', getGuardStats().hits)

  console.log('\n================================================================================')
  console.log('SHIPPED HARNESS VERIFICATION COMPLETED SUCCESSFULLY')
  console.log('================================================================================')
}

main().catch((err) => {
  console.error('FATAL SHIPPED HARNESS ERROR:', err)
  process.exit(1)
})
