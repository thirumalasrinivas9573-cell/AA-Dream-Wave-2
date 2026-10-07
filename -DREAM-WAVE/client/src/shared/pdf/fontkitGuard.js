import path from 'path'
import fs from 'fs'

export const GUARD_MARKER = '__dwFontkitGuard'
const GUARD_SYMBOL = Symbol.for(GUARD_MARKER)

let isInstalled = false
let hitCount = 0
const variantType = 'Z'
let warnCount = 0

function warnOnce(msg) {
  if (warnCount === 0) {
    warnCount++
    console.warn(`[FontkitGuard] ${msg}`)
  }
}

export function getGuardStats() {
  return { installed: isInstalled, hits: hitCount, variant: variantType }
}

export async function installFontkitGuard({ fontData } = {}) {
  if (isInstalled) {
    return { installed: true, hits: hitCount, variant: variantType }
  }

  try {
    const fontkitModule = await import('fontkit')
    const fontkit = fontkitModule.default || fontkitModule

    if (!fontkit || typeof fontkit.create !== 'function') {
      warnOnce('fontkit module could not be imported or lacks create method.')
      return { installed: false, hits: hitCount, variant: variantType }
    }

    let fontBuffer = fontData

    if (!fontBuffer) {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        try {
          const resp = await fetch('/fonts/NotoSansTelugu-Regular.ttf')
          if (resp && resp.ok) {
            const ab = await resp.arrayBuffer()
            fontBuffer = new Uint8Array(ab)
          }
        } catch (fetchErr) {
          // Fallback to empty/ignore fetch error
        }
      }

      if (!fontBuffer && typeof process !== 'undefined' && process.cwd) {
        try {
          const possibleFontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansTelugu-Regular.ttf')
          if (fs.existsSync(possibleFontPath)) {
            fontBuffer = fs.readFileSync(possibleFontPath)
          }
        } catch (fsErr) {
          // Ignore Node fs error
        }
      }
    }

    if (!fontBuffer) {
      warnOnce('Unable to obtain sample font data to hook GPOSProcessor prototype.')
      return { installed: false, hits: hitCount, variant: variantType }
    }

    let sampleFont = null
    try {
      sampleFont = fontkit.create(fontBuffer)
      sampleFont.layout('గైడెన్స్')
    } catch (e) {
      // Ignore layout error during initialization
    }

    const engine = sampleFont && sampleFont._layoutEngine && sampleFont._layoutEngine.engine
    const gposProcessor = engine && engine.GPOSProcessor
    const GPOSProto = gposProcessor ? Object.getPrototypeOf(gposProcessor) : null

    if (!GPOSProto || typeof GPOSProto.getAnchor !== 'function') {
      warnOnce('GPOSProcessor prototype not found on layout engine.')
      return { installed: false, hits: hitCount, variant: variantType }
    }

    if (GPOSProto[GUARD_SYMBOL]) {
      isInstalled = true
      return { installed: true, hits: hitCount, variant: variantType }
    }

    const origGetAnchor = GPOSProto.getAnchor

    GPOSProto.getAnchor = function (anchor) {
      if (!anchor) {
        hitCount++
        return { x: 0, y: 0 }
      }
      return origGetAnchor.call(this, anchor)
    }

    Object.defineProperty(GPOSProto, GUARD_SYMBOL, {
      value: true,
      configurable: false,
      writable: false,
      enumerable: false,
    })

    isInstalled = true
    return { installed: true, hits: hitCount, variant: variantType }
  } catch (err) {
    warnOnce(`Unexpected failure during installation: ${err && err.message ? err.message : String(err)}`)
    return { installed: false, hits: hitCount, variant: variantType }
  }
}
