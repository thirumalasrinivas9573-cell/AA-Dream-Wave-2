import React from 'react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { renderToBuffer } from '@react-pdf/renderer'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

import { RoadmapPdf } from '../../src/modules/student/pages/RoadmapPdf.jsx'
import { registerPdfFonts } from '../../src/shared/pdf/fonts.js'
import { installFontkitGuard, getGuardStats } from '../../src/shared/pdf/fontkitGuard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(__dirname, '../..')
const FONTS_DIR = path.resolve(CLIENT_DIR, 'public/fonts')
const OUT_DIR = path.resolve(__dirname, 'out')
const CLIENT_OUT_DIR = path.resolve(CLIENT_DIR, 'out')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
if (!fs.existsSync(CLIENT_OUT_DIR)) fs.mkdirSync(CLIENT_OUT_DIR, { recursive: true })

// Hook file system access for font resolution in Node
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

// Install the shipped fontkit guard
const teluguFontPath = path.resolve(FONTS_DIR, 'NotoSansTelugu-Regular.ttf')
const teluguFontBuffer = fs.readFileSync(teluguFontPath)
await installFontkitGuard({ fontData: teluguFontBuffer })

const teluguRaVattuWord = '\u0C2A\u0C4D\u0C30\u0C3E\u0C1C\u0C46\u0C15\u0C4D\u0C1F\u0C4D' // ప్రాజెక్ట్

const testGoal = {
  _id: 'goal-telugu-101',
  title: `వెబ్ డెవలప్‌మెంట్ ${teluguRaVattuWord} రోడ్‌మ్యాప్`,
  category: 'Technical Skill',
  priority: 'High',
  progress: 45,
  isPrimary: true,
  description: 'లర్నింగ్ జర్నీ మరియు కెరీర్ గ్రోత్ కోసం ఆర్కిటెక్చర్.',
  deadline: '2026-12-31',
}

const testRoadmap = {
  _id: 'roadmap-fixture-101',
  title: `వెబ్ ఆర్కిటెక్చర్ ${teluguRaVattuWord}`,
  isPrimary: true,
  status: 'active',
  progress: { percent: 45 },
  learningStages: [
    {
      order: 1,
      title: `ఫ్రంట్‌ఎండ్ బేసిక్స్ మరియు ${teluguRaVattuWord} ప్రణాళిక`,
      description: 'ఈ దశలో HTML, CSS మరియు ప్రాథమిక భావనలు నేర్చుకుంటారు.',
      status: 'completed',
      progress: 100,
      skills: ['HTML5', 'CSS3', 'JavaScript'],
    },
    {
      order: 2,
      title: `రియాక్ట్ అడ్వాన్స్‌డ్ ${teluguRaVattuWord} నిర్మాణం`,
      description: 'यह एक व्यापक रोडमैप विवरण है जिसमें सभी चरण और योजनाएं शामिल हैं।',
      status: 'in-progress',
      progress: 60,
      skills: ['React', 'State Management'],
    },
    {
      order: 3,
      title: `సిస్టమ్ టెస్టింగ్ మరియు డిప్లాయ్‌మెంట్ ${teluguRaVattuWord}`,
      description: '', // stage with no description
      status: 'available',
      progress: 0,
      skills: ['Docker', 'CI/CD'],
    },
  ],
  weeklyPlans: [], // empty weeklyPlans
  practiceProjects: [
    {
      title: `డ్రీమ్‌వేవ్ పోర్ట్‌ఫోలియో ${teluguRaVattuWord}`,
      description: 'పూర్తి స్థాయి అప్లికేషన్ నిర్మాణం.',
      skills: ['React', 'Node.js'],
      status: 'in-progress',
    },
    {
      title: 'Project Without Skills',
      description: 'Testing edge case where skills array is empty or undefined.',
      skills: [], // project without skills
      status: 'planned',
    },
  ],
}

async function main() {
  console.log('================================================================================')
  console.log('RUNNING ROADMAP PDF VERIFICATION HARNESS')
  console.log('================================================================================')

  const hitsBefore = getGuardStats().hits
  let status = 'PASS'
  let buffer = null
  const outPath = path.resolve(OUT_DIR, 'roadmap-fixture.pdf')
  const clientOutPath = path.resolve(CLIENT_OUT_DIR, 'roadmap-fixture.pdf')

  const doc = <RoadmapPdf roadmap={testRoadmap} goal={testGoal} options={{}} />

  try {
    buffer = await renderToBuffer(doc)
    fs.writeFileSync(outPath, buffer)
    fs.writeFileSync(clientOutPath, buffer)
  } catch (err) {
    status = `CRASH (${err.message})`
  }

  const hitsAfter = getGuardStats().hits
  const guardHits = hitsAfter - hitsBefore

  let pageCount = 0
  let textContentStr = ''
  let teluguCharCount = 0

  if (buffer) {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
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
    } catch (err) {
      textContentStr = `ERROR: ${err.message}`
    }
  }

  const summary = {
    case: 'roadmap-fixture',
    result: status,
    bytes: buffer ? buffer.length : 0,
    pages: pageCount,
    guardHits: guardHits,
    textLength: textContentStr.length,
    teluguCharsInU0C00_U0C7F: teluguCharCount,
  }

  console.log('\n--- ROADMAP PDF VERIFICATION RESULT ---')
  console.table([summary])

  console.log('Result:', summary.result)
  console.log('Bytes:', summary.bytes)
  console.log('Pages:', summary.pages)
  console.log('Guard Hits:', summary.guardHits)
  console.log('pdfjs-extracted Text Length:', summary.textLength)
  console.log('Characters in U+0C00..U+0C7F (Telugu):', summary.teluguCharsInU0C00_U0C7F)
  console.log('Saved to:', outPath)
  console.log('Also saved to:', clientOutPath)
  console.log('================================================================================')

  if (status !== 'PASS') {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('FATAL ROADMAP HARNESS ERROR:', err)
  process.exit(1)
})
