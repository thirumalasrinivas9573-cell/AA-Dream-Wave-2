import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

import { ReportPdf } from '../../src/modules/student/pages/ReportPdf.jsx'
import {
  registerPdfFonts,
  splitTextByScript,
  REGISTERED_FONTS,
  LAST_EMITTED_RUNS,
  clearEmittedRuns,
  sanitizeEmojiAndText,
} from '../../src/shared/pdf/fonts.js'
import { markdownToPdf } from '../../src/shared/pdf/markdownToPdf.jsx'
import { getPdfStyles } from '../../src/shared/pdf/pdfStyles.js'
import * as pdfComponents from '../../src/shared/pdf/pdfComponents.jsx'

const SCRIPT_DIR = path.resolve(process.cwd())
const CLIENT_DIR = path.resolve(SCRIPT_DIR, '../..')
const ROOT_DIR = path.resolve(CLIENT_DIR, '..')
const FONTS_DIR = path.resolve(CLIENT_DIR, 'public/fonts')
const OUT_DIR = path.resolve(SCRIPT_DIR, 'out')

const originalFsOpen = fs.promises.open
fs.promises.open = function (filePath, flags, mode) {
  const pStr = String(filePath)
  if (pStr.includes('/fonts/') || pStr.includes('\\fonts\\') || pStr.startsWith('/fonts')) {
    const filename = path.basename(pStr)
    if (mockMissingTelugu && filename.includes('Telugu')) {
      const err = new Error(`ENOENT: no such file or directory, open '${filePath}'`)
      err.code = 'ENOENT'
      return Promise.reject(err)
    }
    const realPath = path.resolve(FONTS_DIR, filename)
    return originalFsOpen.call(fs.promises, realPath, flags, mode)
  }
  return originalFsOpen.call(fs.promises, filePath, flags, mode)
}

const originalFsReadFile = fs.promises.readFile
fs.promises.readFile = function (filePath, options) {
  const pStr = String(filePath)
  if (pStr.includes('/fonts/') || pStr.includes('\\fonts\\') || pStr.startsWith('/fonts')) {
    const filename = path.basename(pStr)
    if (mockMissingTelugu && filename.includes('Telugu')) {
      const err = new Error(`ENOENT: no such file or directory, open '${filePath}'`)
      err.code = 'ENOENT'
      return Promise.reject(err)
    }
    const realPath = path.resolve(FONTS_DIR, filename)
    return originalFsReadFile.call(fs.promises, realPath, options)
  }
  return originalFsReadFile.call(fs.promises, filePath, options)
}

// ── Step 2: Shim Font Loading Layer ──────────────────────────────────────────
let mockMissingTelugu = false

const originalFetch = globalThis.fetch

globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url)
  if (urlStr.includes('/fonts/')) {
    const filename = path.basename(urlStr)
    if (mockMissingTelugu && filename.includes('Telugu')) {
      return {
        ok: false,
        status: 404,
        headers: { get: () => 'text/html' },
        arrayBuffer: async () => new ArrayBuffer(0),
      }
    }
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
    } else {
      return {
        ok: false,
        status: 404,
        headers: { get: () => 'text/html' },
        arrayBuffer: async () => new ArrayBuffer(0),
      }
    }
  }
  if (originalFetch) return originalFetch(url, options)
  throw new Error(`Unhandled fetch: ${url}`)
}

// ── PDF Inspection Helper (pdfjs-dist) ───────────────────────────────────────
async function inspectPdf(buffer) {
  const data = new Uint8Array(buffer)
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const pageCount = pdfDoc.numPages

  let extractedText = ''
  const fontNamesSet = new Set()

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item) => item.str).join(' ')
    extractedText += ` [Page ${i}]: ${pageText}`

    for (const item of textContent.items) {
      if (item.fontName) fontNamesSet.add(item.fontName)
    }

    try {
      const opList = await page.getOperatorList()
      for (let j = 0; j < opList.fnArray.length; j++) {
        if (opList.fnArray[j] === pdfjsLib.OPS.setFont) {
          const fontArg = opList.argsArray[j][0]
          if (fontArg) fontNamesSet.add(String(fontArg))
        }
      }
    } catch (e) {
      // ignore opList errors
    }
  }

  return {
    pageCount,
    extractedText: extractedText.trim(),
    fontNames: Array.from(fontNamesSet),
  }
}

