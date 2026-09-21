import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// AA Dream Wave — Cinematic Visual Engine v4
// • 25-second wall-clock animations per scene
// • Rich image-quality visuals: orbits, grids, morphing shapes, data charts
// • Smooth easing, layered depth, topic-aware icon selection
// ─────────────────────────────────────────────────────────────────────────────

const ANIM_DURATION = 25   // seconds — comfortable viewing pace

const C = {
  bg:'#05050A', panel:'#0C0C18', card:'#101020',
  purple:'#8B5CF6', indigo:'#6366F1', green:'#10B981',
  yellow:'#F59E0B', pink:'#EC4899', cyan:'#06B6D4',
  orange:'#F97316', red:'#EF4444',
  text:'#F8FAFC', muted:'#64748B', sub:'#94A3B8',
}

const PALETTE = [C.purple,C.cyan,C.green,C.yellow,C.pink,C.indigo,C.orange]

function hex2rgba(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${a})`
}
function easeOut(t){return 1-Math.pow(1-Math.min(t,1),3)}
function easeIn(t){return Math.pow(Math.min(t,1),3)}
function easeSpring(t){t=Math.min(t,1);return t<.5?4*t*t*t:(t-1)*(2*t-2)*(2*t-2)+1}
function easeBounce(t){t=Math.min(t,1);if(t<1/2.75)return 7.5625*t*t;else if(t<2/2.75){t-=1.5/2.75;return 7.5625*t*t+.75}else if(t<2.5/2.75){t-=2.25/2.75;return 7.5625*t*t+.9375}else{t-=2.625/2.75;return 7.5625*t*t+.984375}}
function lerp(a,b,t){return a+(b-a)*Math.min(Math.max(t,0),1)}
function clamp(v,mn,mx){return Math.min(Math.max(v,mn),mx)}
function p01(t,start,end){return clamp((t-start)/(end-start),0,1)}

function rr(ctx,x,y,w,h,r,fill,stroke,sw){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r||0)
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw||1.5;ctx.stroke()}
}

function emoji(ctx,e,x,y,size,alpha=1,rot=0){
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(rot)ctx.rotate(rot)
  ctx.font=`${size}px serif`;ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillText(e,0,0);ctx.restore()
}

function glow(ctx,x,y,r,color,alpha=.3){
  ctx.save()
  const g=ctx.createRadialGradient(x,y,0,x,y,r)
  g.addColorStop(0,hex2rgba(color,alpha));g.addColorStop(1,'transparent')
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore()
}

function label(ctx,text,x,y,size,color,align='center',alpha=1){
  ctx.save();ctx.globalAlpha=alpha;ctx.font=`${size}`;ctx.fillStyle=color
  ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(text,x,y);ctx.restore()
}

// ── Topic-aware icon resolver ─────────────────────────────────────────────────
function topicIcon(title=''){
  const t=title.toLowerCase()
  if(t.includes('html'))return'🌐'
  if(t.includes('css'))return'🎨'
  if(t.includes('python'))return'🐍'
  if(t.includes('react')||t.includes('vue')||t.includes('angular'))return'⚛️'
  if(t.includes('machine')||t.includes('ai')||t.includes('neural'))return'🤖'
  if(t.includes('data'))return'📊'
  if(t.includes('api')||t.includes('rest'))return'🔌'
  if(t.includes('database')||t.includes('sql'))return'🗃️'
  if(t.includes('cloud')||t.includes('aws'))return'☁️'
  if(t.includes('security'))return'🔐'
  if(t.includes('mobile'))return'📱'
  if(t.includes('math'))return'📐'
  if(t.includes('physics'))return'⚡'
  if(t.includes('biology'))return'🧬'
  if(t.includes('chemistry'))return'🧪'
  if(t.includes('history'))return'📜'
  if(t.includes('career'))return'🚀'
  if(t.includes('business'))return'💼'
  return'💡'
}

// ── Particle system ───────────────────────────────────────────────────────────
function makeParticles(W,H,n=50){
  return Array.from({length:n},()=>({
    x:Math.random()*W,y:Math.random()*H,
    vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,
    r:Math.random()*2+.5,a:Math.random()*.18+.04,
    rgb:['139,92,246','99,102,241','6,182,212'][Math.floor(Math.random()*3)],
  }))
}
function tickPts(ctx,pts,W,H){
  pts.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy
    if(p.x<0)p.x=W;if(p.x>W)p.x=0
    if(p.y<0)p.y=H;if(p.y>H)p.y=0
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
    ctx.fillStyle=`rgba(${p.rgb},${p.a})`;ctx.fill()
  })
}

// ── Shared scene background ───────────────────────────────────────────────────
function drawBg(ctx,W,H,color){
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H)
  const g=ctx.createRadialGradient(W/2,H*.35,0,W/2,H*.35,W*.65)
  g.addColorStop(0,hex2rgba(color,.1));g.addColorStop(1,'transparent')
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE: INTRODUCTION
// 0-3s:  Topic icon blooms with expanding rings
// 3-8s:  Satellite icons orbit outward one by one
// 8-14s: Title text builds word by word with glow
// 14-20s: Key-point cards slide in from sides
// 20-25s: Everything pulses gently — "living poster" feel
// ─────────────────────────────────────────────────────────────────────────────
function sceneIntro(ctx,W,H,t,scene,color){
  const icon=topicIcon(scene.title)
  const kps=(scene.keyPoints||[]).slice(0,4)
  const satellites=['⚡','🔗','📦','🛠️','🎯','🌀','🔬','📐']

  // Phase 1 (0-3s): central orb + rings bloom
  {
    const p=easeOut(p01(t,0,3))
    // Outer faint rings
    for(let ri=3;ri>=0;ri--){
      const rp=easeOut(p01(t,ri*.4,ri*.4+2))
      if(rp<=0) continue
      ctx.save();ctx.globalAlpha=rp*(0.08-ri*.015)
      ctx.strokeStyle=color;ctx.lineWidth=1
      ctx.beginPath();ctx.arc(W/2,H*.38,lerp(30,110+ri*40,rp),0,Math.PI*2);ctx.stroke()
      ctx.restore()
    }
    glow(ctx,W/2,H*.38,160*p,color,.22*p)
    // Core icon circle
    const r2=lerp(0,68,easeSpring(p01(t,0,1.2)))
    if(r2>2){
      ctx.save()
      ctx.beginPath();ctx.arc(W/2,H*.38,r2,0,Math.PI*2)
      ctx.fillStyle=hex2rgba(color,.22);ctx.fill()
      ctx.strokeStyle=hex2rgba(color,.8);ctx.lineWidth=2.5;ctx.stroke()
      ctx.restore()
    }
    const iconSize=lerp(0,58,easeSpring(p01(t,.2,1.4)))
    if(iconSize>4) emoji(ctx,icon,W/2,H*.38,iconSize,easeOut(p01(t,.2,1)))
  }

  // Phase 2 (2.5-11s): satellites orbit out
  satellites.slice(0,6).forEach((s,i)=>{
    const delay=2.5+i*1.2
    const sp=easeSpring(p01(t,delay,delay+1.8))
    if(sp<=0) return
    const angle=(i/6)*Math.PI*2-Math.PI/2+(t*0.06)
    const orbitR=lerp(0,Math.min(W,H)*.3,sp)
    const sx=W/2+Math.cos(angle)*orbitR
    const sy=H*.38+Math.sin(angle)*orbitR*.6
    glow(ctx,sx,sy,32*sp,PALETTE[i%PALETTE.length],.18*sp)
    ctx.save();ctx.globalAlpha=sp
    ctx.beginPath();ctx.arc(sx,sy,22*sp,0,Math.PI*2)
    ctx.fillStyle=hex2rgba(PALETTE[i%PALETTE.length],.2);ctx.fill()
    ctx.strokeStyle=hex2rgba(PALETTE[i%PALETTE.length],.7);ctx.lineWidth=1.5;ctx.stroke()
    ctx.restore()
    emoji(ctx,s,sx,sy,18*sp,sp)
  })

  // Phase 3 (6-14s): title words build up
  const words=(scene.title||'').split(' ')
  words.forEach((w,i)=>{
    const wp=easeSpring(p01(t,6+i*1.0,7.5+i*1.0))
    if(wp<=0) return
    const fs=Math.min(W*.052,38)*lerp(1.6,.95,easeOut(p01(t,6+i,8+i)))
    ctx.save();ctx.globalAlpha=wp
    ctx.font=`800 ${fs}px Inter,sans-serif`
    ctx.fillStyle=C.text;ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.shadowColor=color;ctx.shadowBlur=20*wp
    ctx.fillText(w,W/2,H*.62+i*fs*1.2-words.length*fs*.5)
    ctx.restore()
  })

  // Phase 4 (13-22s): key point cards slide in alternating left/right
  kps.forEach((kp,i)=>{
    const delay=13+i*2.2
    const kp2=easeOut(p01(t,delay,delay+1.8))
    if(kp2<=0) return
    const side=i%2===0?-1:1
    const cw2=Math.min(W*.55,280),ch2=44
    const cx2=W/2+(side*(1-kp2)*W*.5)
    const cy2=H*.77+i*52
    ctx.save();ctx.globalAlpha=kp2
    rr(ctx,cx2-cw2/2,cy2-ch2/2,cw2,ch2,12,hex2rgba(PALETTE[i%PALETTE.length],.14),hex2rgba(PALETTE[i%PALETTE.length],.5))
    ctx.font='600 11.5px Inter,sans-serif';ctx.fillStyle=C.text
    ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillText('✦  '+kp.slice(0,32),cx2,cy2)
    ctx.restore()
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE: CONCEPT  
// Mind-map style: center node → branches draw out → leaf nodes pop in
// Each node has icon + label, pulsing connection lines
// ─────────────────────────────────────────────────────────────────────────────
function sceneConcept(ctx,W,H,t,scene,color){
  const kps=(scene.keyPoints||[]).slice(0,6)
  const nodeIcons=['🔑','⚙️','🔗','📦','🧩','🎯','🌀','💡']

  // Center node blooms (0-2s)
  const cp=easeSpring(p01(t,0,2))
  glow(ctx,W/2,H*.45,90*cp,color,.28*cp)
  const cr=lerp(0,52,cp)
  if(cr>2){
    ctx.save()
    ctx.beginPath();ctx.arc(W/2,H*.45,cr,0,Math.PI*2)
    const cg=ctx.createRadialGradient(W/2,H*.45,0,W/2,H*.45,cr)
    cg.addColorStop(0,hex2rgba(color,.45));cg.addColorStop(1,hex2rgba(color,.1))
    ctx.fillStyle=cg;ctx.fill()
    ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.stroke()
    ctx.restore()
  }
  if(cp>.3) emoji(ctx,topicIcon(scene.title),W/2,H*.45,36*cp,cp)
  // Center label
  if(t>1.5){
    const lp=easeOut(p01(t,1.5,3))
    label(ctx,(scene.title||'Core').slice(0,14),W/2,H*.45+62*lp,'700 12px Inter,sans-serif',C.text,'center',lp)
  }

  // Branches draw out one by one (2s-18s, 2.5s gap each)
  kps.forEach((kp,i)=>{
    const delay=2+i*2.6
    const np=easeOut(p01(t,delay,delay+2.2))
    if(np<=0) return
    const angle=(i/kps.length)*Math.PI*2-Math.PI/2
    const maxDist=Math.min(W,H)*.34
    const nx=W/2+Math.cos(angle)*maxDist*np
    const ny=H*.45+Math.sin(angle)*maxDist*.72*np
    const nc=PALETTE[i%PALETTE.length]

    // Animated line drawing from center
    ctx.save();ctx.globalAlpha=np
    ctx.strokeStyle=nc;ctx.lineWidth=2
    ctx.setLineDash([6,4]);ctx.lineDashOffset=-(t*18)
    ctx.beginPath();ctx.moveTo(W/2,H*.45);ctx.lineTo(nx,ny);ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Node circle
    const nr=lerp(0,30,easeSpring(p01(t,delay+.6,delay+2)))
    if(nr>2){
      glow(ctx,nx,ny,nr*1.8,nc,.22)
      ctx.save()
      ctx.beginPath();ctx.arc(nx,ny,nr,0,Math.PI*2)
      const ng=ctx.createRadialGradient(nx,ny,0,nx,ny,nr)
      ng.addColorStop(0,hex2rgba(nc,.35));ng.addColorStop(1,hex2rgba(nc,.08))
      ctx.fillStyle=ng;ctx.fill()
      ctx.strokeStyle=nc;ctx.lineWidth=2;ctx.stroke()
      ctx.restore()
      emoji(ctx,nodeIcons[i%nodeIcons.length],nx,ny,nr*.88,easeOut(p01(t,delay+.8,delay+2)))
    }

    // Label fades in
    const labelP=easeOut(p01(t,delay+1.4,delay+2.5))
    if(labelP>0){
      const lx=nx+Math.cos(angle)*42, ly=ny+Math.sin(angle)*38
      ctx.save();ctx.globalAlpha=labelP
      const lw2=Math.min(W*.3,140)
      rr(ctx,lx-lw2/2,ly-16,lw2,30,8,hex2rgba(nc,.12),hex2rgba(nc,.35))
      ctx.font='600 10.5px Inter,sans-serif';ctx.fillStyle=C.text
      ctx.textAlign='center';ctx.textBaseline='middle'
      ctx.fillText(kp.slice(0,20),lx,ly)
      ctx.restore()
    }
  })

  // Pulsing ring on center (ongoing)
  if(t>3){
    const ringT=(t*0.7)%3
    const rp2=easeOut(p01(ringT,0,1.5))*(1-easeIn(p01(ringT,1.5,3)))
    ctx.save();ctx.globalAlpha=rp2*.3
    ctx.strokeStyle=color;ctx.lineWidth=1.5
    ctx.beginPath();ctx.arc(W/2,H*.45,lerp(52,110,p01(ringT,0,3)),0,Math.PI*2);ctx.stroke()
    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE: EXAMPLE (code + live execution visual)
// 0-3s:   Editor window slides in
// 3-12s:  Code lines type in one by one with cursor
// 10-18s: ▶ Run button pulses, execution animation
// 15-25s: Output panel builds with results + animated bar chart
// ─────────────────────────────────────────────────────────────────────────────
function sceneExample(ctx,W,H,t,scene,color){
  const margin=16, edW=(W-margin*3)/2, edH=H*.62, edY=H*.1

  // === LEFT: Code editor ===
  const ep=easeOut(p01(t,0,1.5))
  ctx.save();ctx.globalAlpha=ep
  ctx.shadowColor=color;ctx.shadowBlur=20*ep
  rr(ctx,margin,edY,edW,edH,14,'#0A0A14',hex2rgba(color,.4))
  ctx.shadowBlur=0
  // Chrome bar
  rr(ctx,margin,edY,edW,32,`14 14 0 0`,'#111120',hex2rgba(color,.3))
  ;[[14,'#EF4444'],[28,'#F59E0B'],[42,'#10B981']].forEach(([dx,dc])=>{
    ctx.beginPath();ctx.arc(margin+dx,edY+16,6,0,Math.PI*2);ctx.fillStyle=dc;ctx.fill()
  })
  ctx.font='500 9.5px Inter,sans-serif';ctx.fillStyle='rgba(255,255,255,.3)'
  ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillText('✎ editor.js',margin+edW/2,edY+16)
  ctx.restore()

  // Code lines type in
  const codeRaw=scene.codeExample&&scene.codeExample!=='null'
    ? scene.codeExample
    : `// ${scene.title||'Example'}\n\nconst learn = (topic) => {\n  const knowledge = study(topic)\n  const skills = practice(knowledge)\n  return skills.mastery\n}\n\nlearn("${(scene.title||'').slice(0,20)}")`
  const lines=codeRaw.split('\n').slice(0,14)
  const lh=Math.min(19,(edH-40)/Math.max(lines.length,1))
  const totalCodeTime=10
  lines.forEach((ln,li)=>{
    const lp=easeOut(p01(t,2+li*(totalCodeTime/lines.length),2+li*(totalCodeTime/lines.length)+.8))
    if(lp<=0) return
    const charCount=Math.floor(lp*ln.length)
    const shown=ln.slice(0,charCount)
    ctx.save();ctx.globalAlpha=Math.min(ep,lp)
    let tc=C.text
    if(ln.trim().startsWith('//')||ln.trim().startsWith('#')) tc='#64748B'
    else if(/\b(function|const|let|var|def|return|import|from|class|=>)\b/.test(ln)) tc='#818CF8'
    else if(/"[^"]*"|'[^']*'|`[^`]*`/.test(ln)) tc='#34D399'
    else if(/\b\d+\b/.test(ln)) tc='#FBBF24'
    ctx.font=`400 ${Math.min(lh*.72,11.5)}px "JetBrains Mono",monospace`
    ctx.fillStyle='rgba(255,255,255,.2)';ctx.textAlign='right';ctx.textBaseline='middle'
    ctx.fillText(li+1,margin+22,edY+36+li*lh)
    ctx.fillStyle=tc;ctx.textAlign='left'
    ctx.fillText(shown,margin+28,edY+36+li*lh)
    // Blinking cursor on last line being typed
    if(lp<1&&lp>.1){
      const tw=ctx.measureText(shown).width
      ctx.fillStyle=color;ctx.globalAlpha=(Math.sin(t*8)>.0?.9:0)
      ctx.fillRect(margin+28+tw,edY+36+li*lh-lh*.4,2,lh*.75)
    }
    ctx.restore()
  })

  // === RIGHT: Output + results ===
  const rx=margin*2+edW
  const rp=easeOut(p01(t,12,14.5))
  ctx.save();ctx.globalAlpha=rp
  ctx.shadowColor=C.green;ctx.shadowBlur=18*rp
  rr(ctx,rx,edY,edW,edH,14,'#050510',hex2rgba(C.green,.3))
  ctx.shadowBlur=0
  rr(ctx,rx,edY,edW,32,'14 14 0 0','#060615',hex2rgba(C.green,.25))
  ctx.font='600 9.5px Inter,sans-serif';ctx.fillStyle=C.green
  ctx.textAlign='left';ctx.textBaseline='middle'
  ctx.fillText('▶  EXECUTION OUTPUT',rx+12,edY+16)
  ctx.restore()

  // Output lines + animated bar chart
  const outs=scene.keyPoints?.slice(0,4)||['Processing...','Computing...','Done']
  outs.forEach((o,oi)=>{
    const op=easeOut(p01(t,13+oi*1.8,14.5+oi*1.8))
    if(op<=0) return
    const oy2=edY+40+oi*32
    ctx.save();ctx.globalAlpha=op
    emoji(ctx,oi===outs.length-1?'✅':'▶',rx+18,oy2,13,op)
    ctx.font=`400 11px "JetBrains Mono",monospace`
    ctx.fillStyle=oi===outs.length-1?C.green:'rgba(255,255,255,.8)'
    ctx.textAlign='left';ctx.textBaseline='middle'
    ctx.fillText(o.slice(0,30),rx+32,oy2)
    // Mini progress bar
    const bw2=easeOut(p01(t,13+oi*1.8+.2,14.5+oi*1.8+.6))*(edW-46)
    ctx.fillStyle=hex2rgba(oi===outs.length-1?C.green:color,.6)
    ctx.beginPath();ctx.roundRect(rx+32,oy2+10,bw2,3,2);ctx.fill()
    ctx.restore()
  })

  // Bar chart for visual data (18s+)
  if(t>18){
    const cp3=easeOut(p01(t,18,20))
    const bars=[65,82,91,78,95].slice(0,Math.min(outs.length+1,5))
    const bTotal=edW-24, bGap=6
    const bw3=(bTotal-bGap*(bars.length-1))/bars.length
    bars.forEach((v,bi)=>{
      const bp=easeOut(p01(t,18+bi*.5,19.5+bi*.5))
      if(bp<=0) return
      const bx2=rx+12+bi*(bw3+bGap), maxH2=edH*.25, bh2=maxH2*(v/100)*bp
      const by3=edY+edH-12-bh2
      ctx.save();ctx.globalAlpha=cp3
      ctx.fillStyle=hex2rgba(PALETTE[bi%PALETTE.length],.75)
      ctx.beginPath();ctx.roundRect(bx2,by3,bw3,bh2,[4,4,0,0]);ctx.fill()
      ctx.font='700 9px Inter,sans-serif';ctx.fillStyle=C.text
      ctx.textAlign='center';ctx.textBaseline='bottom'
      ctx.fillText(`${v}%`,bx2+bw3/2,by3-2)
      ctx.restore()
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE: DEMO — visual step-by-step with large icons + animated arrows
// ─────────────────────────────────────────────────────────────────────────────
function sceneDemo(ctx,W,H,t,scene,color){
  const steps=(scene.keyPoints||['Analyze','Design','Build','Test','Deploy']).slice(0,5)
  const sIcons=['🔍','🎨','🔨','🧪','🚀','✅','🎯','📦']

  // Title
  const tp=easeOut(p01(t,0,1.5))
  if(tp>.05){
    ctx.save();ctx.globalAlpha=tp
    ctx.font=`800 ${Math.min(W*.047,32)}px Inter,sans-serif`
    ctx.fillStyle=C.text;ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.shadowColor=color;ctx.shadowBlur=16*tp
    ctx.fillText(scene.title||'Process Flow',W/2,H*.12)
    ctx.restore()
  }

  const count=steps.length
  const cardW=Math.min((W-40)/count-12,140), cardH=Math.min(cardW*1.05,148)
  const totalW=(cardW+12)*count-12, sx=(W-totalW)/2, cy=H*.5

  steps.forEach((step,i)=>{
    const delay=1.5+i*2.8
    const sp=easeSpring(p01(t,delay,delay+2.2))
    if(sp<=0) return
    const bx=sx+i*(cardW+12)
    const by=cy-cardH/2+(1-easeBounce(sp))*60
    const nc=PALETTE[i%PALETTE.length]

    // Card shadow glow
    glow(ctx,bx+cardW/2,by+cardH/2,cardW*.7*sp,nc,.2*sp)

    // Card
    ctx.save();ctx.globalAlpha=sp
    ctx.shadowColor=nc;ctx.shadowBlur=14*sp
    rr(ctx,bx,by,cardW,cardH,16,hex2rgba(nc,.16),hex2rgba(nc,.6))
    ctx.shadowBlur=0

    // Step number circle
    ctx.beginPath();ctx.arc(bx+cardW/2,by+18,13,0,Math.PI*2)
    ctx.fillStyle=nc;ctx.fill()
    ctx.font='800 11px Inter,sans-serif';ctx.fillStyle='#fff'
    ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillText(i+1,bx+cardW/2,by+18)
    ctx.restore()

    // Large icon
    emoji(ctx,sIcons[i%sIcons.length],bx+cardW/2,by+cardH*.5,cardW*.38*sp,sp)

    // Label
    if(sp>.55){
      ctx.save();ctx.globalAlpha=sp
      ctx.font=`700 ${Math.min(cardW*.1,11)}px Inter,sans-serif`
      ctx.fillStyle=C.text;ctx.textAlign='center';ctx.textBaseline='top'
      const sl=step.length>16?step.slice(0,16)+'…':step
      ctx.fillText(sl,bx+cardW/2,by+cardH*.82)
      ctx.restore()
    }

    // Animated arrow to next
    if(i<count-1){
      const ap=easeOut(p01(t,delay+1.8,delay+3.0))
      if(ap<=0) return
      const ax=bx+cardW+2, ay=cy
      ctx.save();ctx.globalAlpha=ap*.8
      ctx.strokeStyle=nc;ctx.lineWidth=2.5
      // Dashed moving arrow
      ctx.setLineDash([6,5]);ctx.lineDashOffset=-(t*12)
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax+8*ap,ay);ctx.stroke()
      ctx.setLineDash([])
      // Arrowhead
      ctx.fillStyle=nc;ctx.beginPath()
      ctx.moveTo(ax+10,ay-5);ctx.lineTo(ax+16,ay);ctx.lineTo(ax+10,ay+5)
      ctx.closePath();ctx.fill()
      ctx.restore()
    }
  })

  // Bottom completion bar (18s+)
  if(t>18){
    const cp4=easeOut(p01(t,18,20))
    const bw4=lerp(0,W*.7,cp4), bx4=(W-W*.7)/2
    ctx.save();ctx.globalAlpha=cp4
    rr(ctx,bx4,H*.84,W*.7,8,4,'rgba(255,255,255,.06)')
    ctx.fillStyle=hex2rgba(C.green,.8)
    ctx.beginPath();ctx.roundRect(bx4,H*.84,bw4,8,4);ctx.fill()
    ctx.shadowColor=C.green;ctx.shadowBlur=10
    ctx.restore()
    if(cp4>.6){
      label(ctx,'All Steps Complete ✓',W/2,H*.9,'700 13px Inter,sans-serif',C.green,'center',cp4)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE: SUMMARY — Trophy celebration + recap grid + XP earned
// ─────────────────────────────────────────────────────────────────────────────
function sceneSummary(ctx,W,H,t,scene,_color){
  // Background burst
  const bp=easeOut(p01(t,0,2))
  glow(ctx,W/2,H*.3,200*bp,C.yellow,.2*bp)

  // Trophy bounces in
  const tp=easeBounce(p01(t,0,1.8))
  if(tp>.02){
    glow(ctx,W/2,H*.28,80*tp,C.yellow,.3*tp)
    emoji(ctx,'🏆',W/2,H*.28,70*tp,tp)
  }

  // "Lesson Complete!" text
  const lcp=easeSpring(p01(t,1.2,2.8))
  if(lcp>.05){
    ctx.save();ctx.globalAlpha=lcp
    ctx.font=`900 ${Math.min(W*.065,44)}px Inter,sans-serif`
    ctx.fillStyle=C.yellow;ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.shadowColor=C.yellow;ctx.shadowBlur=22*lcp
    ctx.fillText('Lesson Complete!',W/2,H*.44)
    ctx.restore()
  }

  // Subtitle
  const sp2=easeOut(p01(t,2.2,3.5))
  if(sp2>.05){
    ctx.save();ctx.globalAlpha=sp2*.75
    ctx.font=`400 ${Math.min(W*.026,17)}px Inter,sans-serif`
    ctx.fillStyle=C.sub;ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillText(scene.title||'Well done!',W/2,H*.52)
    ctx.restore()
  }

  // Key recap cards
  const kps3=(scene.keyPoints||[]).slice(0,4)
  const cw3=Math.min(W*.38,190),ch3=46,cg=12
  const totalCW3=kps3.length>2?(cw3+cg)*2-cg:kps3.length*(cw3+cg)-cg
  const csx3=(W-totalCW3)/2
  kps3.forEach((kp3,i)=>{
    const delay4=4+i*1.8
    const kp4=easeOut(p01(t,delay4,delay4+1.5))
    if(kp4<=0) return
    const col3=i%2,row3=Math.floor(i/2)
    const cx4=csx3+col3*(cw3+cg), cy4=H*.6+row3*(ch3+8)+(1-kp4)*24
    ctx.save();ctx.globalAlpha=kp4
    ctx.shadowColor=PALETTE[i%PALETTE.length];ctx.shadowBlur=10*kp4
    rr(ctx,cx4,cy4,cw3,ch3,12,hex2rgba(PALETTE[i%PALETTE.length],.16),hex2rgba(PALETTE[i%PALETTE.length],.5))
    ctx.shadowBlur=0
    emoji(ctx,'✅',cx4+22,cy4+ch3/2,15,kp4)
    ctx.font='600 11px Inter,sans-serif';ctx.fillStyle=C.text
    ctx.textAlign='left';ctx.textBaseline='middle'
    ctx.fillText(kp3.slice(0,26),cx4+38,cy4+ch3/2)
    ctx.restore()
  })

  // XP badge
  if(t>14){
    const xp=easeSpring(p01(t,14,15.5))
    glow(ctx,W/2,H*.86,50*xp,C.green,.2*xp)
    ctx.save();ctx.globalAlpha=xp
    rr(ctx,W/2-65,H*.84,130,32,16,hex2rgba(C.green,.2),hex2rgba(C.green,.6))
    ctx.font='700 13px Inter,sans-serif';ctx.fillStyle=C.green
    ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.shadowColor=C.green;ctx.shadowBlur=12
    ctx.fillText('⚡ +25 XP Earned',W/2,H*.84+16)
    ctx.restore()
  }

  // Floating sparkle particles (manual, no useRef in render fn)
  if(t>2){
    const sparkCount=8
    for(let i=0;i<sparkCount;i++){
      const st=(t*.4+i*(1/sparkCount))%1
      const sp3=Math.sin(st*Math.PI)
      if(sp3<.05) continue
      const sx3=W*.15+Math.sin(i*2.3+t*.3)*W*.7
      const sy3=H*.2+st*H*.7
      emoji(ctx,['✨','⭐','🌟','💫'][i%4],sx3,sy3,14*sp3,sp3*.6)
    }
  }
}

// ── Narration ticker ──────────────────────────────────────────────────────────
function renderNar(ctx,W,H,t,words){
  const pct=Math.min(t/ANIM_DURATION,1)
  const shown=words.slice(0,Math.ceil(pct*words.length))
  const lineLen=12, lines=[]
  for(let i=0;i<shown.length;i+=lineLen) lines.push(shown.slice(i,i+lineLen).join(' '))
  const vis=lines.slice(-2), bh=52, by2=H-bh-6
  ctx.save()
  ctx.fillStyle='rgba(5,5,10,.88)'
  ctx.beginPath();ctx.roundRect(W*.03,by2,W*.94,bh,8);ctx.fill()
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;ctx.stroke()
  vis.forEach((ln,li)=>{
    ctx.font=li===vis.length-1?'500 12.5px Inter,sans-serif':'400 11px Inter,sans-serif'
    ctx.fillStyle=li===vis.length-1?C.text:'rgba(248,250,252,.4)'
    ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillText(ln,W/2,by2+13+li*23)
  })
  ctx.restore()
}

// ── Top progress bar ──────────────────────────────────────────────────────────
function renderTop(ctx,W,t,scN,dur,color){
  const p=Math.min(t/ANIM_DURATION,1)
  ctx.save()
  ctx.fillStyle=hex2rgba(color,.15);ctx.fillRect(0,0,W,4)
  const g=ctx.createLinearGradient(0,0,W*p,0)
  g.addColorStop(0,color);g.addColorStop(1,hex2rgba(color,.7))
  ctx.fillStyle=g;ctx.shadowColor=color;ctx.shadowBlur=8;ctx.fillRect(0,0,W*p,4)
  ctx.font='600 10px Inter,sans-serif';ctx.fillStyle=hex2rgba(color,.85);ctx.shadowBlur=0
  ctx.textAlign='right';ctx.textBaseline='top'
  ctx.fillText(`SCENE ${scN}  ·  ${dur}`,W-12,9)
  ctx.restore()
}

// ── Canvas hook ───────────────────────────────────────────────────────────────
function useSceneCanvas(canvasRef,scene,playing,color,onEnd){
  const rafRef=useRef(null),startTs=useRef(null),pts=useRef([]),endedR=useRef(false)

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!canvas||!scene) return
    const ctx=canvas.getContext('2d')
    const W=canvas.width,H=canvas.height

    pts.current=makeParticles(W,H,42)
    startTs.current=null;endedR.current=false

    const words=(scene.narration||'').split(' ')
    const renderers={introduction:sceneIntro,concept:sceneConcept,example:sceneExample,demo:sceneDemo,summary:sceneSummary}
    const draw=renderers[scene.type]||sceneConcept

    function frame(ts){
      if(!startTs.current) startTs.current=ts
      const t=playing?(ts-startTs.current)/1000:2.0
      drawBg(ctx,W,H,color)
      tickPts(ctx,pts.current,W,H)
      draw(ctx,W,H,t,scene,color)
      renderNar(ctx,W,H,t,words)
      renderTop(ctx,W,t,scene.id||1,scene.duration||'',color)
      if(playing&&t<ANIM_DURATION){ rafRef.current=requestAnimationFrame(frame) }
      else if(playing&&t>=ANIM_DURATION&&!endedR.current){ endedR.current=true;onEnd?.() }
    }

    if(playing){ rafRef.current=requestAnimationFrame(frame) }
    else{
      drawBg(ctx,W,H,color);tickPts(ctx,pts.current,W,H)
      ;(renderers[scene.type]||sceneConcept)(ctx,W,H,2.0,scene,color)
      renderTop(ctx,W,0,scene.id||1,scene.duration||'',color)
    }
    return ()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current) }
  },[scene,playing,color,onEnd,canvasRef])
}

