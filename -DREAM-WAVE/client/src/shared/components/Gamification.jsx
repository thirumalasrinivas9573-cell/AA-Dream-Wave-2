import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── XP Burst — floating +XP number ───────────────────────────────────────────
export function XPBurst({ amount = 10, x = '50%', y = '50%', color = '#8B5CF6' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x: '-50%', y: 0 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1.1, 0.8], y: -60 }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
      style={{
        position: 'fixed', left: x, top: y,
        pointerEvents: 'none', zIndex: 9999,
        fontWeight: 900, fontSize: '1.25rem',
        color: color,
        textShadow: `0 0 20px ${color}`,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '-0.02em',
      }}
    >
      +{amount} XP
    </motion.div>
  )
}

// ── Achievement Unlock Banner ─────────────────────────────────────────────────
export function AchievementBanner({ achievement, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: -80, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9998, maxWidth: 400, width: 'calc(100% - 40px)',
        background: 'linear-gradient(135deg, rgba(17,24,39,0.98), rgba(30,20,50,0.98))',
        border: '1px solid rgba(139,92,246,0.5)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(139,92,246,0.25)',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Shimmer top line */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 1.2, delay: 0.2 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #8B5CF6, #C084FC, transparent)' }}
      />
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.15 }}
          style={{
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg, ${achievement.color || '#8B5CF6'}, ${achievement.color2 || '#C084FC'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', flexShrink: 0,
            boxShadow: `0 8px 24px ${achievement.color || '#8B5CF6'}44`,
          }}
        >
          {achievement.icon || '🏆'}
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
            🏆 Achievement Unlocked!
          </div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#F8FAFC', marginBottom: 1 }}>
            {achievement.title}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{achievement.description}</div>
        </div>
        {achievement.xp && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            style={{
              background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 999, padding: '4px 12px',
              fontWeight: 800, fontSize: '0.85rem', color: '#C084FC', flexShrink: 0,
            }}
          >
            +{achievement.xp} XP
          </motion.div>
        )}
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#64748B', cursor: 'pointer',
          fontSize: '1.1rem', padding: 4, flexShrink: 0, lineHeight: 1,
        }}>×</button>
      </div>
      {/* Auto-dismiss progress bar */}
      <motion.div
        initial={{ scaleX: 1, originX: 0 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4.5, ease: 'linear' }}
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${achievement.color || '#8B5CF6'}, ${achievement.color2 || '#C084FC'})`,
          transformOrigin: 'left',
        }}
      />
    </motion.div>
  )
}

// ── Task Completion Celebration ───────────────────────────────────────────────
export function TaskCompleteCelebration({ type = 'learn', title = '', onDone }) {
  const typeMap = {
    learn:    { emoji: '📖', label: 'Lesson Complete!', color: '#6366F1', xp: 15 },
    quiz:     { emoji: '🧠', label: 'Quiz Mastered!',   color: '#F59E0B', xp: 20 },
    practice: { emoji: '⚒️', label: 'Practice Done!',   color: '#10B981', xp: 25 },
    revise:   { emoji: '🔁', label: 'Revision Done!',   color: '#A855F7', xp: 12 },
  }
  const meta = typeMap[type] || typeMap.learn

  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9997,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onDone}
    >
      <div style={{
        background: 'linear-gradient(135deg, rgba(17,24,39,0.99), rgba(25,15,45,0.99))',
        border: `1px solid ${meta.color}44`,
        borderRadius: 24, padding: '40px 48px',
        textAlign: 'center', maxWidth: 360,
        boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 60px ${meta.color}22`,
      }}>
        <motion.div
          animate={{ scale: [1, 1.25, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{ fontSize: '3.5rem', marginBottom: 16, display: 'block' }}
        >
          {meta.emoji}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div style={{ fontWeight: 900, fontSize: '1.5rem', color: meta.color, marginBottom: 6 }}>
            {meta.label}
          </div>
          {title && (
            <div style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: 16, lineHeight: 1.5 }}>
              {title}
            </div>
          )}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.4, stiffness: 600, damping: 20 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
              borderRadius: 999, padding: '6px 18px',
              fontWeight: 800, fontSize: '1.1rem', color: meta.color,
            }}
          >
            +{meta.xp} XP
          </motion.div>
        </motion.div>
        {/* Particle confetti */}
        <Confetti color={meta.color} />
      </div>
    </motion.div>
  )
}

