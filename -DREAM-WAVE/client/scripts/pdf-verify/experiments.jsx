import React from 'react'
import { renderToBuffer, Document, Page, Text, Font } from '@react-pdf/renderer'
import * as fontkit from 'fontkit'
import fs from 'fs'
import path from 'path'

import { ReportPdf } from '../../src/modules/student/pages/ReportPdf.jsx'
import {
  registerPdfFonts,
  splitTextByScript,
  REGISTERED_FONTS,
  LAST_EMITTED_RUNS,
  clearEmittedRuns,
} from '../../src/shared/pdf/fonts.js'
import { markdownToPdf } from '../../src/shared/pdf/markdownToPdf.jsx'

const SCRIPT_DIR = path.resolve(process.cwd())
const CLIENT_DIR = path.resolve(SCRIPT_DIR, '../..')
const ROOT_DIR = path.resolve(CLIENT_DIR, '..')
const FONTS_DIR = path.resolve(CLIENT_DIR, 'public/fonts')
const OUT_DIR = path.resolve(SCRIPT_DIR, 'out')

// ── Setup FS / Font Loading Shim ─────────────────────────────────────────────
const originalFsOpen = fs.promises.open
fs.promises.open = function (filePath, flags, mode) {
  const pStr = String(filePath)
  if (pStr.includes('/fonts/') || pStr.includes('\\fonts\\') || pStr.startsWith('/fonts')) {
    const filename = path.basename(pStr)
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
    const realPath = path.resolve(FONTS_DIR, filename)
    return originalFsReadFile.call(fs.promises, realPath, options)
  }
  return originalFsReadFile.call(fs.promises, filePath, options)
}

globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url)
  if (urlStr.includes('/fonts/')) {
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
    } else {
      return {
        ok: false,
        status: 404,
        headers: { get: () => 'text/html' },
        arrayBuffer: async () => new ArrayBuffer(0),
      }
    }
  }
  if (globalThis.__originalFetch) return globalThis.__originalFetch(url, options)
  throw new Error(`Unhandled fetch: ${url}`)
}

function toCodePoints(str) {
  return Array.from(String(str)).map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
}

