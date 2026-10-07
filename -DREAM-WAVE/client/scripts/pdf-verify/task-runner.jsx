import React from 'react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import * as fontkit from 'fontkit'
import { Font, renderToBuffer } from '@react-pdf/renderer'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

import { ReportPdf } from '../../src/modules/student/pages/ReportPdf.jsx'
import { markdownToPdf } from '../../src/shared/pdf/markdownToPdf.jsx'
import {
  registerPdfFonts,
  LAST_EMITTED_RUNS,
  clearEmittedRuns,
} from '../../src/shared/pdf/fonts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(__dirname, '../..')
const ROOT_DIR = path.resolve(CLIENT_DIR, '..')
const FONTS_DIR = path.resolve(CLIENT_DIR, 'public/fonts')
const OUT_DIR = path.resolve(__dirname, 'out')
const DRAFT_DIR = path.resolve(__dirname, 'patch-draft')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
if (!fs.existsSync(DRAFT_DIR)) fs.mkdirSync(DRAFT_DIR, { recursive: true })

// Programmatic code points helper
function getCPs(str) {
  return [...str].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')
}

// Mock fs.promises.open, readFile, readFileSync for local font resolution in react-pdf
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
    } else {
      return {
        ok: false,
        status: 404,
        headers: { get: () => 'text/html' },
        arrayBuffer: async () => new ArrayBuffer(0),
      }
    }
  }
  if (globalThis.__originalFetch) return globalThis.__originalFetch(input, options)
  throw new Error(`Unhandled fetch: ${urlStr}`)
}

await registerPdfFonts()

const teluguFontPath = path.resolve(FONTS_DIR, 'NotoSansTelugu-Regular.ttf')
const fkTeluguFont = fontkit.openSync(teluguFontPath)

// Initialize layout engine & GPOS processor
try { fkTeluguFont.layout('డ్రీమ్') } catch (e) {}

