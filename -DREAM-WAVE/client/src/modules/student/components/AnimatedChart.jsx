import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

// ── Animated Bar Chart ────────────────────────────────────────────────────────
export function BarChart({ data = [], color = '#8B5CF6', height = 160, label = '' }) {
  const ref   = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const max   = Math.max(...data.map(d => d.value), 1)

  return (
    <div ref={ref}>
      {label && (
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              {/* Value label */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: i * 0.08 + 0.5 }}
                style={{ fontSize: '0.68rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}
              >
                {d.label2 || d.value}
              </motion.span>
              {/* Bar */}
              <div style={{ width: '100%', position: 'relative', borderRadius: '6px 6px 0 0', background: `${color}18`, overflow: 'hidden', height: `${Math.max(pct, 4)}%`, minHeight: 6 }}>
                <motion.div
                  initial={{ scaleY: 0, originY: 1 }}
                  animate={inView ? { scaleY: 1 } : {}}
                  transition={{ duration: 0.7, delay: i * 0.07, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(180deg, ${color}cc, ${color})`,
                    borderRadius: '6px 6px 0 0',
                    boxShadow: `0 0 12px ${color}44`,
                    transformOrigin: 'bottom',
                  }}
                />
              </div>
              {/* X label */}
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Animated Horizontal Bar (for salary/demand) ──────────────────────────────
export function HBar({ label, value, max = 100, color = '#8B5CF6', suffix = '', prefix = '' }) {
  const ref   = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const pct   = Math.min((value / max) * 100, 100)

  return (
    <div ref={ref} style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.845rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: '0.845rem', fontWeight: 800, color }}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
          style={{
            height: '100%', borderRadius: 999,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
            boxShadow: `0 0 8px ${color}55`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: 0.9 }}
            style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', width: '40%' }}
          />
        </motion.div>
      </div>
    </div>
  )
}

// ── Animated Stat Number ─────────────────────────────────────────────────────
export function AnimatedStat({ value, label, color = '#8B5CF6', prefix = '', suffix = '', icon }) {
  const ref    = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-20px' })
  const [count, setCount] = useState(0)
  const numVal = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0

  useEffect(() => {
    if (!inView) return
    const duration = 1400
    const start = Date.now()
    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * numVal))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [inView, numVal])

  const displayValue = typeof value === 'string' && isNaN(numVal)
    ? value
    : `${prefix}${count.toLocaleString()}${suffix}`

  return (
    <div ref={ref} style={{
      textAlign: 'center', padding: '20px 16px',
      background: `${color}0a`, border: `1px solid ${color}22`,
      borderRadius: 'var(--r-lg)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 80%, ${color}15, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {icon && <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>}
      <motion.div
        animate={inView ? { scale: [0.8, 1.05, 1] } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{ fontSize: '1.75rem', fontWeight: 900, color, lineHeight: 1, marginBottom: 6 }}
      >
        {displayValue}
      </motion.div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
export function DonutChart({ segments = [], size = 120, label = '' }) {
  const ref   = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  const r     = size / 2 - 10
  const circ  = 2 * Math.PI * r

  let cumulative = 0

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        {segments.map((seg, i) => {
          const pct   = seg.value / total
          const dash  = pct * circ
          const offset = cumulative * circ
          cumulative += pct
          return (
            <motion.circle
              key={i}
              cx={size/2} cy={size/2} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-offset}
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={inView ? { strokeDasharray: `${dash} ${circ}` } : {}}
              transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${seg.color}88)` }}
            />
          )
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0, boxShadow: `0 0 6px ${seg.color}` }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', flex: 1 }}>{seg.label}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: seg.color }}>{Math.round(seg.value / total * 100)}%</span>
          </div>
        ))}
      </div>
      {label && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</div>}
    </div>
  )
}

// ── Timeline Chart ────────────────────────────────────────────────────────────
export function TimelineChart({ items = [], color = '#8B5CF6' }) {
  const ref   = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <div ref={ref} style={{ position: 'relative', paddingLeft: 24 }}>
      {/* Vertical track */}
      <motion.div
        initial={{ scaleY: 0, originY: 0 }}
        animate={inView ? { scaleY: 1 } : {}}
        transition={{ duration: 0.8 }}
        style={{
          position: 'absolute', left: 6, top: 8, bottom: 8,
          width: 2, background: `linear-gradient(180deg, ${color}, ${color}22)`,
          borderRadius: 999,
        }}
      />
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -16 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}
        >
          {/* Dot */}
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ type: 'spring', delay: i * 0.1 + 0.2 }}
            style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i === 0 ? color : `${color}55`,
              border: `2px solid ${i === 0 ? color : `${color}33`}`,
              boxShadow: i === 0 ? `0 0 12px ${color}` : 'none',
              flexShrink: 0, marginLeft: -21, marginTop: 2,
            }}
          />
          <div className="card card-sm" style={{ flex: 1, background: `${color}08`, border: `1px solid ${color}18` }}>
            {item.period && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color, marginBottom: 3, display: 'block' }}>
                {item.period}
              </span>
            )}
            {item.title && (
              <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 3 }}>{item.title}</div>
            )}
            {item.description && (
              <p style={{ fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>{item.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