// ── EXPERIMENT 1 ─────────────────────────────────────────────────────────────
async function runExperiment1(fkTeluguFont) {
  console.log('\n========================================')
  console.log('EXPERIMENT 1: RESOLVING THE CONTRADICTION')
  console.log('========================================')

  const case3Str = 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్'
  const fixtureStr = 'డ్రీమ్ వేవ్ ఏఐ - కెరీర్ గైడెన్స్ మరియు వచ్చి‌న ప్లాట్‌ఫారమ్'

  console.log('\na. Code Point Comparison:')
  console.log('Case 3 full string:', case3Str)
  console.log('Case 3 code points:', toCodePoints(case3Str).join(' '))
  console.log('\nFixture Telugu line:', fixtureStr)
  console.log('Fixture Telugu line code points:', toCodePoints(fixtureStr).join(' '))

  const case3Word = 'డ్రీమ్'
  const fixtureWord = 'డ్రీమ్'
  console.log('\nComparing "డ్రీమ్" in Case 3 vs Fixture:')
  console.log('Case 3 "డ్రీమ్" code points:   ', toCodePoints(case3Word).join(' '))
  console.log('Fixture "డ్రీమ్" code points:  ', toCodePoints(fixtureWord).join(' '))
  console.log('Are code point lists identical?', JSON.stringify(toCodePoints(case3Word)) === JSON.stringify(toCodePoints(fixtureWord)))

  const exp1bStrings = [
    'డ్రీమ్',
    'డ్రీమ్ ',
    'డ్రీమ్.',
    'డ్రీమ్ వేవ్',
    'వేవ్',
    'ఏఐ',
    'కెరీర్',
    'గైడెన్స్',
    'గైడెన్స్ ',
    'ప్లాట్\u200Cఫారమ్',
    'ప్లాట్\u200Cఫారమ్ ',
    'లెర్నింగ్',
    'మరియు',
  ]

  const exp1Table = []

  for (const s of exp1bStrings) {
    const cps = toCodePoints(s).join(' ')
    let fontkitRes = 'PASS'
    try {
      fkTeluguFont.layout(s)
    } catch (e) {
      fontkitRes = `CRASH (${e.message})`
    }

    let reactPdfRes = 'PASS'
    try {
      clearEmittedRuns()
      const doc = (
        <Document>
          <Page size="A4">
            <Text style={{ fontFamily: 'NotoSansTelugu' }}>{s}</Text>
          </Page>
        </Document>
      )
      await renderToBuffer(doc)
    } catch (e) {
      reactPdfRes = `CRASH (${e.message})`
    }

    exp1Table.push({
      string: s,
      codePoints: cps,
      fontkitResult: fontkitRes,
      reactPdfResult: reactPdfRes,
    })
  }

  console.log('\nb & c. Experiment 1b & 1c Table (Direct Fontkit vs Direct React-PDF Forced NotoSansTelugu):')
  console.table(exp1Table)

  console.log('\nd. Full Fixture Line-By-Line Breakdown:')
  const fixturePath = path.resolve(ROOT_DIR, 'client/src/shared/pdf/__fixtures__/sample-report-test.md')
  const fixtureContent = fs.readFileSync(fixturePath, 'utf8')
  const fixtureLines = fixtureContent.split('\n')

  const lineResults = []

  for (let idx = 0; idx < fixtureLines.length; idx++) {
    const line = fixtureLines[idx]
    if (!line.trim()) continue

    clearEmittedRuns()
    let status = 'PASS'
    let errorMsg = ''
    let runs = []

    try {
      const doc = (
        <ReportPdf
          workspace={{ title: 'WS' }}
          report={{
            title: 'Test',
            sections: [{ key: `line-${idx}`, title: `Line ${idx + 1}`, content: line }],
          }}
          options={{}}
        />
      )
      await renderToBuffer(doc)
      runs = [...LAST_EMITTED_RUNS]
    } catch (e) {
      status = 'CRASH'
      errorMsg = e.message
      runs = [...LAST_EMITTED_RUNS]
    }

    if (status === 'CRASH') {
      console.log(`\n❌ Line ${idx + 1} CRASHED: "${line}"`)
      console.log('Error:', errorMsg)
      console.log('Emitted Runs:', JSON.stringify(runs, null, 2))
    }

    lineResults.push({ lineIndex: idx + 1, line, status, errorMsg, runs })
  }

  return { exp1Table, lineResults }
}