// ── CinematicPlayer ───────────────────────────────────────────────────────────
const SICONS={introduction:'🎬',concept:'💡',example:'⚙️',demo:'🖥️',summary:'✅'}

export default function CinematicPlayer({lesson,color='#8B5CF6',onComplete}){
  const [sceneIdx,setSceneIdx]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [elapsed,setElapsed]=useState(0)
  const [full,setFull]=useState(false)
  const canvasRef=useRef(null)
  const timerRef=useRef(null)
  const scenes=lesson?.scenes||[]
  const scene=scenes[sceneIdx]

  useEffect(()=>{ clearInterval(timerRef.current); if(!playing) return
    const start=Date.now()-elapsed*1000
    timerRef.current=setInterval(()=>{
      const e=(Date.now()-start)/1000
      setElapsed(Math.min(e,ANIM_DURATION))
      if(e>=ANIM_DURATION) clearInterval(timerRef.current)
    },100)
    return ()=>clearInterval(timerRef.current)
  },[playing]) // eslint-disable-line

  useEffect(()=>{setElapsed(0);setPlaying(false)},[sceneIdx])

  const handleEnd=useCallback(()=>{
    setPlaying(false)
    if(sceneIdx<scenes.length-1){ setTimeout(()=>{setSceneIdx(i=>i+1);setPlaying(true)},600) }
    else onComplete?.()
  },[sceneIdx,scenes.length,onComplete])

  useSceneCanvas(canvasRef,scene,playing,color,handleEnd)

  const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
  const pct=(elapsed/ANIM_DURATION)*100
  if(!scenes.length) return null

  return(
    <div style={{background:C.bg,borderRadius:full?0:16,border:`1px solid ${hex2rgba(color,.32)}`,overflow:'hidden',position:full?'fixed':'relative',inset:full?0:'auto',zIndex:full?9990:'auto',boxShadow:`0 0 60px ${hex2rgba(color,.2)}`}}>
      <div style={{position:'relative',aspectRatio:'16/9',maxHeight:full?'100vh':500,background:C.bg}}>
        <canvas ref={canvasRef} width={960} height={540} style={{width:'100%',height:'100%',display:'block'}}/>
        <AnimatePresence>
          {!playing&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setPlaying(true)}
              style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.45)',cursor:'pointer'}}>
              <motion.div whileHover={{scale:1.08}} whileTap={{scale:.93}}
                animate={{boxShadow:[`0 0 30px ${hex2rgba(color,.4)}`,`0 0 55px ${hex2rgba(color,.7)}`,`0 0 30px ${hex2rgba(color,.4)}`]}}
                transition={{duration:2,repeat:Infinity}}
                style={{width:82,height:82,borderRadius:'50%',background:`linear-gradient(135deg,${color},${hex2rgba(color,.75)})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.2rem',paddingLeft:6}}>
                ▶
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{position:'absolute',top:10,left:12,background:'rgba(0,0,0,.72)',backdropFilter:'blur(8px)',borderRadius:8,padding:'4px 10px',fontSize:'0.68rem',fontWeight:700,color,letterSpacing:'0.08em',textTransform:'uppercase'}}>
          {SICONS[scene?.type]||'📚'} {scene?.type}
        </div>
        <button onClick={()=>setFull(f=>!f)}
          style={{position:'absolute',top:8,right:12,background:'rgba(0,0,0,.65)',backdropFilter:'blur(8px)',border:'none',borderRadius:8,padding:'4px 10px',color:'rgba(255,255,255,.7)',cursor:'pointer',fontSize:'0.8rem'}}>
          {full?'⊡ Exit':'⊞'}
        </button>
      </div>

      <div style={{padding:'10px 14px',background:'rgba(0,0,0,.5)'}}>
        <div style={{height:5,background:'rgba(255,255,255,.08)',borderRadius:999,marginBottom:10,cursor:'pointer',overflow:'hidden'}}
          onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setElapsed(((e.clientX-r.left)/r.width)*ANIM_DURATION)}}>
          <motion.div animate={{width:`${pct}%`}} transition={{duration:.12,ease:'linear'}}
            style={{height:'100%',borderRadius:999,background:`linear-gradient(90deg,${color},${hex2rgba(color,.7)})`,boxShadow:`0 0 10px ${hex2rgba(color,.7)}`}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>{if(sceneIdx>0)setSceneIdx(i=>i-1)}} disabled={sceneIdx===0}
            style={{background:'none',border:'none',color:sceneIdx===0?'#222':'rgba(255,255,255,.6)',cursor:sceneIdx===0?'default':'pointer',fontSize:'1.1rem',padding:'2px 6px'}}>⏮</button>
          <motion.button whileTap={{scale:.9}} onClick={()=>setPlaying(v=>!v)}
            style={{width:40,height:40,borderRadius:'50%',background:`linear-gradient(135deg,${color},${hex2rgba(color,.75)})`,border:'none',cursor:'pointer',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',boxShadow:`0 4px 16px ${hex2rgba(color,.5)}`,paddingLeft:playing?0:4}}>
            {playing?'⏸':'▶'}
          </motion.button>
          <button onClick={()=>{if(sceneIdx<scenes.length-1)setSceneIdx(i=>i+1)}} disabled={sceneIdx===scenes.length-1}
            style={{background:'none',border:'none',color:sceneIdx===scenes.length-1?'#222':'rgba(255,255,255,.6)',cursor:sceneIdx===scenes.length-1?'default':'pointer',fontSize:'1.1rem',padding:'2px 6px'}}>⏭</button>
          <span style={{fontSize:'0.73rem',color:'rgba(255,255,255,.4)',fontVariantNumeric:'tabular-nums',marginLeft:4}}>
            {fmt(elapsed)} / {fmt(ANIM_DURATION)}
          </span>
          <div style={{marginLeft:'auto',display:'flex',gap:5,alignItems:'center'}}>
            {scenes.map((_,i)=>(
              <motion.button key={i} whileHover={{scale:1.4}}
                onClick={()=>{setSceneIdx(i);setElapsed(0);setPlaying(false)}}
                style={{width:i===sceneIdx?22:8,height:8,borderRadius:999,border:'none',cursor:'pointer',padding:0,background:i===sceneIdx?color:i<sceneIdx?hex2rgba(color,.5):'rgba(255,255,255,.15)',transition:'all .22s',boxShadow:i===sceneIdx?`0 0 8px ${color}`:'none'}}/>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:'10px 14px 12px',borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div>
          <div style={{fontWeight:700,fontSize:'0.9rem',color:C.text,marginBottom:1}}>{sceneIdx+1}. {scene?.title}</div>
          <div style={{fontSize:'0.7rem',color:C.muted}}>Scene {sceneIdx+1} of {scenes.length} · {scene?.duration} · {ANIM_DURATION}s animation</div>
        </div>
        <AnimatePresence>
          {elapsed>=ANIM_DURATION-.3&&sceneIdx<scenes.length-1&&(
            <motion.button initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} exit={{opacity:0}}
              onClick={()=>{setSceneIdx(i=>i+1);setElapsed(0);setPlaying(true)}}
              style={{background:`linear-gradient(135deg,${color},${hex2rgba(color,.8)})`,border:'none',borderRadius:10,padding:'8px 20px',color:'white',cursor:'pointer',fontSize:'0.85rem',fontWeight:700,fontFamily:'Inter,sans-serif',boxShadow:`0 4px 16px ${hex2rgba(color,.4)}`}}>
              Next Scene →
            </motion.button>
          )}
          {sceneIdx===scenes.length-1&&elapsed>=ANIM_DURATION-.3&&(
            <motion.button initial={{opacity:0}} animate={{opacity:1}}
              onClick={()=>onComplete?.()}
              style={{background:`linear-gradient(135deg,${C.green},${hex2rgba(C.green,.8)})`,border:'none',borderRadius:10,padding:'8px 20px',color:'white',cursor:'pointer',fontSize:'0.85rem',fontWeight:700,fontFamily:'Inter,sans-serif',boxShadow:`0 4px 16px ${hex2rgba(C.green,.4)}`}}>
              ✓ Take Quiz
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