// Seeded PRNG for task 2c sampling
function createPRNG(seed) {
  let s = seed
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

async function main() {
  console.log('================================================================================')
  console.log('STARTING PDF VERIFICATION EXPERIMENTS & TASK RUNNER')
  console.log('================================================================================')

  // ---------------------------------------------------------------------------
  // TASK 1a: Programmatic Code Points for Experiment 1b Strings
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 1a: Experiment 1b Strings with Programmatic Code Points ---')
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

  const exp1aResults = []
  for (const s of exp1bStrings) {
    const cps = getCPs(s)
    let fkRes = 'PASS'
    try {
      fkTeluguFont.layout(s)
    } catch (e) {
      fkRes = `CRASH (${e.message})`
    }

    let rpRes = 'PASS'
    try {
      clearEmittedRuns()
      const doc = (
        <ReportPdf
          workspace={{ title: 'WS' }}
          report={{
            title: 'Test',
            sections: [{ key: 'sec1', title: 'Sec1', content: s }],
          }}
          options={{ forceFont: 'NotoSansTelugu' }}
        />
      )
      await renderToBuffer(doc)
    } catch (e) {
      rpRes = `CRASH (${e.message})`
    }

    exp1aResults.push({ string: s, codePoints: cps, fontkitResult: fkRes, reactPdfResult: rpRes })
  }

  console.table(exp1aResults)

  // ---------------------------------------------------------------------------
  // TASK 1b: Crash Rule Predicate & Sweep Coverage
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 1b: Crash Rule Predicate & Sweep Coverage ---')
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

  // Crash predicate regex: any Telugu cluster containing virama + Ra (\u0C4D\u0C30)
  const crashPredicate = (str) => /\u0C4D\u0C30/.test(str)

  let totalTested = 0
  let totalCrashes = 0
  let matchedAndCrashed = 0
  let matchedButNoCrash = 0
  let crashedButNoMatch = 0
  const unmatchedCrashes = []
  const crashingShapes = {}
  const allCrashingStrings = []

  for (const c1 of teluguConsonants) {
    for (const c2 of teluguC2List) {
      const bases = [c1, `${c1}\u0C4D`, `${c1}\u0C4D${c2}`, `${c1}\u0C4D${c2}\u0C4D`]
      for (const base of bases) {
        for (const vow of teluguVowels) {
          for (const suf of suffixes) {
            const testStr = `${base}${vow}${suf}`
            totalTested++
            const pred = crashPredicate(testStr)
            let crashed = false
            try {
              fkTeluguFont.layout(testStr)
            } catch (e) {
              crashed = true
            }

            if (crashed) {
              totalCrashes++
              allCrashingStrings.push(testStr)
              const shapeKey = `base:${c1}+virama+${c2 === '\u0C30' ? 'Ra' : 'C2'},vow:U+${(vow.codePointAt(0) || 0).toString(16).toUpperCase()},suf:${suf === ' ' ? 'SPACE' : suf === '.' ? 'DOT' : suf === '\u200C' ? 'ZWNJ' : 'NONE'}`
              crashingShapes[shapeKey] = (crashingShapes[shapeKey] || 0) + 1

              if (pred) {
                matchedAndCrashed++
              } else {
                crashedButNoMatch++
                if (unmatchedCrashes.length < 20) {
                  unmatchedCrashes.push({ string: testStr, codePoints: getCPs(testStr) })
                }
              }
            } else {
              if (pred) {
                matchedButNoCrash++
              }
            }
          }
        }
      }
    }
  }

  console.log(`Telugu Sweep Total Strings Tested: ${totalTested}`)
  console.log(`Total Crashes: ${totalCrashes}`)
  console.log(`Crashes Matching Predicate (True Positives): ${matchedAndCrashed}`)
  console.log(`Crashes NOT Matching Predicate (False Negatives): ${crashedButNoMatch}`)
  console.log(`Matching Strings That Do NOT Crash (False Positives): ${matchedButNoCrash}`)

  if (unmatchedCrashes.length > 0) {
    console.log('\nFirst 20 Unmatched Crashes:')
    console.table(unmatchedCrashes)
  }

  // ---------------------------------------------------------------------------
  // TASK 1c: Line 27 Fixture Emitted Runs & Cmap Check
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 1c: Line 27 Fixture Pipeline Emitted Runs & Font Cmap ---')
  const fixturePath = path.resolve(ROOT_DIR, 'sample-report-test.md')
  const fixtureContent = fs.readFileSync(fixturePath, 'utf8')
  const rawLines = fixtureContent.split('\n')
  const line27Text = rawLines.find(l => l.includes('Telugu Language Test'))
  console.log('Line 27 Text:', line27Text)

  clearEmittedRuns()
  try {
    const doc = (
      <ReportPdf
        workspace={{ title: 'WS' }}
        report={{
          title: 'Test',
          sections: [{ key: 'line27', title: 'Line 27', content: line27Text }],
        }}
        options={{}}
      />
    )
    await renderToBuffer(doc)
  } catch (e) {
    console.log('Line 27 pipeline execution caught error:', e.message)
  }

  console.log('Emitted Runs for Line 27 (LAST_EMITTED_RUNS):')
  console.log(JSON.stringify(LAST_EMITTED_RUNS, null, 2))

  // Check if English text ended up in NotoSansTelugu run
  const hasLatinInTeluguRun = LAST_EMITTED_RUNS.some(r => r.fontFamily === 'NotoSansTelugu' && /[A-Za-z]/.test(r.text))
  console.log('Does English text end up inside NotoSansTelugu run?', hasLatinInTeluguRun)
  console.log('Responsible function for script splitting & font assignment: `markdownToPdf` / `splitTextByScript` in client/src/shared/pdf/markdownToPdf.jsx')

  // Cmap check for U+0054 ('T')
  const glyphT = fkTeluguFont.glyphForCodePoint(0x0054)
  console.log('NotoSansTelugu cmap lookup for U+0054 (Latin letter "T"):', {
    codePoint: 'U+0054',
    glyphId: glyphT ? glyphT.id : null,
    glyphName: glyphT ? glyphT.name : null,
    isFallback: glyphT ? glyphT.id === 0 : true
  })

  // ---------------------------------------------------------------------------
  // TASK 2a & 2b: Patch Variants Z and S
  // ---------------------------------------------------------------------------
  // Ensure gposProcessor is initialized with a valid non-crashing layout string
  try { fkTeluguFont.layout('గైడెన్స్') } catch (e) {}
  console.log('Layout Engine:', fkTeluguFont._layoutEngine)
  console.log('Layout Engine keys:', Object.keys(fkTeluguFont._layoutEngine))
  console.log('Layout Engine GPOS:', fkTeluguFont._layoutEngine.gpos, fkTeluguFont._layoutEngine.gposProcessor)
  
  const gpos = fkTeluguFont._layoutEngine.engine && fkTeluguFont._layoutEngine.engine.GPOSProcessor
  const GPOSProto = gpos ? Object.getPrototypeOf(gpos) : null
  if (!GPOSProto) throw new Error('GPOSProcessor prototype not found on layout engine.engine')
  const origGetAnchor = GPOSProto.getAnchor
  const origApplyAnchor = GPOSProto.applyAnchor

  function runSweepWithPatch(patchType) {
    let nullAnchorCount = 0
    if (patchType === 'Z') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) {
          nullAnchorCount++
          return { x: 0, y: 0 }
        }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = origApplyAnchor
    } else if (patchType === 'S') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) {
          nullAnchorCount++
          return { x: 0, y: 0 }
        }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = function (markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) {
          nullAnchorCount++
          return
        }
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex)
      }
    }

    let crashes = 0
    for (const c1 of teluguConsonants) {
      for (const c2 of teluguC2List) {
        const bases = [c1, `${c1}\u0C4D`, `${c1}\u0C4D${c2}`, `${c1}\u0C4D${c2}\u0C4D`]
        for (const base of bases) {
          for (const vow of teluguVowels) {
            for (const suf of suffixes) {
              const testStr = `${base}${vow}${suf}`
              try {
                fkTeluguFont.layout(testStr)
              } catch (e) {
                crashes++
              }
            }
          }
        }
      }
    }

    GPOSProto.getAnchor = origGetAnchor
    GPOSProto.applyAnchor = origApplyAnchor

    return { crashes, nullAnchorEvents: nullAnchorCount }
  }

  const resZ = runSweepWithPatch('Z')
  console.log(`Variant Z Sweep Results: Crashes = ${resZ.crashes}, Null-Anchor Events = ${resZ.nullAnchorEvents}`)

  const resS = runSweepWithPatch('S')
  console.log(`Variant S Sweep Results: Crashes = ${resS.crashes}, Null-Anchor Events = ${resS.nullAnchorEvents}`)

  // ---------------------------------------------------------------------------
  // TASK 2c: Glyph Position Comparison for "డ్రీమ్ " and 10 Sampled Strings
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 2c: Glyph Position Comparison ---')

  function getGlyphDetails(font, str, patchType) {
    if (patchType === 'Z') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) return { x: 0, y: 0 }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = origApplyAnchor
    } else if (patchType === 'S') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) return { x: 0, y: 0 }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = function (markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) return
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex)
      }
    } else {
      GPOSProto.getAnchor = origGetAnchor
      GPOSProto.applyAnchor = origApplyAnchor
    }

    let glyphRun = null
    try {
      glyphRun = font.layout(str)
    } catch (e) {
      glyphRun = null
    }

    GPOSProto.getAnchor = origGetAnchor
    GPOSProto.applyAnchor = origApplyAnchor

    if (!glyphRun) return null

    return glyphRun.glyphs.map((g, i) => ({
      id: g.id,
      name: g.name,
      xAdvance: glyphRun.positions[i].xAdvance,
      xOffset: glyphRun.positions[i].xOffset,
      yOffset: glyphRun.positions[i].yOffset,
    }))
  }

  const targetDrimSpace = 'డ్రీమ్ '
  const targetDrimRef = 'డ్రీమ్\u200C '

  const posDrimRef = getGlyphDetails(fkTeluguFont, targetDrimRef, 'NONE')
  const posDrimZ = getGlyphDetails(fkTeluguFont, targetDrimSpace, 'Z')
  const posDrimS = getGlyphDetails(fkTeluguFont, targetDrimSpace, 'S')

  console.log('\nPosition Comparison for "డ్రీమ్ ":')
  console.log('Reference ("డ్రీమ్\\u200C "):', JSON.stringify(posDrimRef))
  console.log('Variant Z ("డ్రీమ్ "):  ', JSON.stringify(posDrimZ))
  console.log('Variant S ("డ్రీమ్ "):  ', JSON.stringify(posDrimS))

  const seed = 12345
  const prng = createPRNG(seed)
  const sampled10 = []
  const availableCrashes = [...allCrashingStrings]
  for (let i = 0; i < 10; i++) {
    const idx = Math.floor(prng() * availableCrashes.length)
    sampled10.push(availableCrashes[idx])
  }

  console.log(`\nSampled 10 Crashing Strings (Seed ${seed}):`)
  const sampleComparisonResults = []
  for (const s of sampled10) {
    const sRef = s.replace(/(\u0C4D)($|[ .])/g, '$1\u200C$2')
    const pRef = getGlyphDetails(fkTeluguFont, sRef, 'NONE')
    const pZ = getGlyphDetails(fkTeluguFont, s, 'Z')
    const pS = getGlyphDetails(fkTeluguFont, s, 'S')

    const zMatchesRef = JSON.stringify(pZ) === JSON.stringify(pRef)
    const sMatchesRef = JSON.stringify(pS) === JSON.stringify(pRef)
    const zMatchesS = JSON.stringify(pZ) === JSON.stringify(pS)

    sampleComparisonResults.push({
      string: s,
      codePoints: getCPs(s),
      zMatchesS,
      zMatchesRef,
      sMatchesRef,
      numGlyphsZ: pZ ? pZ.length : 0,
    })
  }
  console.table(sampleComparisonResults)

  // ---------------------------------------------------------------------------
  // TASK 3: Render PDFs for Visual Eye Inspection
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 3: Render PDFs for Visual Inspection ---')

  const nirmalaPath = 'C:\\Windows\\Fonts\\Nirmala.ttc'
  let hasNirmala = fs.existsSync(nirmalaPath)
  if (hasNirmala) {
    Font.register({
      family: 'NirmalaUI',
      fonts: [{ src: nirmalaPath, fontWeight: 'normal' }],
    })
  }

  async function renderSinglePagePdf(label, textStr, fontFamily, patchVariant, filename) {
    let eventCount = 0
    if (patchVariant === 'Z') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) {
          eventCount++
          return { x: 0, y: 0 }
        }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = origApplyAnchor
    } else if (patchVariant === 'S') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) {
          eventCount++
          return { x: 0, y: 0 }
        }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = function (markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) {
          eventCount++
          return
        }
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex)
      }
    } else {
      GPOSProto.getAnchor = origGetAnchor
      GPOSProto.applyAnchor = origApplyAnchor
    }

    const doc = (
      <ReportPdf
        workspace={{ title: 'WS' }}
        report={{
          title: label,
          sections: [
            {
              key: 'sec1',
              title: label,
              content: textStr,
            },
          ],
        }}
        options={{ forceFont: fontFamily }}
      />
    )

    try {
      const buffer = await renderToBuffer(doc)
      const outPath = path.resolve(OUT_DIR, filename)
      fs.writeFileSync(outPath, buffer)
      console.log(`Rendered ${filename} (${buffer.length} bytes, Patch: ${patchVariant || 'NONE'}, Interceptions: ${eventCount})`)
    } catch (e) {
      console.log(`Failed to render ${filename} (Patch: ${patchVariant || 'NONE'}): ${e.message}`)
    } finally {
      GPOSProto.getAnchor = origGetAnchor
      GPOSProto.applyAnchor = origApplyAnchor
    }
  }

  await renderSinglePagePdf('Label: drim-ref', 'డ్రీమ్\u200Cవేవ్', 'NotoSansTelugu', null, 'drim-ref.pdf')
  await renderSinglePagePdf('Label: drim-z', 'డ్రీమ్ వేవ్', 'NotoSansTelugu', 'Z', 'drim-z.pdf')
  await renderSinglePagePdf('Label: drim-s', 'డ్రీమ్ వేవ్', 'NotoSansTelugu', 'S', 'drim-s.pdf')

  if (hasNirmala) {
    await renderSinglePagePdf('Label: drim-nirmala', 'డ్రీమ్ వేవ్', 'NirmalaUI', null, 'drim-nirmala.pdf')
  }

  async function renderFullFixturePdf(patchVariant, filename) {
    let eventCount = 0
    if (patchVariant === 'Z') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) {
          eventCount++
          return { x: 0, y: 0 }
        }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = origApplyAnchor
    } else if (patchVariant === 'S') {
      GPOSProto.getAnchor = function (anchor) {
        if (!anchor) {
          eventCount++
          return { x: 0, y: 0 }
        }
        return origGetAnchor.call(this, anchor)
      }
      GPOSProto.applyAnchor = function (markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) {
          eventCount++
          return
        }
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex)
      }
    }

    const doc = (
      <ReportPdf
        workspace={{ title: 'FULL FIXTURE' }}
        report={{
          title: 'Full Fixture Report',
          sections: [
            {
              key: 'sec-full',
              title: 'Full Markdown Fixture',
              content: fixtureContent,
            },
          ],
        }}
        options={{}}
      />
    )

    try {
      const buffer = await renderToBuffer(doc)
      const outPath = path.resolve(OUT_DIR, filename)
      fs.writeFileSync(outPath, buffer)
      console.log(`Rendered ${filename} (${buffer.length} bytes, Patch: ${patchVariant}, Interceptions: ${eventCount})`)
    } catch (e) {
      console.log(`Failed to render ${filename} (Patch: ${patchVariant}): ${e.message}`)
    } finally {
      GPOSProto.getAnchor = origGetAnchor
      GPOSProto.applyAnchor = origApplyAnchor
    }
  }

  await renderFullFixturePdf('Z', 'full-fixture-Z.pdf')
  await renderFullFixturePdf('S', 'full-fixture-S.pdf')

  // ---------------------------------------------------------------------------
  // TASK 4: Verify Every PDF with pdfjs-dist
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 4: Verify Every PDF with pdfjs-dist ---')
  const pdfFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.pdf'))
  const task4Table = []

  for (const f of pdfFiles) {
    const filePath = path.resolve(OUT_DIR, f)
    const stat = fs.statSync(filePath)
    const buffer = fs.readFileSync(filePath)
    const data = new Uint8Array(buffer)

    let pageCount = 0
    let textContentStr = ''
    const fontNamesSet = new Set()

    try {
      const loadingTask = pdfjsLib.getDocument({ data })
      const pdfDoc = await loadingTask.promise
      pageCount = pdfDoc.numPages

      for (let p = 1; p <= pageCount; p++) {
        const page = await pdfDoc.getPage(p)
        const tc = await page.getTextContent()
        const pageText = tc.items.map(item => item.str).join(' ')
        textContentStr += pageText + ' '

        const opList = await page.getOperatorList()
        for (let i = 0; i < opList.fnArray.length; i++) {
          if (opList.fnArray[i] === pdfjsLib.OPS.setFont) {
            const fontName = opList.argsArray[i][0]
            fontNamesSet.add(fontName)
          }
        }
      }
    } catch (e) {
      textContentStr = `ERROR: ${e.message}`
    }

    const hasPerfMetrics = textContentStr.includes('Performance Metrics')
    const hasActionPlan = textContentStr.includes('Action Plan')

    task4Table.push({
      file: f,
      sizeBytes: stat.size,
      pages: pageCount,
      textLength: textContentStr.length,
      hasPerfMetrics,
      hasActionPlan,
      fonts: Array.from(fontNamesSet).join(', '),
    })
  }

  console.table(task4Table)

  // ---------------------------------------------------------------------------
  // TASK 5: Draft Patch File Creation & Plan
  // ---------------------------------------------------------------------------
  console.log('\n--- TASK 5: Creating Patch Draft File ---')
  const draftPatchContent = `--- node_modules/fontkit/dist/module.mjs
+++ node_modules/fontkit/dist/module.mjs
@@ -9949,3 +9949,6 @@
     getAnchor(anchor) {
+        if (!anchor) {
+            return { x: 0, y: 0 };
+        }
         // TODO: contour point, device tables
         let x = anchor.xCoordinate;
`
  const draftPatchPath = path.resolve(DRAFT_DIR, 'fontkit+2.0.4.patch')
  fs.writeFileSync(draftPatchPath, draftPatchContent)
  console.log(`Saved DRAFT patch file to: ${draftPatchPath}`)

  console.log('\n================================================================================')
  console.log('ALL EXPERIMENTS AND TASKS COMPLETED SUCCESSFULLY')
  console.log('================================================================================')
}

main().catch(err => {
  console.error('FATAL TASK RUNNER ERROR:', err)
  process.exit(1)
})