// ── EXPERIMENT 2 ─────────────────────────────────────────────────────────────
function runExperiment2(fkTeluguFont, fkDevanagariFont) {
  console.log('\n========================================')
  console.log('EXPERIMENT 2: SYSTEMATIC SWEEP FOR CRASH RULE')
  console.log('========================================')

  const teluguConsonants = []
  for (let code = 0x0c15; code <= 0x0c39; code++) {
    teluguConsonants.push(String.fromCodePoint(code))
  }
  const teluguC2List = ['\u0C30', '\u0C2E', '\u0C35', '\u0C24', '\u0C28', '\u0C2A', '\u0C32', '\u0C15', '\u0C1A', '\u0C21']
  const teluguVowels = ['']
  for (let code = 0x0c3e; code <= 0x0c4c; code++) {
    teluguVowels.push(String.fromCodePoint(code))
  }
  const suffixes = ['', ' ', '.', '\u200C']

  let teluguTotal = 0
  let teluguCrashes = 0
  const teluguCrashExamples = []

  for (const c1 of teluguConsonants) {
    for (const c2 of teluguC2List) {
      const bases = [c1, `${c1}\u0C4D`, `${c1}\u0C4D${c2}`, `${c1}\u0C4D${c2}\u0C4D`]
      for (const base of bases) {
        for (const vow of teluguVowels) {
          for (const suf of suffixes) {
            const testStr = `${base}${vow}${suf}`
            teluguTotal++
            try {
              fkTeluguFont.layout(testStr)
            } catch (e) {
              teluguCrashes++
              if (teluguCrashExamples.length < 20) {
                teluguCrashExamples.push({
                  str: testStr,
                  codePoints: toCodePoints(testStr).join(' '),
                  error: e.message,
                })
              }
            }
          }
        }
      }
    }
  }

  console.log(`\nTelugu Sweep Summary: Total Tested: ${teluguTotal}, Crashes: ${teluguCrashes}`)

  // Devanagari Sweep
  const devConsonants = []
  for (let code = 0x0915; code <= 0x0939; code++) {
    devConsonants.push(String.fromCodePoint(code))
  }
  const devC2List = ['\u0930', '\u092E', '\u0935', '\u0924', '\u0928', '\u092A', '\u0932', '\u0915']
  const devVowels = ['']
  for (let code = 0x093e; code <= 0x094c; code++) {
    devVowels.push(String.fromCodePoint(code))
  }

  let devTotal = 0
  let devCrashes = 0
  const devCrashExamples = []

  for (const c1 of devConsonants) {
    for (const c2 of devC2List) {
      const bases = [c1, `${c1}\u094D`, `${c1}\u094D${c2}`, `${c1}\u094D${c2}\u094D`]
      for (const b of bases) {
        for (const vow of devVowels) {
          for (const suf of suffixes) {
            const testStr = `${b}${vow}${suf}`
            devTotal++
            try {
              fkDevanagariFont.layout(testStr)
            } catch (e) {
              devCrashes++
              if (devCrashExamples.length < 20) {
                devCrashExamples.push({
                  str: testStr,
                  codePoints: toCodePoints(testStr).join(' '),
                  error: e.message,
                })
              }
            }
          }
        }
      }
    }
  }

  console.log(`Devanagari Sweep Summary: Total Tested: ${devTotal}, Crashes: ${devCrashes}`)

  return {
    teluguTotal,
    teluguCrashes,
    teluguCrashExamples,
    devTotal,
    devCrashes,
    devCrashExamples,
  }
}

// ── EXPERIMENT 3 ─────────────────────────────────────────────────────────────
function runExperiment3(exp1bStrings) {
  console.log('\n========================================')
  console.log('EXPERIMENT 3: OTHER FONTS DIAGNOSIS')
  console.log('========================================')

  const nirmalaPath = 'C:\\Windows\\Fonts\\Nirmala.ttc'
  let nirmalaExists = fs.existsSync(nirmalaPath)
  let nirmalaCrashes = 0
  let nirmalaTested = 0

  if (nirmalaExists) {
    try {
      const collection = fontkit.openSync(nirmalaPath)
      const fonts = collection.fonts || [collection]
      console.log(`Found Nirmala.ttc containing ${fonts.length} font face(s).`)

      for (const s of exp1bStrings) {
        nirmalaTested++
        try {
          fonts[0].layout(s)
        } catch (e) {
          nirmalaCrashes++
        }
      }
    } catch (e) {
      console.log('Failed to layout with Nirmala.ttc:', e.message)
    }
  } else {
    console.log('Nirmala.ttc not found.')
  }

  console.log(`System Nirmala.ttc tested ${nirmalaTested} strings, crashes: ${nirmalaCrashes}`)

  return {
    nirmalaPath,
    nirmalaExists,
    nirmalaTested,
    nirmalaCrashes,
  }
}

