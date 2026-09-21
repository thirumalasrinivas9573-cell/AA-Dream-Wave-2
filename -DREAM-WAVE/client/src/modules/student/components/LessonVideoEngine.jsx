import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// AA Dream Wave — Lesson Video Engine
// Real topic-driven 2D/3D canvas animations + AI voice narration
// Each scene detects the topic and renders the matching visual:
//   photosynthesis → sun + earth + plant growing
//   html/css → browser + DOM tree building
//   python/code → terminal + flowing code
//   math → equation morphing + graph plotting
//   physics → particle collision / pendulum
//   biology → DNA helix + cell division
//   default → abstract concept network
// ─────────────────────────────────────────────────────────────────────────────

const SCENE_DURATION = 28 // seconds per scene

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  bg: '#04040A', text: '#F8FAFC', muted: '#64748B', sub: '#94A3B8',
  purple: '#8B5CF6', indigo: '#6366F1', green: '#10B981',
  yellow: '#F59E0B', orange: '#F97316', pink: '#EC4899',
  cyan: '#06B6D4', red: '#EF4444', blue: '#3B82F6',
}

function h2r(hex, a) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${a})`
}
function eO(t) { return 1 - Math.pow(1 - Math.min(t,1), 3) }
function eSp(t) { t=Math.min(t,1); return 1 + 2.70158*(t-1)**3 + 1.70158*(t-1)**2 }
function p01(t, s, e) { return Math.min(Math.max((t-s)/(e-s), 0), 1) }
function lerp(a, b, t) { return a + (b-a)*Math.min(Math.max(t,0),1) }

// ── Detect topic category from scene/lesson title ─────────────────────────────
function detectTopic(lesson, scene) {
  const text = ((lesson?.title || '') + ' ' + (scene?.title || '') + ' ' + (scene?.narration || '')).toLowerCase()
  if (/photosynthesis|plant|chlorophyll|leaf|sun.*plant|plant.*sun/.test(text)) return 'photosynthesis'
  if (/html|dom|webpage|browser|tag|css|web\s*design/.test(text)) return 'html'
  if (/python|javascript|java\b|code|programming|function|variable|loop/.test(text)) return 'code'
  if (/math|equation|calculus|algebra|geometry|graph|formula|integral/.test(text)) return 'math'
  if (/physics|force|gravity|motion|velocity|energy|particle|quantum/.test(text)) return 'physics'
  if (/biology|dna|cell|gene|protein|evolution|organism|bacteria/.test(text)) return 'biology'
  if (/chemistry|molecule|atom|bond|reaction|periodic|element/.test(text)) return 'chemistry'
  if (/machine learning|neural|ai\b|deep learning|model|dataset/.test(text)) return 'ai'
  if (/solar system|planet|orbit|star|galaxy|space|astronomy/.test(text)) return 'space'
  if (/network|internet|server|cloud|api|database|system/.test(text)) return 'network'
  if (/history|ancient|civilization|war|empire|revolution/.test(text)) return 'history'
  if (/business|market|economy|finance|stock|money|invest/.test(text)) return 'business'
  return 'concept'
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER: PHOTOSYNTHESIS
// Sun → rays hit Earth → plant grows from ground → chloroplasts visible
// ─────────────────────────────────────────────────────────────────────────────
function renderPhotosynthesis(ctx, W, H, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, h2r('#1a0533', 1))
  sky.addColorStop(1, h2r('#0d3b2e', 1))
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)

  // Ground
  const ground = ctx.createLinearGradient(0, H*0.72, 0, H)
  ground.addColorStop(0, '#1a4a1a'); ground.addColorStop(1, '#0a2a0a')
  ctx.fillStyle = ground
  ctx.beginPath(); ctx.rect(0, H*0.72, W, H*0.28); ctx.fill()

  // ── SUN (3D sphere illusion) ────────────────────────────────────
  const sunX = W * 0.15, sunY = H * 0.18
  const sunR = lerp(0, Math.min(W, H) * 0.1, eSp(p01(t, 0, 1.8)))
  if (sunR > 2) {
    // Outer corona glow layers
    for (let i = 4; i >= 0; i--) {
      const g2 = ctx.createRadialGradient(sunX, sunY, sunR, sunX, sunY, sunR*(2.5+i*0.8))
      g2.addColorStop(0, h2r(C.yellow, 0.12 - i*0.02))
      g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2; ctx.beginPath()
      ctx.arc(sunX, sunY, sunR*(2.5+i*0.8), 0, Math.PI*2); ctx.fill()
    }
    // 3D sphere — radial gradient with highlight
    const sg = ctx.createRadialGradient(sunX - sunR*0.3, sunY - sunR*0.3, 0, sunX, sunY, sunR)
    sg.addColorStop(0, '#FFFDE7')
    sg.addColorStop(0.3, '#FDD835')
    sg.addColorStop(0.7, '#F9A825')
    sg.addColorStop(1, '#E65100')
    ctx.fillStyle = sg
    ctx.shadowColor = C.yellow; ctx.shadowBlur = 40
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI*2); ctx.fill()
    ctx.shadowBlur = 0
    // Surface texture lines (solar activity)
    if (t > 1) {
      ctx.save(); ctx.globalAlpha = 0.15
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2 + t*0.3
        ctx.strokeStyle = '#FFF176'; ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(sunX + Math.cos(a)*sunR*0.4, sunY + Math.sin(a)*sunR*0.4, sunR*0.18, 0, Math.PI*2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  // ── SUN RAYS shooting toward plant ────────────────────────────────
  const rayP = eO(p01(t, 2, 5))
  if (rayP > 0) {
    const plantX = W * 0.58, plantBaseY = H * 0.72
    const rayCount = 6
    for (let i = 0; i < rayCount; i++) {
      const rp2 = eO(p01(t, 2.3 + i*0.3, 4 + i*0.25))
      if (rp2 <= 0) continue
      ctx.save()
      ctx.globalAlpha = rp2 * 0.7
      const startX = sunX + (Math.cos((i/rayCount)*Math.PI*0.6 - 0.3)) * sunR
      const startY = sunY + (Math.sin((i/rayCount)*Math.PI*0.6 + 0.2)) * sunR
      const endX = lerp(startX, plantX + (Math.random()-0.5)*40, rp2)
      const endY = lerp(startY, plantBaseY - 60 - Math.random()*40, rp2)
      const grad = ctx.createLinearGradient(startX, startY, endX, endY)
      grad.addColorStop(0, h2r(C.yellow, 0.9))
      grad.addColorStop(0.6, h2r(C.yellow, 0.4))
      grad.addColorStop(1, h2r(C.green, 0.6))
      ctx.strokeStyle = grad; ctx.lineWidth = 2.5 - i*0.2
      ctx.setLineDash([8, 5]); ctx.lineDashOffset = -t*25
      ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
  }

  // ── EARTH (3D sphere) in background ────────────────────────────────
  const earthP = eO(p01(t, 1, 3.5))
  const ex = W*0.82, ey = H*0.25, er = Math.min(W,H)*0.09*earthP
  if (er > 2) {
    const eg = ctx.createRadialGradient(ex-er*0.3, ey-er*0.3, 0, ex, ey, er)
    eg.addColorStop(0, '#4FC3F7'); eg.addColorStop(0.4, '#1565C0')
    eg.addColorStop(0.7, '#2E7D32'); eg.addColorStop(1, '#1B5E20')
    ctx.fillStyle = eg
    ctx.shadowColor = '#1565C0'; ctx.shadowBlur = 25
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI*2); ctx.fill()
    ctx.shadowBlur = 0
    // Cloud swirls
    ctx.save(); ctx.globalAlpha = 0.3
    ctx.fillStyle = 'white'
    for (let i = 0; i < 4; i++) {
      const ca = t*0.1 + i*(Math.PI/2)
      const cx2 = ex + Math.cos(ca)*er*0.5, cy2 = ey + Math.sin(ca)*er*0.3
      ctx.beginPath(); ctx.ellipse(cx2, cy2, er*0.22, er*0.08, ca, 0, Math.PI*2); ctx.fill()
    }
    ctx.restore()
    // Atmosphere glow
    const atm = ctx.createRadialGradient(ex, ey, er, ex, ey, er*1.25)
    atm.addColorStop(0, h2r('#4FC3F7', 0.15)); atm.addColorStop(1, 'transparent')
    ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(ex, ey, er*1.25, 0, Math.PI*2); ctx.fill()
  }

  // ── PLANT GROWING from ground ──────────────────────────────────────
  const plantP = eO(p01(t, 4, 10))
  const px = W * 0.58, py = H * 0.72
  if (plantP > 0.02) {
    // Stem grows upward
    const stemH = lerp(0, H*0.32, plantP)
    ctx.save()
    ctx.strokeStyle = '#33691E'; ctx.lineWidth = 8*Math.min(plantP,1)
    ctx.shadowColor = C.green; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.moveTo(px, py)
    ctx.bezierCurveTo(px-10, py-stemH*0.3, px+15, py-stemH*0.6, px, py-stemH)
    ctx.stroke(); ctx.shadowBlur = 0; ctx.restore()

    // Leaves unfurl (left then right)
    const leaf1P = eO(p01(t, 6, 9.5))
    if (leaf1P > 0) {
      ctx.save(); ctx.globalAlpha = leaf1P
      const lx = px - 10, ly = py - stemH*0.55
      ctx.fillStyle = '#4CAF50'
      ctx.shadowColor = C.green; ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(lx, ly)
      ctx.bezierCurveTo(lx-50*leaf1P, ly-30*leaf1P, lx-70*leaf1P, ly+10*leaf1P, lx-30*leaf1P, ly+20*leaf1P)
      ctx.bezierCurveTo(lx-10, ly+15, lx, ly+5, lx, ly)
      ctx.fill(); ctx.restore()
    }
    const leaf2P = eO(p01(t, 7.5, 11))
    if (leaf2P > 0) {
      ctx.save(); ctx.globalAlpha = leaf2P
      const lx2 = px+12, ly2 = py-stemH*0.72
      ctx.fillStyle = '#388E3C'
      ctx.shadowColor = C.green; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.moveTo(lx2, ly2)
      ctx.bezierCurveTo(lx2+55*leaf2P, ly2-25*leaf2P, lx2+65*leaf2P, ly2+15*leaf2P, lx2+25*leaf2P, ly2+22*leaf2P)
      ctx.bezierCurveTo(lx2+8, ly2+14, lx2, ly2+4, lx2, ly2)
      ctx.fill(); ctx.restore()
    }

    // Flower/fruit at top
    const flowerP = eO(p01(t, 12, 16))
    if (flowerP > 0.05) {
      const fx = px, fy = py - stemH
      for (let i = 0; i < 8; i++) {
        const fa = (i/8)*Math.PI*2
        ctx.save(); ctx.globalAlpha = flowerP
        ctx.fillStyle = i%2===0 ? C.yellow : C.orange
        ctx.shadowColor = C.yellow; ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.ellipse(fx+Math.cos(fa)*18*flowerP, fy+Math.sin(fa)*18*flowerP, 8*flowerP, 5*flowerP, fa, 0, Math.PI*2)
        ctx.fill(); ctx.restore()
      }
      // Center
      ctx.save(); ctx.globalAlpha = flowerP
      ctx.fillStyle = '#FFF176'
      ctx.shadowColor = C.yellow; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.arc(fx, fy, 9*flowerP, 0, Math.PI*2); ctx.fill()
      ctx.restore()
    }
  }

  // ── CO2 + H2O arrows going into leaf ────────────────────────────────
  if (t > 9) {
    ;[[`CO₂`, W*0.28, H*0.45, C.cyan], [`H₂O`, W*0.32, H*0.62, C.blue]].forEach(([mol, mx, my, mc], i) => {
      const mp = eO(p01(t, 9+i*1.2, 12+i*1.2))
      if (mp <= 0) return
      ctx.save(); ctx.globalAlpha = mp
      // Arrow toward plant
      ctx.strokeStyle = mc; ctx.lineWidth = 2.5
      ctx.setLineDash([6,4]); ctx.lineDashOffset = -t*20
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(lerp(mx, W*0.5, mp), lerp(my, H*0.58, mp)); ctx.stroke()
      ctx.setLineDash([])
      // Label bubble
      ctx.fillStyle = h2r(mc, 0.2); ctx.strokeStyle = mc; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(mx-22, my-14, 44, 26, 8); ctx.fill(); ctx.stroke()
      ctx.font = '700 13px Inter,sans-serif'; ctx.fillStyle = mc
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(mol, mx, my)
      ctx.restore()
    })
  }

  // ── O2 + Glucose output ────────────────────────────────────────────
  if (t > 14) {
    ;[[`O₂`, W*0.7, H*0.4, C.green], [`Glucose`, W*0.75, H*0.55, C.yellow]].forEach(([mol, ox, oy, oc]) => {
      const op = eO(p01(t, 14+0.8, 17+0.8))
      if (op <= 0) return
      ctx.save(); ctx.globalAlpha = op
      ctx.strokeStyle = oc; ctx.lineWidth = 2.5
      ctx.setLineDash([6,4]); ctx.lineDashOffset = -t*20
      const tx2 = lerp(W*0.6, ox, op), ty2 = lerp(H*0.5, oy, op)
      ctx.beginPath(); ctx.moveTo(W*0.6, H*0.5); ctx.lineTo(tx2, ty2); ctx.stroke()
      ctx.setLineDash([])
      if (op > 0.6) {
        ctx.fillStyle = h2r(oc, 0.2); ctx.strokeStyle = oc; ctx.lineWidth = 1.5
        const lw = ctx.measureText(mol).width + 24
        ctx.beginPath(); ctx.roundRect(ox-lw/2, oy-14, lw, 26, 8); ctx.fill(); ctx.stroke()
        ctx.font = '700 12px Inter,sans-serif'; ctx.fillStyle = oc
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(mol, ox, oy)
      }
      ctx.restore()
    })
  }

  // ── Title label ────────────────────────────────────────────────────
  if (t > 1) {
    const tp = eO(p01(t, 1, 3))
    ctx.save(); ctx.globalAlpha = tp
    ctx.font = '800 24px Inter,sans-serif'
    ctx.fillStyle = C.text; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.shadowColor = C.green; ctx.shadowBlur = 12
    ctx.fillText('Photosynthesis', W/2, 14)
    ctx.font = '400 13px Inter,sans-serif'
    ctx.fillStyle = C.muted; ctx.shadowBlur = 0
    ctx.fillText('How plants convert sunlight → food + oxygen', W/2, 44)
    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER: HTML / Web development
// Browser window builds → DOM tree appears → elements light up
// ─────────────────────────────────────────────────────────────────────────────
function renderHTML(ctx, W, H, t) {
  ctx.fillStyle = '#0A0A16'; ctx.fillRect(0, 0, W, H)

  // Browser chrome slides in
  const bp = eO(p01(t, 0, 1.5))
  if (bp > 0.05) {
    ctx.save(); ctx.globalAlpha = bp
    const bx = W*0.06, by = H*0.06, bw = W*0.88, bh = H*0.82
    ctx.shadowColor = C.purple; ctx.shadowBlur = 20*bp
    ctx.fillStyle = '#111122'
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill()
    // Chrome bar
    ctx.fillStyle = '#1a1a2e'
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 34, [10,10,0,0]); ctx.fill()
    ctx.strokeStyle = h2r(C.purple, 0.5); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.stroke()
    // Dots
    ;[[16,'#EF4444'],[34,'#F59E0B'],[52,'#10B981']].forEach(([dx,dc])=>{
      ctx.fillStyle = dc; ctx.beginPath(); ctx.arc(bx+dx, by+17, 7, 0, Math.PI*2); ctx.fill()
    })
    // URL bar
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath(); ctx.roundRect(bx+76, by+6, bw-100, 22, 11); ctx.fill()
    ctx.font = '400 10px Inter,sans-serif'; ctx.fillStyle = C.muted
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText('  🌐  file://index.html', bx+82, by+17)
    ctx.restore()
  }

  // Code lines appear on left half
  const codeLines = [
    { code: '<!DOCTYPE html>',           color: C.muted,   indent: 0 },
    { code: '<html lang="en">',          color: C.orange,  indent: 0 },
    { code: '  <head>',                  color: C.orange,  indent: 1 },
    { code: '    <title>My Page</title>',color: C.green,   indent: 2 },
    { code: '  </head>',                 color: C.orange,  indent: 1 },
    { code: '  <body>',                  color: C.orange,  indent: 1 },
    { code: '    <h1>Hello World</h1>',  color: C.cyan,    indent: 2 },
    { code: '    <p>Welcome!</p>',        color: C.cyan,    indent: 2 },
    { code: '    <button>Click</button>',color: C.yellow,  indent: 2 },
    { code: '  </body>',                 color: C.orange,  indent: 1 },
    { code: '</html>',                   color: C.orange,  indent: 0 },
  ]

  const lh = 22, codeX = W*0.08 + 10, codeY = H*0.14
  codeLines.forEach((ln, i) => {
    const lp = eO(p01(t, 1.5 + i*0.7, 2.5 + i*0.7))
    if (lp <= 0) return
    ctx.save(); ctx.globalAlpha = lp
    ctx.font = `400 11.5px "JetBrains Mono",monospace`
    ctx.fillStyle = ln.color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(ln.code.slice(0, Math.ceil(lp * ln.code.length)), codeX, codeY + i * lh)
    ctx.restore()
  })

  // Live preview on right half — elements appear one by one
  const previewX = W*0.5, previewY = H*0.12, previewW = W*0.44
  if (t > 6) {
    const pp = eO(p01(t, 6, 8))
    ctx.save(); ctx.globalAlpha = pp
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath(); ctx.roundRect(previewX, previewY, previewW, H*0.72, 4); ctx.fill()
    ctx.restore()
  }
  // h1 appears
  if (t > 8) {
    const hp = eO(p01(t, 8, 9.5))
    ctx.save(); ctx.globalAlpha = hp
    ctx.font = `800 ${lerp(0, 20, hp)}px Inter,sans-serif`
    ctx.fillStyle = '#111827'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText('Hello World', previewX + 20, previewY + 20)
    ctx.restore()
  }
  if (t > 10) {
    const pp2 = eO(p01(t, 10, 11.5))
    ctx.save(); ctx.globalAlpha = pp2
    ctx.font = '400 12px Inter,sans-serif'; ctx.fillStyle = '#4B5563'
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText('Welcome!', previewX+20, previewY+50)
    ctx.restore()
  }
  if (t > 12) {
    const bp2 = eO(p01(t, 12, 13.5))
    ctx.save(); ctx.globalAlpha = bp2
    ctx.fillStyle = '#4F46E5'
    ctx.beginPath(); ctx.roundRect(previewX+20, previewY+80, 70*bp2, 28, 6); ctx.fill()
    ctx.font = '600 11px Inter,sans-serif'; ctx.fillStyle = 'white'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Click', previewX+55, previewY+94)
    ctx.restore()
  }

  // DOM Tree visualization (18s+)
  if (t > 17) {
    const treeNodes = [
      { label:'html', x:W/2, y:H*0.2, parent:null, color:C.orange },
      { label:'head', x:W*0.38, y:H*0.34, parent:0, color:C.yellow },
      { label:'body', x:W*0.62, y:H*0.34, parent:0, color:C.cyan },
      { label:'title', x:W*0.32, y:H*0.48, parent:1, color:C.green },
      { label:'h1', x:W*0.53, y:H*0.48, parent:2, color:C.cyan },
      { label:'p', x:W*0.65, y:H*0.48, parent:2, color:C.cyan },
      { label:'button', x:W*0.77, y:H*0.48, parent:2, color:C.yellow },
    ]
    treeNodes.forEach((n, i) => {
      const np = eO(p01(t, 17+i*0.6, 18.5+i*0.6))
      if (np <= 0) return
      // Line to parent
      if (n.parent !== null) {
        const par = treeNodes[n.parent]
        ctx.save(); ctx.globalAlpha = np*0.5
        ctx.strokeStyle = n.color; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(par.x, par.y+12); ctx.lineTo(n.x, n.y-12); ctx.stroke()
        ctx.restore()
      }
      // Node
      ctx.save(); ctx.globalAlpha = np
      ctx.fillStyle = h2r(n.color, 0.2); ctx.strokeStyle = n.color; ctx.lineWidth = 1.5
      const nw = ctx.measureText('<'+n.label+'>').width+16
      ctx.beginPath(); ctx.roundRect(n.x-nw/2, n.y-12, nw, 24, 6); ctx.fill(); ctx.stroke()
      ctx.font = '600 10.5px "JetBrains Mono",monospace'; ctx.fillStyle = n.color
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('<'+n.label+'>', n.x, n.y)
      ctx.restore()
    })
  }

  // Title
  const titleP = eO(p01(t, 0, 1.5))
  ctx.save(); ctx.globalAlpha = titleP
  ctx.font = '800 22px Inter,sans-serif'; ctx.fillStyle = C.text
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.shadowColor = C.purple; ctx.shadowBlur = 12
  ctx.fillText('HTML — Building the Web', W/2, 14)
  ctx.restore()
}

// ── RENDERER: Biology / DNA ────────────────────────────────────────────────────
function renderBiology(ctx, W, H, t) {
  ctx.fillStyle = '#04040F'; ctx.fillRect(0, 0, W, H)
  // DNA double helix
  const cx = W/2, turns = 3, helixH = H*0.65, startY = H*0.17
  const step = helixH / (turns * 20)
  for (let i = 0; i < turns*20; i++) {
    const ip = eO(p01(t, 0.5 + i*0.08, 1.5 + i*0.08))
    if (ip <= 0) continue
    const y = startY + i * step
    const a1 = (i/20)*Math.PI*2, a2 = a1 + Math.PI
    const x1 = cx + Math.cos(a1)*W*0.18, x2 = cx + Math.cos(a2)*W*0.18
    const c1 = [C.cyan, C.purple, C.green, C.pink][i%4]
    const c2 = [C.orange, C.yellow, C.red, C.blue][i%4]
    ctx.save(); ctx.globalAlpha = ip
    // Backbone dots
    ctx.fillStyle = c1; ctx.shadowColor = c1; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.arc(x1, y, 5, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = c2; ctx.shadowColor = c2
    ctx.beginPath(); ctx.arc(x2, y, 5, 0, Math.PI*2); ctx.fill()
    // Base pair connection
    if (i%4 === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
    }
    ctx.restore()
  }
  // Backbone spline
  for (let strand = 0; strand < 2; strand++) {
    const bp3 = eO(p01(t, 0, 2))
    ctx.save(); ctx.globalAlpha = bp3*0.6
    ctx.strokeStyle = strand===0 ? C.cyan : C.purple
    ctx.lineWidth = 2.5; ctx.shadowColor = strand===0 ? C.cyan : C.purple; ctx.shadowBlur = 8
    ctx.beginPath()
    for (let i = 0; i <= turns*20; i++) {
      const y = startY + i*step
      const a = (i/20)*Math.PI*2 + (strand===1?Math.PI:0)
      const x = cx + Math.cos(a)*W*0.18
      i===0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke(); ctx.restore()
  }
  // Labels
  if (t > 8) {
    const lp = eO(p01(t, 8, 10))
    ctx.save(); ctx.globalAlpha = lp
    ctx.font = '700 12px Inter,sans-serif'; ctx.fillStyle = C.cyan; ctx.textAlign = 'left'
    ctx.fillText('Sugar-Phosphate Backbone', cx+W*0.22, H*0.35)
    ctx.fillStyle = C.text; ctx.font = '600 11px Inter,sans-serif'
    ctx.fillText('Base Pairs:', cx+W*0.22, H*0.5)
    ;[['A-T', C.cyan], ['G-C', C.green]].forEach(([pair, c], i) => {
      ctx.fillStyle = c; ctx.fillText(pair, cx+W*0.22, H*0.54 + i*16)
    })
    ctx.restore()
  }
  const tp = eO(p01(t, 0, 1.5))
  ctx.save(); ctx.globalAlpha = tp
  ctx.font = '800 22px Inter,sans-serif'; ctx.fillStyle = C.text
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.shadowColor = C.cyan; ctx.shadowBlur = 12
  ctx.fillText('DNA Double Helix', W/2, 14); ctx.restore()
}

// ── RENDERER: Space / Solar System ────────────────────────────────────────────
function renderSpace(ctx, W, H, t) {
  ctx.fillStyle = '#010108'; ctx.fillRect(0, 0, W, H)
  // Stars
  for (let i = 0; i < 120; i++) {
    const sx = ((i*137.5)%100)/100*W, sy = ((i*73.1)%100)/100*H
    const sa = 0.3+Math.sin(t*0.8+i)*0.3
    ctx.fillStyle = `rgba(255,255,255,${sa})`
    ctx.beginPath(); ctx.arc(sx, sy, ((i%3)+0.5)*0.7, 0, Math.PI*2); ctx.fill()
  }
  // Sun
  const sunR = Math.min(W,H)*0.08
  const sunG = ctx.createRadialGradient(W*0.5,H*0.5,0,W*0.5,H*0.5,sunR)
  sunG.addColorStop(0,'#FFFDE7'); sunG.addColorStop(0.4,'#FDD835'); sunG.addColorStop(1,'#E65100')
  ctx.fillStyle = sunG; ctx.shadowColor=C.yellow; ctx.shadowBlur=50
  ctx.beginPath(); ctx.arc(W*0.5,H*0.5,sunR,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0

  // Planets orbiting
  const planets = [
    {name:'Mercury', orbitR:sunR*1.8, r:sunR*.12, color:'#9E9E9E', speed:2.4},
    {name:'Venus',   orbitR:sunR*2.5, r:sunR*.18, color:'#F5CBA7', speed:1.6},
    {name:'Earth',   orbitR:sunR*3.3, r:sunR*.2,  color:'#4FC3F7', speed:1.0},
    {name:'Mars',    orbitR:sunR*4.2, r:sunR*.15, color:'#EF5350', speed:0.7},
    {name:'Jupiter', orbitR:sunR*5.8, r:sunR*.38, color:'#FFE082', speed:0.3},
  ]
  planets.forEach((p, i) => {
    const pp = eO(p01(t, i*0.8, i*0.8+2))
    if (pp <= 0) return
    // Orbit ring
    ctx.save(); ctx.globalAlpha = pp*0.2
    ctx.strokeStyle = 'white'; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.ellipse(W/2,H/2,p.orbitR,p.orbitR*0.35,0,0,Math.PI*2); ctx.stroke()
    ctx.restore()
    // Planet
    const angle = t*p.speed + i*1.2
    const px2 = W/2 + Math.cos(angle)*p.orbitR
    const py2 = H/2 + Math.sin(angle)*p.orbitR*0.35
    const pg = ctx.createRadialGradient(px2-p.r*.3,py2-p.r*.3,0,px2,py2,p.r*pp)
    pg.addColorStop(0,'white'); pg.addColorStop(0.3,p.color); pg.addColorStop(1,p.color+'88')
    ctx.fillStyle = pg; ctx.shadowColor = p.color; ctx.shadowBlur = 12*pp
    ctx.globalAlpha = pp
    ctx.beginPath(); ctx.arc(px2, py2, p.r*pp, 0, Math.PI*2); ctx.fill()
    ctx.shadowBlur = 0; ctx.globalAlpha = 1
    if (pp > 0.7) {
      ctx.font = '600 9px Inter,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.globalAlpha = pp
      ctx.fillText(p.name, px2, py2+p.r+3); ctx.globalAlpha = 1
    }
  })
  const tp = eO(p01(t,0,1.5))
  ctx.save(); ctx.globalAlpha=tp; ctx.font='800 22px Inter,sans-serif'; ctx.fillStyle=C.text
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.shadowColor=C.yellow; ctx.shadowBlur=12
  ctx.fillText('The Solar System',W/2,14); ctx.restore()
}

// ── RENDERER: Physics — pendulum + force vectors ──────────────────────────────
function renderPhysics(ctx, W, H, t) {
  ctx.fillStyle = '#06060F'; ctx.fillRect(0, 0, W, H)
  // Grid
  ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = 'white'; ctx.lineWidth = 0.5
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
  ctx.restore()
  // Pendulum
  const pivotX = W/2, pivotY = H*0.18, ropeL = H*0.42
  const amplitude = 1.1, omega = 1.8
  const angle = amplitude * Math.cos(omega * t) * eO(p01(t,0,1))
  const bobX = pivotX + Math.sin(angle)*ropeL, bobY = pivotY + Math.cos(angle)*ropeL
  // Pivot
  ctx.fillStyle = '#9CA3AF'; ctx.shadowColor='#9CA3AF'; ctx.shadowBlur=8
  ctx.beginPath(); ctx.arc(pivotX, pivotY, 8, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur=0
  // Rope
  const rp2 = eO(p01(t,0,0.8))
  ctx.save(); ctx.globalAlpha=rp2; ctx.strokeStyle='#94A3B8'; ctx.lineWidth=2.5
  ctx.beginPath(); ctx.moveTo(pivotX,pivotY); ctx.lineTo(bobX,bobY); ctx.stroke()
  ctx.restore()
  // Bob (3D sphere)
  const bobR = Math.min(W,H)*0.052
  const bg2 = ctx.createRadialGradient(bobX-bobR*.3,bobY-bobR*.3,0,bobX,bobY,bobR)
  bg2.addColorStop(0,'#E0E7FF'); bg2.addColorStop(0.4,C.indigo); bg2.addColorStop(1,'#1E1B4B')
  ctx.fillStyle=bg2; ctx.shadowColor=C.purple; ctx.shadowBlur=20
  ctx.beginPath(); ctx.arc(bobX,bobY,bobR,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0

  // Velocity vector
  const vx = -amplitude*omega*Math.sin(omega*t)*ropeL*Math.cos(angle)
  const vy = amplitude*omega*Math.sin(omega*t)*ropeL*Math.sin(Math.PI/2-angle)
  const vMag = Math.sqrt(vx*vx+vy*vy)*0.15
  if (vMag > 2 && t > 1) {
    ctx.save(); ctx.globalAlpha=0.9
    ctx.strokeStyle=C.cyan; ctx.lineWidth=2.5; ctx.shadowColor=C.cyan; ctx.shadowBlur=8
    ctx.beginPath(); ctx.moveTo(bobX,bobY); ctx.lineTo(bobX+vx*0.15,bobY+vy*0.15); ctx.stroke()
    ctx.fillStyle=C.cyan; ctx.font='600 10px Inter,sans-serif'
    ctx.textAlign='left'; ctx.fillText('v',bobX+vx*0.15+6,bobY+vy*0.15); ctx.shadowBlur=0; ctx.restore()
  }
  // Gravity vector
  ctx.save(); ctx.globalAlpha=0.8
  ctx.strokeStyle=C.red; ctx.lineWidth=2.5; ctx.shadowColor=C.red; ctx.shadowBlur=8
  ctx.beginPath(); ctx.moveTo(bobX,bobY); ctx.lineTo(bobX,bobY+45); ctx.stroke()
  ctx.fillStyle=C.red; ctx.font='600 10px Inter,sans-serif'
  ctx.textAlign='left'; ctx.fillText('g',bobX+6,bobY+50); ctx.shadowBlur=0; ctx.restore()

  // Equation
  if (t > 5) {
    const ep = eO(p01(t,5,7))
    ctx.save(); ctx.globalAlpha=ep
    ctx.fillStyle=h2r(C.purple,.15); ctx.strokeStyle=h2r(C.purple,.5); ctx.lineWidth=1.5
    ctx.beginPath(); ctx.roundRect(W*0.62,H*0.25,W*0.3,48,10); ctx.fill(); ctx.stroke()
    ctx.font='700 13px "JetBrains Mono",monospace'; ctx.fillStyle=C.text
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('T = 2π√(L/g)',W*0.77,H*0.25+24)
    ctx.restore()
  }
  const tp2=eO(p01(t,0,1.5))
  ctx.save(); ctx.globalAlpha=tp2; ctx.font='800 22px Inter,sans-serif'; ctx.fillStyle=C.text
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.shadowColor=C.purple; ctx.shadowBlur=12
  ctx.fillText('Simple Pendulum',W/2,14); ctx.restore()
}

// ── RENDERER: AI / Neural Network ────────────────────────────────────────────
function renderAI(ctx, W, H, t) {
  ctx.fillStyle = '#020210'; ctx.fillRect(0, 0, W, H)
  const layers = [3, 5, 5, 4, 2]
  const layerX = layers.map((_, i) => W*0.12 + i * (W*0.76/(layers.length-1)))
  const nodes = []
  layers.forEach((count, li) => {
    const lx = layerX[li]
    for (let ni = 0; ni < count; ni++) {
      const ny = H/2 + (ni - (count-1)/2) * (H*0.62/(Math.max(...layers)-1))
      nodes.push({ x:lx, y:ny, layer:li, idx:ni })
    }
  })

  // Connections
  nodes.forEach(n => {
    if (n.layer >= layers.length-1) return
    const nextLayerNodes = nodes.filter(m => m.layer === n.layer+1)
    nextLayerNodes.forEach(m => {
      const cp = eO(p01(t, n.layer*1.5, n.layer*1.5+2))
      if (cp <= 0) return
      const activation = Math.sin(t*2 + n.idx*0.8 + m.idx*0.5)*0.5+0.5
      ctx.save(); ctx.globalAlpha = cp * (0.1 + activation*0.3)
      ctx.strokeStyle = activation > 0.6 ? C.cyan : h2r(C.purple, 0.7)
      ctx.lineWidth = 0.8 + activation*1.2
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke()
      // Signal pulse
      if (t > 3 && activation > 0.7) {
        const pulse = (t*2 + n.idx*0.8) % 2.5 / 2.5
        const px3 = lerp(n.x, m.x, pulse), py3 = lerp(n.y, m.y, pulse)
        ctx.fillStyle = C.cyan; ctx.shadowColor = C.cyan; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(px3, py3, 3, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0
      }
      ctx.restore()
    })
  })
  // Nodes
  nodes.forEach(n => {
    const np2 = eO(p01(t, n.layer*1.5, n.layer*1.5+1.2))
    if (np2 <= 0) return
    const activation = Math.sin(t*2 + n.idx*0.8 + n.layer*0.6)*0.5+0.5
    const nc = n.layer===0 ? C.cyan : n.layer===layers.length-1 ? C.green : C.purple
    const nr = 10 + activation*6
    const ng = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,nr*np2)
    ng.addColorStop(0, 'white'); ng.addColorStop(0.4, nc); ng.addColorStop(1, h2r(nc,0.2))
    ctx.fillStyle = ng; ctx.shadowColor = nc; ctx.shadowBlur = 12*activation*np2
    ctx.beginPath(); ctx.arc(n.x, n.y, nr*np2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0
  })
  // Layer labels
  const layerLabels = ['Input','Hidden','Hidden','Hidden','Output']
  if (t > 6) {
    const lp = eO(p01(t,6,8))
    layerLabels.forEach((l,i) => {
      ctx.save(); ctx.globalAlpha = lp
      ctx.font='600 10px Inter,sans-serif'; ctx.fillStyle=C.muted
      ctx.textAlign='center'; ctx.fillText(l, layerX[i], H*0.88); ctx.restore()
    })
  }
  const tp3=eO(p01(t,0,1.5))
  ctx.save(); ctx.globalAlpha=tp3; ctx.font='800 22px Inter,sans-serif'; ctx.fillStyle=C.text
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.shadowColor=C.purple; ctx.shadowBlur=12
  ctx.fillText('Neural Network',W/2,14); ctx.restore()
}

// ── RENDERER: Generic concept (fallback) ──────────────────────────────────────
function renderConcept(ctx, W, H, t, scene, color) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H)
  const g2 = ctx.createRadialGradient(W/2,H*.4,0,W/2,H*.4,W*.6)
  g2.addColorStop(0, h2r(color,.1)); g2.addColorStop(1,'transparent')
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,H)
  const kps = (scene?.keyPoints||[]).slice(0,5)
  // Center orb
  const cp = eO(p01(t,0,2))
  const cr = lerp(0,55,cp)
  if(cr>2){
    const cg3=ctx.createRadialGradient(W/2,H*.44,0,W/2,H*.44,cr)
    cg3.addColorStop(0,h2r(color,.5)); cg3.addColorStop(1,h2r(color,.1))
    ctx.fillStyle=cg3; ctx.shadowColor=color; ctx.shadowBlur=24
    ctx.beginPath(); ctx.arc(W/2,H*.44,cr,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
  }
  // Nodes
  kps.forEach((kp,i) => {
    const delay=1.5+i*2.4, np=eO(p01(t,delay,delay+2))
    if(np<=0) return
    const angle=(i/kps.length)*Math.PI*2-Math.PI/2
    const nc=[color,C.cyan,C.green,C.yellow,C.pink][i%5]
    const dist=Math.min(W,H)*.32*np
    const nx=W/2+Math.cos(angle)*dist, ny=H*.44+Math.sin(angle)*dist*.68
    ctx.save(); ctx.globalAlpha=np*.5; ctx.strokeStyle=nc; ctx.lineWidth=1.5
    ctx.setLineDash([5,4]); ctx.lineDashOffset=-t*15
    ctx.beginPath(); ctx.moveTo(W/2,H*.44); ctx.lineTo(nx,ny); ctx.stroke()
    ctx.setLineDash([]); ctx.restore()
    const nr2=lerp(0,28,eO(p01(t,delay+.4,delay+1.8)))
    if(nr2>2){
      const ng2=ctx.createRadialGradient(nx,ny,0,nx,ny,nr2)
      ng2.addColorStop(0,h2r(nc,.4)); ng2.addColorStop(1,h2r(nc,.08))
      ctx.fillStyle=ng2; ctx.shadowColor=nc; ctx.shadowBlur=12
      ctx.beginPath(); ctx.arc(nx,ny,nr2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
    }
    if(np>.5){
      const lw2=Math.min(W*.28,140)
      ctx.save(); ctx.globalAlpha=np
      ctx.fillStyle=h2r(nc,.15); ctx.strokeStyle=h2r(nc,.45); ctx.lineWidth=1.2
      ctx.beginPath(); ctx.roundRect(nx+Math.cos(angle)*38-lw2/2, ny+Math.sin(angle)*28-14, lw2, 28, 7)
      ctx.fill(); ctx.stroke()
      ctx.font='600 10.5px Inter,sans-serif'; ctx.fillStyle=C.text
      ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillText(kp.slice(0,22), nx+Math.cos(angle)*38, ny+Math.sin(angle)*28)
      ctx.restore()
    }
  })
  const tp4=eO(p01(t,0,1.5))
  ctx.save(); ctx.globalAlpha=tp4
  ctx.font='800 20px Inter,sans-serif'; ctx.fillStyle=C.text
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.shadowColor=color; ctx.shadowBlur=12
  ctx.fillText((scene?.title||'').slice(0,40),W/2,14); ctx.restore()
}

// ── Narration bar + top bar ────────────────────────────────────────────────────
function renderNar(ctx, W, H, t, words) {
  const pct = Math.min(t/SCENE_DURATION, 1)
  const shown = words.slice(0, Math.ceil(pct*words.length))
  const lineLen=11, lines=[]
  for(let i=0;i<shown.length;i+=lineLen) lines.push(shown.slice(i,i+lineLen).join(' '))
  const vis=lines.slice(-2), bh=52, by2=H-bh-6
  ctx.save()
  ctx.fillStyle='rgba(4,4,10,.9)'
  ctx.beginPath(); ctx.roundRect(W*.03,by2,W*.94,bh,8); ctx.fill()
  ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1; ctx.stroke()
  vis.forEach((ln,li)=>{
    ctx.font=li===vis.length-1?'500 12.5px Inter,sans-serif':'400 11px Inter,sans-serif'
    ctx.fillStyle=li===vis.length-1?C.text:'rgba(248,250,252,.4)'
    ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(ln,W/2,by2+13+li*24)
  })
  ctx.restore()
}
function renderTopBar(ctx, W, t, scN, dur, color) {
  const p=Math.min(t/SCENE_DURATION,1)
  ctx.save()
  ctx.fillStyle=h2r(color,.15); ctx.fillRect(0,0,W,4)
  const g3=ctx.createLinearGradient(0,0,W*p,0)
  g3.addColorStop(0,color); g3.addColorStop(1,h2r(color,.7))
  ctx.fillStyle=g3; ctx.shadowColor=color; ctx.shadowBlur=8; ctx.fillRect(0,0,W*p,4)
  ctx.font='600 10px Inter,sans-serif'; ctx.fillStyle=h2r(color,.85); ctx.shadowBlur=0
  ctx.textAlign='right'; ctx.textBaseline='top'
  ctx.fillText(`SCENE ${scN}  ·  ${dur}`,W-12,9); ctx.restore()
}

// ── Main canvas hook ───────────────────────────────────────────────────────────
function useVideoCanvas(canvasRef, lesson, scene, playing, color, onEnd) {
  const rafRef = useRef(null), startTs = useRef(null), endedR = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !scene) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const topic = detectTopic(lesson, scene)
    const words = (scene.narration || '').split(' ')
    startTs.current = null; endedR.current = false

    const renderers = {
      photosynthesis: renderPhotosynthesis,
      html:           renderHTML,
      code:           (c,w,h,t) => renderHTML(c,w,h,t),
      biology:        renderBiology,
      space:          renderSpace,
      physics:        renderPhysics,
      ai:             renderAI,
    }
    const draw = renderers[topic] || ((c,w,h,t,s,col) => renderConcept(c,w,h,t,s,col))

    function frame(ts) {
      if (!startTs.current) startTs.current = ts
      const t = playing ? (ts - startTs.current) / 1000 : 2.5
      draw(ctx, W, H, t, scene, color)
      renderNar(ctx, W, H, t, words)
      renderTopBar(ctx, W, t, scene.id||1, scene.duration||'', color)
      if (playing && t < SCENE_DURATION) {
        rafRef.current = requestAnimationFrame(frame)
      } else if (playing && t >= SCENE_DURATION && !endedR.current) {
        endedR.current = true; onEnd?.()
      }
    }

    if (playing) { rafRef.current = requestAnimationFrame(frame) }
    else {
      draw(ctx, W, H, 2.5, scene, color)
      renderTopBar(ctx, W, 0, scene.id||1, scene.duration||'', color)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [scene, playing, color, onEnd, canvasRef, lesson])
}

// ── Web Speech API voice narration ────────────────────────────────────────────
function useVoiceNarration(scene, playing) {
  const uttRef = useRef(null)

  useEffect(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (!playing || !scene?.narration) return

    const utt = new SpeechSynthesisUtterance(scene.narration)
    utt.rate = 0.92
    utt.pitch = 1.0
    utt.volume = 0.95

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0]
    if (preferred) utt.voice = preferred

    window.speechSynthesis.speak(utt)
    uttRef.current = utt

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [scene?.id, scene?.narration, playing])

  // Also load voices on first mount
  useEffect(() => {
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {}
    }
  }, [])
}

// ── LessonVideoEngine — main export ───────────────────────────────────────────
const SICONS = { introduction:'🎬', concept:'💡', example:'⚙️', demo:'🖥️', summary:'✅' }

export default function LessonVideoEngine({ lesson, color='#8B5CF6', onComplete }) {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [playing,  setPlaying]  = useState(false)
  const [elapsed,  setElapsed]  = useState(0)
  const [full,     setFull]     = useState(false)
  const [voiceOn,  setVoiceOn]  = useState(true)
  const canvasRef = useRef(null)
  const timerRef  = useRef(null)

  const scenes = lesson?.scenes || []
  const scene  = scenes[sceneIdx]

  // Timer for UI
  useEffect(() => {
    clearInterval(timerRef.current)
    if (!playing) return
    const start = Date.now() - elapsed*1000
    timerRef.current = setInterval(() => {
      const e = (Date.now()-start)/1000
      setElapsed(Math.min(e, SCENE_DURATION))
      if (e >= SCENE_DURATION) clearInterval(timerRef.current)
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [playing])  // eslint-disable-line

  useEffect(() => { setElapsed(0); setPlaying(false) }, [sceneIdx])

  const handleEnd = useCallback(() => {
    setPlaying(false)
    if (sceneIdx < scenes.length-1) {
      setTimeout(() => { setSceneIdx(i=>i+1); setPlaying(true) }, 700)
    } else { onComplete?.() }
  }, [sceneIdx, scenes.length, onComplete])

  useVideoCanvas(canvasRef, lesson, scene, playing, color, handleEnd)
  useVoiceNarration(voiceOn ? scene : null, playing)

  // Stop voice when paused
  useEffect(() => {
    if (!playing) window.speechSynthesis?.cancel()
  }, [playing])

  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
  const pct = (elapsed/SCENE_DURATION)*100
  const topic = detectTopic(lesson, scene)
  const topicBadgeColor = { photosynthesis:C.green, html:C.orange, code:C.purple, biology:C.cyan, space:C.yellow, physics:C.indigo, ai:C.purple }[topic] || color

  if (!scenes.length) return null

  return (
    <div style={{ background:C.bg, borderRadius:full?0:16, border:`1px solid ${h2r(color,.35)}`, overflow:'hidden', position:full?'fixed':'relative', inset:full?0:'auto', zIndex:full?9990:'auto', boxShadow:`0 0 60px ${h2r(color,.22)}` }}>

      {/* Canvas */}
      <div style={{ position:'relative', aspectRatio:'16/9', maxHeight:full?'100vh':500, background:C.bg }}>
        <canvas ref={canvasRef} width={960} height={540} style={{ width:'100%', height:'100%', display:'block' }} />

        {/* Play overlay */}
        <AnimatePresence>
          {!playing && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setPlaying(true)}
              style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.5)', cursor:'pointer' }}>
              <motion.div
                whileHover={{ scale:1.1 }} whileTap={{ scale:.93 }}
                animate={{ boxShadow:[`0 0 30px ${h2r(color,.4)}`, `0 0 60px ${h2r(color,.8)}`, `0 0 30px ${h2r(color,.4)}`] }}
                transition={{ duration:2, repeat:Infinity }}
                style={{ width:86, height:86, borderRadius:'50%', background:`linear-gradient(135deg,${color},${h2r(color,.75)})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.4rem', paddingLeft:8 }}>
                ▶
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top-left badge */}
        <div style={{ position:'absolute', top:10, left:12, background:'rgba(0,0,0,.75)', backdropFilter:'blur(8px)', borderRadius:8, padding:'4px 10px', fontSize:'0.68rem', fontWeight:700, color:topicBadgeColor, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          {SICONS[scene?.type]||'📚'} {topic}
        </div>

        {/* Controls: voice + fullscreen */}
        <div style={{ position:'absolute', top:8, right:12, display:'flex', gap:6 }}>
          <button onClick={() => setVoiceOn(v=>!v)}
            style={{ background:voiceOn?h2r(color,.25):'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', border:`1px solid ${voiceOn?color:'rgba(255,255,255,.15)'}`, borderRadius:8, padding:'4px 10px', color:voiceOn?color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:'0.8rem' }}>
            {voiceOn ? '🔊' : '🔇'}
          </button>
          <button onClick={() => setFull(f=>!f)}
            style={{ background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', border:'none', borderRadius:8, padding:'4px 10px', color:'rgba(255,255,255,.7)', cursor:'pointer', fontSize:'0.8rem' }}>
            {full ? '⊡ Exit' : '⊞'}
          </button>
        </div>
      </div>

      {/* Seek + controls */}
      <div style={{ padding:'10px 14px', background:'rgba(0,0,0,.55)' }}>
        <div style={{ height:5, background:'rgba(255,255,255,.08)', borderRadius:999, marginBottom:10, cursor:'pointer', overflow:'hidden' }}
          onClick={e => { const r=e.currentTarget.getBoundingClientRect(); setElapsed(((e.clientX-r.left)/r.width)*SCENE_DURATION) }}>
          <motion.div animate={{ width:`${pct}%` }} transition={{ duration:.12, ease:'linear' }}
            style={{ height:'100%', borderRadius:999, background:`linear-gradient(90deg,${color},${h2r(color,.7)})`, boxShadow:`0 0 10px ${h2r(color,.7)}` }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => { if(sceneIdx>0) setSceneIdx(i=>i-1) }} disabled={sceneIdx===0}
            style={{ background:'none', border:'none', color:sceneIdx===0?'#222':'rgba(255,255,255,.6)', cursor:sceneIdx===0?'default':'pointer', fontSize:'1.1rem', padding:'2px 6px' }}>⏮</button>
          <motion.button whileTap={{ scale:.9 }} onClick={() => setPlaying(v=>!v)}
            style={{ width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg,${color},${h2r(color,.75)})`, border:'none', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', boxShadow:`0 4px 16px ${h2r(color,.5)}`, paddingLeft:playing?0:4 }}>
            {playing ? '⏸' : '▶'}
          </motion.button>
          <button onClick={() => { if(sceneIdx<scenes.length-1) setSceneIdx(i=>i+1) }} disabled={sceneIdx===scenes.length-1}
            style={{ background:'none', border:'none', color:sceneIdx===scenes.length-1?'#222':'rgba(255,255,255,.6)', cursor:sceneIdx===scenes.length-1?'default':'pointer', fontSize:'1.1rem', padding:'2px 6px' }}>⏭</button>
          <span style={{ fontSize:'0.73rem', color:'rgba(255,255,255,.4)', fontVariantNumeric:'tabular-nums', marginLeft:4 }}>
            {fmt(elapsed)} / {fmt(SCENE_DURATION)}
          </span>
          <div style={{ marginLeft:'auto', display:'flex', gap:5, alignItems:'center' }}>
            {scenes.map((_,i) => (
              <motion.button key={i} whileHover={{ scale:1.4 }}
                onClick={() => { setSceneIdx(i); setElapsed(0); setPlaying(false) }}
                style={{ width:i===sceneIdx?22:8, height:8, borderRadius:999, border:'none', cursor:'pointer', padding:0, background:i===sceneIdx?color:i<sceneIdx?h2r(color,.5):'rgba(255,255,255,.15)', transition:'all .22s', boxShadow:i===sceneIdx?`0 0 8px ${color}`:'none' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:'10px 14px 12px', borderTop:'1px solid rgba(255,255,255,.05)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.9rem', color:C.text, marginBottom:1 }}>{sceneIdx+1}. {scene?.title}</div>
          <div style={{ fontSize:'0.7rem', color:C.muted }}>Scene {sceneIdx+1} of {scenes.length} · {scene?.duration} · 🔊 AI Voice</div>
        </div>
        <AnimatePresence>
          {elapsed >= SCENE_DURATION-.3 && sceneIdx < scenes.length-1 && (
            <motion.button initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
              onClick={() => { setSceneIdx(i=>i+1); setElapsed(0); setPlaying(true) }}
              style={{ background:`linear-gradient(135deg,${color},${h2r(color,.8)})`, border:'none', borderRadius:10, padding:'8px 20px', color:'white', cursor:'pointer', fontSize:'0.85rem', fontWeight:700, fontFamily:'Inter,sans-serif', boxShadow:`0 4px 16px ${h2r(color,.4)}` }}>
              Next Scene →
            </motion.button>
          )}
          {sceneIdx === scenes.length-1 && elapsed >= SCENE_DURATION-.3 && (
            <motion.button initial={{ opacity:0 }} animate={{ opacity:1 }}
              onClick={() => onComplete?.()}
              style={{ background:`linear-gradient(135deg,${C.green},${h2r(C.green,.8)})`, border:'none', borderRadius:10, padding:'8px 20px', color:'white', cursor:'pointer', fontSize:'0.85rem', fontWeight:700, fontFamily:'Inter,sans-serif', boxShadow:`0 4px 16px ${h2r(C.green,.4)}` }}>
              ✓ Take Quiz
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
