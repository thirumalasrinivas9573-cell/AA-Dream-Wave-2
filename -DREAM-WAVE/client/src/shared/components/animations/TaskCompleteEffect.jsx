import { useEffect } from 'react'
import { motion } from 'framer-motion'

// ── Micro-confetti burst on task complete ─────────────────────────────────────
function ConfettiParticle({ x, y, color, angle, velocity }) {
  return (
    <motion.div
      initial={{ x, y, opacity: 1, scale: 1 }}
      animate={{
        x: x + Math.cos(angle) * velocity * 60,
        y: y + Math.sin(angle) * velocity * 60 + 30,
        opacity: 0,
        scale: 0,
        rotate: Math.random() * 360,
      }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      style={{
        position: 'fixed', width: 6, height: 6,
        borderRadius: Math.random() > 0.5 ? '50%' : 2,
        background: color, pointerEvents: 'none', zIndex: 9999,
      }}
    />
  )
}

// ── XP earned floating number ─────────────────────────────────────────────────
export function XPBurst({ amount = 10, x = 0, y = 0, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -50, scale: [0.5, 1.2, 1, 0.8] }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      style={{
        position: 'fixed', left: x, top: y,
        fontWeight: 800, fontSize: '1.1rem',
        color: '#FBBF24', zIndex: 9999, pointerEvents: 'none',
        textShadow: '0 0 10px rgba(251,191,36,0.8)',
        userSelect: 'none',
      }}
    >
      +{amount} XP ⚡
    </motion.div>
  )
}

// ── Confetti burst at position ────────────────────────────────────────────────
export function ConfettiBurst({ x, y, onDone }) {
  const colors = ['#8B5CF6', '#A855F7', '#6366F1', '#10B981', '#F59E0B', '#EC4899']
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    angle: (i / 12) * Math.PI * 2,
    velocity: 0.8 + Math.random() * 0.4,
  }))

  useEffect(() => {
    const t = setTimeout(onDone, 800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <>
      {particles.map(p => (
        <ConfettiParticle key={p.id} x={x} y={y} color={p.color} angle={p.angle} velocity={p.velocity} />
      ))}
    </>
  )
}

// ── Checkmark draw-on animation ───────────────────────────────────────────────
export function AnimatedCheckmark({ size = 22, color = '#10B981' }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <motion.circle
        cx="11" cy="11" r="10"
        stroke={color} strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <motion.path
        d="M6.5 11 L9.5 14 L15.5 8"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}

// ── Skill mastered celebration card ───────────────────────────────────────────
export function SkillMasteredCard({ skill, xp, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9998, padding: 20,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div style={{
        background: 'linear-gradient(135deg, #1a0533, #0f172a)',
        border: '1px solid rgba(139,92,246,0.5)',
        borderRadius: 24, padding: '40px 48px',
        textAlign: 'center', maxWidth: 360,
        boxShadow: '0 0 60px rgba(139,92,246,0.3)',
      }}>
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ fontSize: '3.5rem', marginBottom: 16 }}
        >🏆</motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
          style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 8,
            background: 'linear-gradient(135deg,#C084FC,#818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          Skill Mastered!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.4 } }}
          style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: 20 }}
        >
          {skill}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1, transition: { delay: 0.5, type: 'spring' } }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px',
            background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 999, fontSize: '1.1rem', fontWeight: 700, color: '#FBBF24',
          }}
        >
          ⚡ +{xp} XP Earned
        </motion.div>
        <p style={{ marginTop: 20, fontSize: '0.78rem', color: '#475569' }}>Tap anywhere to continue</p>
      </div>
    </motion.div>
  )
}