function Confetti({ color }) {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    x: (Math.random() - 0.5) * 300,
    y: (Math.random() - 0.5) * 300,
    rotate: Math.random() * 360,
    scale: 0.4 + Math.random() * 0.8,
    delay: Math.random() * 0.4,
    shape: i % 3,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 24 }}>
      {particles.map((p, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 0], x: p.x, y: p.y, scale: p.scale, rotate: p.rotate }}
          transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: p.shape === 0 ? 8 : p.shape === 1 ? 6 : 10,
            height: p.shape === 0 ? 8 : p.shape === 1 ? 10 : 4,
            borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? 2 : 999,
            background: i % 2 === 0 ? color : i % 3 === 0 ? '#F59E0B' : '#10B981',
          }}
        />
      ))}
    </div>
  )
}

// ── Streak Flame ──────────────────────────────────────────────────────────────
export function StreakFlame({ streak = 0, size = 40 }) {
  const isHot = streak >= 7
  const isOnFire = streak >= 30

  return (
    <motion.div
      animate={isOnFire
        ? { scale: [1, 1.08, 1], filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'] }
        : isHot
          ? { scale: [1, 1.05, 1] }
          : {}}
      transition={{ duration: isOnFire ? 0.8 : 1.5, repeat: Infinity }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>
        {isOnFire ? '🔥' : isHot ? '⚡' : '✨'}
      </span>
      <span style={{
        fontWeight: 800, fontSize: size * 0.35,
        color: isOnFire ? '#F59E0B' : isHot ? '#FBBF24' : '#8B5CF6',
        lineHeight: 1,
      }}>
        {streak}d
      </span>
    </motion.div>
  )
}

// ── XP Progress Ring ──────────────────────────────────────────────────────────
export function XPRing({ xp = 0, level = 1, size = 72, color = '#8B5CF6' }) {
  const xpPerLevel = 100
  const progress = (xp % xpPerLevel) / xpPerLevel
  const circumference = 2 * Math.PI * (size / 2 - 5)
  const strokeDash = circumference * progress

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 5}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
        {/* Progress */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={size / 2 - 5}
          fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - strokeDash }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontWeight: 900, fontSize: size * 0.24, color, lineHeight: 1 }}>{level}</span>
        <span style={{ fontSize: size * 0.14, color: '#64748B', fontWeight: 600 }}>LVL</span>
      </div>
    </div>
  )
}

// ── Gamification Manager — hook to trigger events ─────────────────────────────
export function useGamification() {
  const [xpBursts, setXpBursts] = useState([])
  const [achievements, setAchievements] = useState([])
  const [celebration, setCelebration] = useState(null)

  const triggerXP = useCallback((amount, x, y, color) => {
    const id = Date.now() + Math.random()
    setXpBursts(prev => [...prev, { id, amount, x, y, color }])
    setTimeout(() => setXpBursts(prev => prev.filter(b => b.id !== id)), 1200)
  }, [])

  const triggerAchievement = useCallback((achievement) => {
    const id = Date.now()
    setAchievements(prev => [...prev, { ...achievement, id }])
  }, [])

  const triggerCelebration = useCallback((type, title) => {
    setCelebration({ type, title, id: Date.now() })
  }, [])

  const dismissAchievement = useCallback((id) => {
    setAchievements(prev => prev.filter(a => a.id !== id))
  }, [])

  const GamificationOverlay = () => (
    <>
      {/* XP Bursts */}
      {xpBursts.map(b => (
        <XPBurst key={b.id} amount={b.amount} x={b.x} y={b.y} color={b.color} />
      ))}
      {/* Achievement banners */}
      <AnimatePresence>
        {achievements.slice(0, 1).map(a => (
          <AchievementBanner key={a.id} achievement={a} onClose={() => dismissAchievement(a.id)} />
        ))}
      </AnimatePresence>
      {/* Task celebration */}
      <AnimatePresence>
        {celebration && (
          <TaskCompleteCelebration
            key={celebration.id}
            type={celebration.type}
            title={celebration.title}
            onDone={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>
    </>
  )

  return { triggerXP, triggerAchievement, triggerCelebration, GamificationOverlay }
}

// ── Default export — full overlay provider ────────────────────────────────────
export default function GamificationProvider({ children }) {
  return <>{children}</>
}
