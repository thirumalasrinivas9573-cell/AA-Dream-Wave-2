import { useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'

// ── AI Orb — Premium AI Consciousness Visual ─────────────────────────────────
// States: idle | thinking | responding | neural
export default function AIOrb({ state = 'idle', size = 56, color = '#8B5CF6' }) {
  const controls = useAnimation()
  const ringCtrl = useAnimation()
  const ring2Ctrl = useAnimation()
  const glowCtrl = useAnimation()
  const neuralCtrl = useAnimation()

  useEffect(() => {
    if (state === 'idle') {
      // Breathing effect
      controls.start({
        scale: [1, 1.06, 1],
        transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
      })
      ringCtrl.start({
        scale: [1, 1.18, 1], opacity: [0.4, 0.1, 0.4],
        transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
      })
      ring2Ctrl.start({
        scale: [1, 1.12, 1], opacity: [0.2, 0.05, 0.2],
        transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
      })
      glowCtrl.start({
        opacity: [0.5, 0.85, 0.5],
        transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
      })
      neuralCtrl.start({ opacity: 0 })

    } else if (state === 'thinking') {
      // Pulse effect — rapid double-pulse
      controls.start({
        scale: [1, 1.14, 1.06, 1.14, 1],
        transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
      })
      ringCtrl.start({
        scale: [1, 1.4, 1], opacity: [0.65, 0, 0.65],
        transition: { duration: 0.9, repeat: Infinity, ease: 'easeOut' }
      })
      ring2Ctrl.start({
        scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3],
        transition: { duration: 0.9, repeat: Infinity, ease: 'easeOut', delay: 0.25 }
      })
      glowCtrl.start({
        opacity: [0.7, 1, 0.7],
        transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
      })
      neuralCtrl.start({ opacity: [0, 0.8, 0], transition: { duration: 1.5, repeat: Infinity } })

    } else if (state === 'responding') {
      // Neural waves — fast rippling
      controls.start({
        scale: [1, 1.09, 1.04, 1.09, 1],
        transition: { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
      })
      ringCtrl.start({
        scale: [1, 1.25, 1], opacity: [0.55, 0, 0.55],
        transition: { duration: 0.6, repeat: Infinity }
      })
      ring2Ctrl.start({
        scale: [1, 1.45, 1], opacity: [0.25, 0, 0.25],
        transition: { duration: 0.6, repeat: Infinity, delay: 0.2 }
      })
      glowCtrl.start({
        opacity: [0.8, 1, 0.8],
        transition: { duration: 0.45, repeat: Infinity }
      })
      neuralCtrl.start({
        opacity: [0, 1, 0],
        transition: { duration: 0.8, repeat: Infinity }
      })

    } else if (state === 'neural') {
      // Full neural wave burst for major responses
      controls.start({
        scale: [1, 1.18, 0.96, 1.12, 1],
        rotate: [0, 5, -5, 3, 0],
        transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
      })
      ringCtrl.start({
        scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7],
        transition: { duration: 0.7, repeat: Infinity }
      })
      ring2Ctrl.start({
        scale: [1, 2.0, 1], opacity: [0.35, 0, 0.35],
        transition: { duration: 0.7, repeat: Infinity, delay: 0.2 }
      })
      glowCtrl.start({
        opacity: [0.9, 1, 0.9],
        scale: [1, 1.2, 1],
        transition: { duration: 0.5, repeat: Infinity }
      })
      neuralCtrl.start({
        opacity: [0, 1, 0.5, 1, 0],
        transition: { duration: 1.0, repeat: Infinity }
      })
    }
  }, [state, controls, ringCtrl, ring2Ctrl, glowCtrl, neuralCtrl])

  const s = size

  return (
    <div style={{ position: 'relative', width: s, height: s, flexShrink: 0 }}>
      {/* Outer glow halo */}
      <motion.div animate={glowCtrl} style={{
        position: 'absolute', inset: -6,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}50 0%, transparent 70%)`,
        filter: `blur(${s * 0.18}px)`,
        pointerEvents: 'none',
      }} />
      {/* Ring 1 */}
      <motion.div animate={ringCtrl} style={{
        position: 'absolute', inset: -8,
        borderRadius: '50%',
        border: `1.5px solid ${color}`,
        pointerEvents: 'none',
      }} />
      {/* Ring 2 — wider, more transparent */}
      <motion.div animate={ring2Ctrl} style={{
        position: 'absolute', inset: -16,
        borderRadius: '50%',
        border: `1px solid ${color}55`,
        pointerEvents: 'none',
      }} />
      {/* Neural sparks — small rotating dots (visible when thinking/responding) */}
      <motion.div animate={neuralCtrl} style={{
        position: 'absolute', inset: -4,
        borderRadius: '50%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}>
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <motion.div key={i}
            animate={state === 'thinking' || state === 'responding' || state === 'neural'
              ? { rotate: [deg, deg + 360], opacity: [0.3, 1, 0.3] }
              : { opacity: 0 }
            }
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.15 }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 3, height: 3,
              borderRadius: '50%',
              background: color,
              transformOrigin: `${s * 0.65}px 0`,
              transform: `translateX(-50%) translateY(-50%) rotate(${deg}deg) translateX(${s * 0.65}px)`,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        ))}
      </motion.div>
      {/* Core orb body */}
      <motion.div animate={controls} style={{
        width: s, height: s,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}ff, ${color}99 60%, ${color}55)`,
        boxShadow: `0 0 ${s * 0.4}px ${color}66, 0 0 ${s * 0.8}px ${color}33, inset 0 1px 0 rgba(255,255,255,0.35)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: s * 0.42,
        position: 'relative', zIndex: 1,
      }}>
        {state === 'thinking' || state === 'neural'
          ? <ThinkingDots size={s} />
          : state === 'responding'
            ? <NeuralWave size={s} />
            : <span style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}>🤖</span>
        }
      </motion.div>
    </div>
  )
}

function ThinkingDots({ size = 56 }) {
  const dotSize = Math.max(4, size * 0.1)
  return (
    <div style={{ display: 'flex', gap: dotSize * 0.7, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ y: [0, -(dotSize * 1.2), 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.65, delay: i * 0.16, repeat: Infinity }}
          style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: 'white' }}
        />
      ))}
    </div>
  )
}

function NeuralWave({ size = 56 }) {
  const barW = Math.max(3, size * 0.07)
  const heights = [0.3, 0.55, 0.8, 1.0, 0.8, 0.55, 0.3]
  const maxH = size * 0.5
  return (
    <div style={{ display: 'flex', gap: barW * 0.55, alignItems: 'center' }}>
      {heights.map((h, i) => (
        <motion.div key={i}
          animate={{ scaleY: [h, h * 1.6, h], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 0.5, delay: i * 0.07, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: barW, height: maxH * h,
            borderRadius: barW,
            background: 'rgba(255,255,255,0.9)',
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  )
}