// ── EXPERIMENT 4 ─────────────────────────────────────────────────────────────
async function runExperiment4(fkTeluguFont, exp1bStrings) {
  console.log('\n========================================')
  console.log('EXPERIMENT 4: NULL-SAFE getAnchor MONKEYPATCH')
  console.log('========================================')

  // Force layout engine initialization
  try { fkTeluguFont.layout('వేవ్') } catch (e) {}

  let patchHits = 0
  const gpos = fkTeluguFont._layoutEngine && fkTeluguFont._layoutEngine.gposProcessor
  if (gpos) {
    const GPOSProto = Object.getPrototypeOf(gpos)
    const origGetAnchor = GPOSProto.getAnchor
    GPOSProto.getAnchor = function (glyph, markIndex, baseIndex) {
      const res = origGetAnchor.call(this, glyph, markIndex, baseIndex)
      if (!res) {
        patchHits++
        return { x: 0, y: 0 }
      }
      return res
    }
    console.log('Monkeypatched GPOSProcessor.prototype.getAnchor successfully!')
  } else {
    console.log('gposProcessor missing on layoutEngine!')
  }

  let exp1bCrashesAfterPatch = 0
  for (const s of exp1bStrings) {
    try {
      fkTeluguFont.layout(s)
    } catch (e) {
      exp1bCrashesAfterPatch++
    }
  }

  console.log(`Exp 1b strings crash count after patch: ${exp1bCrashesAfterPatch} (Patch Interceptions: ${patchHits})`)

  // Render telugu-patched.pdf and full-fixture-patched.pdf
  const case3Str = 'డ్రీమ్\u200Cవేవ్ ఏఐ - కెరీర్ గైడెన్స్'
  const teluguDoc = (
    <ReportPdf
      workspace={{ title: 'Workspace Title' }}
      report={{
        title: case3Str,
        summary: case3Str,
        qualityIssues: [case3Str],
        sections: [{ key: 'sec-1', title: 'Telugu Section', content: case3Str }],
      }}
      options={{}}
    />
  )
  const teluguBuf = await renderToBuffer(teluguDoc)
  const teluguPatchedPath = path.resolve(OUT_DIR, 'telugu-patched.pdf')
  fs.writeFileSync(teluguPatchedPath, teluguBuf)

  const fixturePath = path.resolve(ROOT_DIR, 'client/src/shared/pdf/__fixtures__/sample-report-test.md')
  const sampleMarkdown = fs.readFileSync(fixturePath, 'utf8')
  const fixtureDoc = (
    <ReportPdf
      workspace={{ title: 'Workspace Title' }}
      report={{
        title: 'Full Fixture Report Patched',
        summary: 'Patched test',
        qualityIssues: ['Quality check 1'],
        sections: [{ key: 'sec-1', title: 'Fixture Section', content: sampleMarkdown }],
      }}
      options={{}}
    />
  )
  const fixtureBuf = await renderToBuffer(fixtureDoc)
  const fixturePatchedPath = path.resolve(OUT_DIR, 'full-fixture-patched.pdf')
  fs.writeFileSync(fixturePatchedPath, fixtureBuf)

  console.log(`Generated telugu-patched.pdf (${teluguBuf.length} bytes)`)
  console.log(`Generated full-fixture-patched.pdf (${fixtureBuf.length} bytes)`)

  // Check browser file path in fontkit package.json
  const fontkitPkgPath = path.resolve(CLIENT_DIR, 'node_modules/fontkit/package.json')
  const fontkitPkg = JSON.parse(fs.readFileSync(fontkitPkgPath, 'utf8'))

  return {
    exp1bCrashesAfterPatch,
    patchHits,
    teluguPatchedPath,
    teluguPatchedBytes: teluguBuf.length,
    fixturePatchedPath,
    fixturePatchedBytes: fixtureBuf.length,
    fontkitPkgExports: {
      main: fontkitPkg.main,
      module: fontkitPkg.module,
      browser: fontkitPkg.browser,
      exports: fontkitPkg.exports,
    },
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function main() {
  await registerPdfFonts()

  const fkTeluguFont = fontkit.openSync(path.resolve(FONTS_DIR, 'NotoSansTelugu-Regular.ttf'))
  const fkDevanagariFont = fontkit.openSync(path.resolve(FONTS_DIR, 'NotoSansDevanagari-Regular.ttf'))

  const exp1Res = await runExperiment1(fkTeluguFont)
  const exp2Res = runExperiment2(fkTeluguFont, fkDevanagariFont)
  const exp3Res = runExperiment3(
    exp1Res.exp1Table.map((t) => t.string)
  )
  const exp4Res = await runExperiment4(
    fkTeluguFont,
    exp1Res.exp1Table.map((t) => t.string)
  )

  const summary = {
    exp1: exp1Res,
    exp2: exp2Res,
    exp3: exp3Res,
    exp4: exp4Res,
  }

  console.log('\nRESULT_JSON_START')
  console.log(JSON.stringify(summary, null, 2))
  console.log('RESULT_JSON_END')
}

main().catch((err) => {
  console.error('MAIN_ERROR:', err)
  process.exit(1)
})
