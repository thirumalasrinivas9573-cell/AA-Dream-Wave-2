import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as fontkit from 'fontkit'

import { installFontkitGuard, getGuardStats } from './fontkitGuard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT_DIR = path.resolve(__dirname, '../../../../')
const FONTS_DIR = path.resolve(__dirname, '../../../public/fonts')

const teluguFontPath = path.resolve(FONTS_DIR, 'NotoSansTelugu-Regular.ttf')
const devanagariFontPath = path.resolve(FONTS_DIR, 'NotoSansDevanagari-Regular.ttf')

const teluguFontBuffer = fs.readFileSync(teluguFontPath)
const devanagariFontBuffer = fs.readFileSync(devanagariFontPath)

// Test 1: In a separate child process WITHOUT the guard, laying out "డ్రీమ్ " throws xCoordinate error
test('Unpatched fontkit in a separate process throws xCoordinate error on "డ్రీమ్ "', () => {
  const code = `
    import fs from 'node:fs';
    import * as fontkit from 'fontkit';
    const fontBuffer = fs.readFileSync(${JSON.stringify(teluguFontPath)});
    const font = fontkit.create(fontBuffer);
    try {
      font.layout('\\u0C21\\u0C4D\\u0C30\\u0C40\\u0C2E\\u0C4D ');
      console.log('UNEXPECTED_PASS');
      process.exit(1);
    } catch (e) {
      console.log('EXPECTED_CRASH:' + e.message);
      process.exit(0);
    }
  `

  const nodeExe = path.resolve(ROOT_DIR, '.tools/node-v20.18.0-win-x64/node.exe')
  const clientDir = path.resolve(ROOT_DIR, 'client')
  const res = spawnSync(nodeExe, ['--input-type=module', '-e', code], { cwd: clientDir, encoding: 'utf8' })

  if (res.status !== 0) {
    console.error('CHILD_STDERR:', res.stderr)
    console.error('CHILD_STDOUT:', res.stdout)
  }

  assert.equal(res.status, 0)
  assert.match(res.stdout, /EXPECTED_CRASH:.*xCoordinate/)
})

// Test 2: After installFontkitGuard, the string does not throw, hits > 0, second install is no-op
test('After installFontkitGuard, string does not throw, hits > 0, second install is idempotent', async () => {
  const installRes = await installFontkitGuard({ fontData: teluguFontBuffer })
  assert.equal(installRes.installed, true)
  assert.equal(installRes.variant, 'Z')

  const font = fontkit.create(teluguFontBuffer)
  const testStr = '\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D ' // "డ్రీమ్ "

  assert.doesNotThrow(() => {
    font.layout(testStr)
  })

  const statsAfterFirst = getGuardStats()
  assert.equal(statsAfterFirst.installed, true)
  assert.ok(statsAfterFirst.hits > 0, 'Hits should be > 0 after laying out crashing string')

  const hitsBeforeSecondInstall = statsAfterFirst.hits

  // Second install call (idempotent no-op)
  const secondInstallRes = await installFontkitGuard({ fontData: teluguFontBuffer })
  assert.equal(secondInstallRes.installed, true)

  const statsAfterSecond = getGuardStats()
  assert.equal(statsAfterSecond.hits, hitsBeforeSecondInstall, 'Hits should not increase or reset on second install call')
})

// Test 3: 2,000-string sample matching /\u0C4D\u0C30/ yields 0 crashes after install
test('2,000-string sample with ra-vattu (\\u0C4D\\u0C30) yields 0 crashes after guard install', async () => {
  await installFontkitGuard({ fontData: teluguFontBuffer })
  const font = fontkit.create(teluguFontBuffer)

  const teluguConsonants = []
  for (let code = 0x0c15; code <= 0x0c39; code++) {
    teluguConsonants.push(String.fromCodePoint(code))
  }
  const teluguC2List = ['\u0C30', '\u0C2E', '\u0C35', '\u0C24', '\u0C28']
  const teluguVowels = ['', '\u0C3E', '\u0C3F', '\u0C40', '\u0C46', '\u0C47', '\u0C48', '\u0C4B', '\u0C4C']
  const suffixes = ['', ' ', '.']

  const raVattuSample = []

  for (const c1 of teluguConsonants) {
    for (const c2 of teluguC2List) {
      const cluster = `${c1}\u0C4D\u0C30` // c1 + virama + Ra
      for (const vow of teluguVowels) {
        for (const suf of suffixes) {
          const testStr = `${cluster}${vow}${suf}`
          if (/\u0C4D\u0C30/.test(testStr)) {
            raVattuSample.push(testStr)
          }
          if (raVattuSample.length >= 2000) break
        }
        if (raVattuSample.length >= 2000) break
      }
      if (raVattuSample.length >= 2000) break
    }
    if (raVattuSample.length >= 2000) break
  }

  assert.ok(raVattuSample.length >= 2000, `Expected at least 2,000 sample strings, got ${raVattuSample.length}`)

  let crashCount = 0
  for (const s of raVattuSample) {
    try {
      font.layout(s)
    } catch (e) {
      crashCount++
    }
  }

  assert.equal(crashCount, 0, `Expected 0 crashes across 2,000 ra-vattu strings, got ${crashCount}`)
})

// Test 4: Devanagari strings yield 0 crashes and 0 hits added
test('Devanagari strings yield 0 crashes and 0 extra hits', async () => {
  await installFontkitGuard({ fontData: devanagariFontBuffer })
  const devFont = fontkit.create(devanagariFontBuffer)

  const hitsBefore = getGuardStats().hits

  const devanagariStrings = [
    'ड्रीम वेव एआई',
    'करियर मार्गदर्शन',
    'लर्निंग प्लेटफॉर्म',
    'नमस्ते',
    'कौशल विकास',
    'प्रोद्योगिकी',
  ]

  let devCrashes = 0
  for (const s of devanagariStrings) {
    try {
      devFont.layout(s)
    } catch (e) {
      devCrashes++
    }
  }

  const hitsAfter = getGuardStats().hits

  assert.equal(devCrashes, 0, 'Devanagari layout should not crash')
  assert.equal(hitsAfter, hitsBefore, 'Devanagari layout should not increment null anchor guard hits')
})
