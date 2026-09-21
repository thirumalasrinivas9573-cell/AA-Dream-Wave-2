import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

// ── Visual Learning System ────────────────────────────────────────────────────
// Renders flowcharts, concept trees, process diagrams, and relationship graphs
// from a simple data structure.

// ── Flowchart ─────────────────────────────────────────────────────────────────
export function Flowchart({ steps = [], color = '#8B5CF6', title = '' }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const shapeStyle = (type) => ({
    start:    { borderRadius: 999, background: `${color}22`, border: `2px solid ${color}` },
    end:      { borderRadius: 999, background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981' },
    process:  { borderRadius: 12, background: `${color}12`, border: `1px solid ${color}44` },
    decision: { borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', transform: 'rotate(0deg)' },
    default:  { borderRadius: 10, background: `${color}10`, border: `1px solid ${color}30` },
  })[type] || {}

  return (
    <div ref={ref}>
      {title && (
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, textAlign: 'center' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 400 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.35, delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                padding: '12px 20px', width: '100%', textAlign: 'center',
                ...shapeStyle(step.type),
              }}
            >
              {step.icon && <span style={{ marginRight: 8, fontSize: '1rem' }}>{step.icon}</span>}
              <span style={{ fontWeight: step.type === 'start' || step.type === 'end' ? 700 : 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                {step.label}
              </span>
              {step.note && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{step.note}</div>
              )}
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                initial={{ scaleY: 0, originY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{ duration: 0.3, delay: i * 0.1 + 0.25 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}
              >
                <div style={{ width: 2, height: 20, background: `linear-gradient(180deg, ${color}, ${color}44)` }} />
                <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${color}88` }} />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Concept Tree ──────────────────────────────────────────────────────────────
export function ConceptTree({ root = '', children = [], color = '#8B5CF6' }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <div ref={ref} style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, minWidth: 280 }}>
        {/* Root node */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.4, type: 'spring' }}
          style={{
            padding: '12px 24px', borderRadius: 12,
            background: `linear-gradient(135deg, ${color}22, ${color}10)`,
            border: `2px solid ${color}`,
            fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)',
            boxShadow: `0 4px 20px ${color}22`,
            textAlign: 'center', marginBottom: 0,
          }}
        >
          {root}
        </motion.div>

        {/* Connector */}
        <motion.div
          initial={{ scaleY: 0, originY: 0 }}
          animate={inView ? { scaleY: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ width: 2, height: 24, background: `linear-gradient(180deg, ${color}, ${color}44)` }}
        />

        {/* Horizontal branch */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.35 }}
          style={{
            width: `${Math.min(children.length * 100, 600)}px`,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
            position: 'relative',
          }}
        />

        {/* Children row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {children.map((child, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Down connector */}
              <motion.div
                initial={{ scaleY: 0, originY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.5 + i * 0.06 }}
                style={{ width: 2, height: 20, background: `${color}44` }}
              />
              {/* Child node */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.35, delay: 0.55 + i * 0.07, type: 'spring' }}
                style={{
                  padding: '8px 14px', borderRadius: 10,
                  background: `${color}10`, border: `1px solid ${color}35`,
                  fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)',
                  textAlign: 'center', maxWidth: 120,
                }}
              >
                {child.icon && <span style={{ marginRight: 4 }}>{child.icon}</span>}
                {child.label || child}
                {/* Grandchildren */}
                {child.children && child.children.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {child.children.map((gc, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0 }}
                        animate={inView ? { opacity: 1 } : {}}
                        transition={{ delay: 0.7 + j * 0.05 }}
                        style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: `${color}08`, borderRadius: 6, padding: '2px 6px' }}
                      >
                        {gc}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Process Visualization ─────────────────────────────────────────────────────
export function ProcessVisual({ steps = [], color = '#8B5CF6', horizontal = false }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const stepColors = [color, '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#A855F7']

  if (horizontal) {
    return (
      <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.35, delay: i * 0.1 }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 12,
                background: `${stepColors[i % stepColors.length]}12`,
                border: `1px solid ${stepColors[i % stepColors.length]}30`,
                minWidth: 100, textAlign: 'center',
              }}
            >
              {step.icon && <span style={{ fontSize: '1.4rem' }}>{step.icon}</span>}
              <div style={{ fontWeight: 700, fontSize: '0.72rem', color: stepColors[i % stepColors.length] }}>
                Step {i + 1}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{step.label}</div>
              {step.note && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{step.note}</div>}
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={inView ? { opacity: 1, scaleX: 1 } : {}}
                transition={{ duration: 0.3, delay: i * 0.1 + 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}
              >
                <div style={{ height: 2, width: 24, background: `${stepColors[i % stepColors.length]}55` }} />
                <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${stepColors[i % stepColors.length]}66` }} />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -16 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.35, delay: i * 0.08 }}
          style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${stepColors[i % stepColors.length]}, ${stepColors[i % stepColors.length]}aa)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.8rem', color: 'white',
              boxShadow: `0 4px 12px ${stepColors[i % stepColors.length]}44`,
            }}>
              {step.icon || i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 2, height: 24, background: `linear-gradient(180deg, ${stepColors[i % stepColors.length]}66, transparent)`, margin: '2px 0' }} />
            )}
          </div>
          <div className="card card-sm" style={{ flex: 1, background: `${stepColors[i % stepColors.length]}08`, border: `1px solid ${stepColors[i % stepColors.length]}20`, marginBottom: i < steps.length - 1 ? 0 : 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: step.note ? 4 : 0 }}>{step.label}</div>
            {step.note && <p style={{ fontSize: '0.8rem', lineHeight: 1.55, margin: 0 }}>{step.note}</p>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Relationship Graph (simple) ───────────────────────────────────────────────
export function RelationshipGraph({ center = '', related = [], color = '#8B5CF6', size = 280 }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const cx = size / 2, cy = size / 2
  const r  = size * 0.34

  return (
    <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Connection lines */}
        {related.map((item, i) => {
          const angle = (i / related.length) * Math.PI * 2 - Math.PI / 2
          const nx = cx + Math.cos(angle) * r
          const ny = cy + Math.sin(angle) * r
          const itemColor = item.color || color
          return (
            <motion.line
              key={i} x1={cx} y1={cy} x2={nx} y2={ny}
              stroke={itemColor} strokeWidth={1.5} strokeOpacity={0.4}
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.06 }}
              style={{ filter: `drop-shadow(0 0 4px ${itemColor}44)` }}
            />
          )
        })}

        {/* Center node */}
        <motion.circle cx={cx} cy={cy} r={36} fill={`${color}22`} stroke={color} strokeWidth={2}
          initial={{ scale: 0 }} animate={inView ? { scale: 1 } : {}} transition={{ type: 'spring', delay: 0.1 }} />
        <motion.circle cx={cx} cy={cy} r={40} fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.3}
          animate={{ r: [40, 48, 40] }} transition={{ duration: 3, repeat: Infinity }} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#F8FAFC" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
          {center.slice(0, 12)}
        </text>

        {/* Related nodes */}
        {related.map((item, i) => {
          const angle = (i / related.length) * Math.PI * 2 - Math.PI / 2
          const nx = cx + Math.cos(angle) * r
          const ny = cy + Math.sin(angle) * r
          const itemColor = item.color || color

          return (
            <g key={i}>
              <motion.circle cx={nx} cy={ny} r={22} fill={`${itemColor}18`} stroke={itemColor} strokeWidth={1.5}
                initial={{ scale: 0 }} animate={inView ? { scale: 1 } : {}}
                transition={{ type: 'spring', delay: 0.3 + i * 0.07 }}
                style={{ filter: `drop-shadow(0 0 6px ${itemColor}44)` }} />
              <text x={nx} y={ny + 4} textAnchor="middle" fill={itemColor} fontSize="8.5" fontWeight="600" fontFamily="Inter, sans-serif">
                {(item.label || item).slice(0, 8)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Smart Visual from lesson data ─────────────────────────────────────────────
// Automatically picks the right visual type based on scene data
export function AutoVisual({ scene, color = '#8B5CF6' }) {
  if (!scene) return null

  // If narration mentions "steps", "process", "how to" — use process visual
  const nar = (scene.narration || '').toLowerCase()
  const isProcess = /step|process|how to|first.*then|sequence/.test(nar)
  if (isProcess && scene.keyPoints?.length > 1) {
    return (
      <ProcessVisual
        color={color}
        steps={scene.keyPoints.map((kp, i) => ({ label: kp, icon: ['📌', '⚙️', '✅', '🔧', '🚀'][i] || '📌' }))}
        horizontal
      />
    )
  }

  return null
}