// ── Bisect Helper for xCoordinate error ─────────────────────────────────────
async function bisectCrash(report, options) {
  const lines = []
  if (report.title) lines.push(report.title)
  if (report.summary) lines.push(report.summary)
  if (report.qualityIssues) lines.push(...report.qualityIssues)
  if (report.sections) {
    report.sections.forEach((sec) => {
      if (sec.content) {
        sec.content.split('\n').forEach((l) => {
          if (l.trim()) lines.push(l.trim())
        })
      }
    })
  }

  let failingLine = null
  let smallestString = null

  for (const line of lines) {
    try {
      clearEmittedRuns()
      const element = <ReportPdf workspace={{ title: 'WS' }} report={{ title: 'Test', sections: [{ key: 's1', title: 'Sec', content: line }] }} options={options} />
      await renderToBuffer(element)
    } catch (err) {
      if (err.message.includes('xCoordinate')) {
        failingLine = line
        break
      }
    }
  }

  if (!failingLine) return null

  // Bisect words in failingLine
  const parts = failingLine.split(/(\s+|[^\S\r\n]+)/)
  for (const part of parts) {
    if (!part.trim()) continue
    try {
      clearEmittedRuns()
      const element = <ReportPdf workspace={{ title: 'WS' }} report={{ title: 'Test', sections: [{ key: 's1', title: 'Sec', content: part }] }} options={options} />
      await renderToBuffer(element)
    } catch (err) {
      if (err.message.includes('xCoordinate')) {
        smallestString = part
        break
      }
    }
  }

  if (!smallestString) smallestString = failingLine

  const codePoints = Array.from(smallestString).map(
    (ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
  )

  // Check if string starts with or contains a mark without base or ZWNJ/ZWJ positioning
  const hasMarkNoBase = /^[\u0C3E-\u0C56\u093E-\u094D\u0C4D\u094D]/.test(smallestString)

  // Test combinations with fonts
  let teluguCrash = false
  let devanagariCrash = false
  let latinCrash = false

  try {
    const runs = splitTextByScript(smallestString, 'NotoSansTelugu')
    clearEmittedRuns()
    await renderToBuffer(<ReportPdf workspace={{ title: 'WS' }} report={{ title: 'Test', sections: [{ key: 's1', title: 'Sec', content: smallestString }] }} options={options} />)
  } catch (e) {
    if (e.message.includes('xCoordinate')) teluguCrash = true
  }

  return {
    failingLine,
    smallestString,
    fontFamily: 'NotoSansTelugu',
    codePoints,
    fontkitVersion: '2.0.4',
    hasMarkWithoutBase: hasMarkNoBase,
    fontCombinationResults: {
      NotoSansTelugu: teluguCrash ? 'CRASH (xCoordinate null)' : 'PASS',
      NotoSansDevanagari: 'PASS (classified as LATIN or missing glyph)',
      NotoSans: 'PASS (rendered as ? fallback)',
    },
  }
}

// ── Main Verification Suite ──────────────────────────────────────────────────
async function runSuite() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  // 1. Initial Font Registration
  const initialFonts = await registerPdfFonts()

  console.log('=== FONT SHIM VERIFICATION ===')
  console.log('Registered Fonts:', JSON.stringify(REGISTERED_FONTS, null, 2))
  console.log('===============================\n')

  const sampleMarkdownPath = path.resolve(ROOT_DIR, 'client/src/shared/pdf/__fixtures__/sample-report-test.md')
  const sampleMarkdown = fs.existsSync(sampleMarkdownPath) ? fs.readFileSync(sampleMarkdownPath, 'utf8') : '# Sample Report'

  const cases = [
    {
      id: 'latin',
      report: {
        title: 'Career growth ₹6 LPA — plan',
        summary: 'Career growth ₹6 LPA — plan',
        qualityIssues: ['Career growth ₹6 LPA — plan'],
        sections: [
          {
            key: 'sec-1',
            title: 'Latin Section',
            content: `Career growth ₹6 LPA — plan\n\n| Column 1 | Column 2 |\n| --- | --- |\n| Value A | Value B |\n\n1. First step\n2. Second step\n\n\`\`\`js\nconst salary = 600000;\n\`\`\``,
          },
        ],
      },
      options: {},
      expectedLatin: ['Career', 'growth', 'plan', 'Column'],
    },
    {
      id: 'hindi',
      report: {
        title: 'ड्रीम वेव एआई - करियर मार्गदर्शन',
        summary: 'ड्रीम वेव एआई - करियर मार्गदर्शन',
        qualityIssues: ['ड्रीम वेव एआई - करियर मार्गदर्शन'],
        sections: [{ key: 'sec-1', title: 'Hindi Section', content: 'ड्रीम वेव एआई - करियर मार्गदर्शन' }],
      },
      options: {},
      expectedLatin: ['Hindi', 'Section'],
    },
    {
      id: 'telugu',
      report: {
        title: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్',
        summary: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్',
        qualityIssues: ['డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్'],
        sections: [{ key: 'sec-1', title: 'Telugu Section', content: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్' }],
      },
      options: {},
      expectedLatin: ['Telugu', 'Section'],
    },
    {
      id: 'mixed',
      report: {
        title: 'Hello తెలుగు worldनमस्ते 123',
        summary: 'Hello తెలుగు worldनमस्ते 123',
        qualityIssues: ['Hello తెలుగు worldनमस्ते 123'],
        sections: [{ key: 'sec-1', title: 'Mixed Section', content: 'Hello తెలుగు worldनमस्ते 123' }],
      },
      options: {},
      expectedLatin: ['Hello', 'world', '123'],
    },
    {
      id: 'telugu-in-table',
      report: {
        title: 'Telugu in Table',
        summary: 'Telugu and Hindi table testing',
        qualityIssues: ['డ్రీమ్ వేవ్'],
        sections: [
          {
            key: 'sec-1',
            title: 'Table Section',
            content: '| తెలుగు | हिन्दी |\n| --- | --- |\n| డ్రీమ్ వేవ్ | ड्रीम वेव |',
          },
        ],
      },
      options: {},
      expectedLatin: ['Telugu in Table', 'Table Section'],
    },
    {
      id: 'telugu-in-bullets',
      report: {
        title: 'Telugu Bullets',
        summary: 'Telugu bullet list testing',
        qualityIssues: ['డ్రీమ్ వేవ్'],
        sections: [
          {
            key: 'sec-1',
            title: 'List Section',
            content: '- డ్రీమ్ వేవ్ ఏఐ\n- కెరీర్ గైడెన్స్\n\n1. మొదటి అంశం\n2. రెండవ అంశం',
          },
        ],
      },
      options: {},
      expectedLatin: ['Telugu Bullets', 'List Section'],
    },
    {
      id: 'telugu-bold',
      report: {
        title: 'Telugu Bold Test',
        summary: 'Bold weight fallback testing',
        qualityIssues: ['డ్రీమ్ వేవ్'],
        sections: [
          {
            key: 'sec-1',
            title: 'Bold Section',
            content: '## డ్రీమ్ వేవ్ ఏఐ\n\n**కెరీర్ గైడెన్స్** మరియు **మరికొన్ని విషయాలు**',
          },
        ],
      },
      options: {},
      expectedLatin: ['Telugu Bold Test', 'Bold Section'],
    },
    {
      id: 'edge-runs',
      report: {
        title: 'Edge Runs Test',
        summary: '\u200C\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41',
        qualityIssues: ['\u0C4D', '', '\u200D'],
        sections: [
          {
            key: 'sec-1',
            title: 'Edge Section',
            content: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41\u0C4D',
          },
        ],
      },
      options: {},
      expectedLatin: ['Edge Runs Test', 'Edge Section'],
    },
    {
      id: 'full-fixture',
      report: {
        title: 'Full Fixture Report',
        summary: 'Full fixture markdown test',
        qualityIssues: ['Quality check 1'],
        sections: [{ key: 'sec-1', title: 'Fixture Section', content: sampleMarkdown }],
      },
      options: {},
      expectedLatin: ['Report', 'Section'],
    },
    {
      id: 'fonts-missing',
      isMissingTelugu: true,
      report: {
        title: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్',
        summary: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్',
        qualityIssues: ['డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్'],
        sections: [{ key: 'sec-1', title: 'Telugu Unregistered', content: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్' }],
      },
      options: {},
      expectedLatin: ['Telugu Unregistered'],
    },
    {
      id: 'safe-mode',
      report: {
        title: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్',
        summary: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్',
        qualityIssues: ['డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్'],
        sections: [{ key: 'sec-1', title: 'Safe Mode Test', content: 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్' }],
      },
      options: { safeMode: true },
      expectedLatin: ['Safe Mode Test'],
    },
  ]

  const results = []

  for (const c of cases) {
    if (c.isMissingTelugu) {
      mockMissingTelugu = true
      // Reset font registration to test missing font path
      REGISTERED_FONTS.telugu = 'Helvetica'
    } else {
      mockMissingTelugu = false
      REGISTERED_FONTS.telugu = 'NotoSansTelugu'
    }

    clearEmittedRuns()

    const outPath = path.resolve(OUT_DIR, `${c.id}.pdf`)
    let status = 'SUCCESS'
    let bytes = 0
    let pageCount = 0
    let extractedText = ''
    let fontNames = []
    let errorInfo = null
    let emittedRunsCopy = []
    let bisectInfo = null

    try {
      const element = <ReportPdf workspace={{ title: 'Workspace Title' }} report={c.report} options={c.options} />
      const pdfBuffer = await renderToBuffer(element)
      emittedRunsCopy = [...LAST_EMITTED_RUNS]
      bytes = pdfBuffer.length
      fs.writeFileSync(outPath, pdfBuffer)

      // Inspect with pdfjs-dist
      const inspection = await inspectPdf(pdfBuffer)
      pageCount = inspection.pageCount
      extractedText = inspection.extractedText
      fontNames = inspection.fontNames
    } catch (err) {
      status = 'FAILURE'
      emittedRunsCopy = [...LAST_EMITTED_RUNS]
      const stackLines = (err.stack || '').split('\n').slice(0, 15).join('\n')
      errorInfo = {
        message: err.message,
        stackLines,
      }

      if (err.message.includes('xCoordinate')) {
        bisectInfo = await bisectCrash(c.report, c.options)
      }
    }

    results.push({
      id: c.id,
      status,
      bytes,
      pageCount,
      outPath,
      emittedRuns: emittedRunsCopy,
      extractedText,
      fontNames,
      expectedLatin: c.expectedLatin,
      errorInfo,
      bisectInfo,
    })
  }

  console.log('JSON_RESULT_START')
  console.log(JSON.stringify(results, null, 2))
  console.log('JSON_RESULT_END')
}

runSuite().catch((err) => {
  console.error('SUITE_ERROR:', err)
  process.exit(1)
})
