import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

const OPTIONS = [
  { id: 'light', label: 'Light', icon: '☀️', tip: 'Always Light theme' },
  { id: 'dark', label: 'Dark', icon: '🌙', tip: 'Always Dark theme' },
  { id: 'system', label: 'System', icon: '⚙️', tip: 'Match operating system' },
]


export default function ThemeToggle({
  variant = 'segmented', // 'segmented' | 'compact' | 'icon'
  className = '',
  style = {},
}) {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [dropdownOpen])

  // ── Segmented Control Variant (ideal for sidebars, settings, profiles) ──
  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label="Theme mode selection"
        className={`theme-segmented-control ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '3px',
          gap: '2px',
          position: 'relative',
          userSelect: 'none',
          boxShadow: 'var(--shadow-sm)',
          ...style,
        }}
      >
        {OPTIONS.map(({ id, label, icon, tip }) => {
          const isActive = themePreference === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`${label} theme: ${tip}`}
              title={`${label} Mode (${tip})`}
              onClick={() => setThemePreference(id)}
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 10px',
                borderRadius: '9px',
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 650 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
                fontFamily: 'inherit',
                zIndex: 1,
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeThemePill"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9px',
                    background: resolvedTheme === 'dark' ? 'rgba(157, 141, 241, 0.18)' : 'rgba(140, 122, 230, 0.14)',
                    border: '1px solid var(--border-purple)',
                    boxShadow: '0 2px 8px rgba(140, 122, 230, 0.15)',
                    zIndex: -1,
                  }}
                />
              )}
              <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // ── Compact / Icon Toggle Variant with Popover (ideal for headers / topbars) ──
  const activeOption = OPTIONS.find((o) => o.id === themePreference) || OPTIONS[0]
  const currentIcon = activeOption.id === 'system'
    ? (resolvedTheme === 'dark' ? '⚙️' : '⚙️')
    : activeOption.icon

  return (
    <div
      ref={dropdownRef}
      className={`theme-toggle-compact ${className}`}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
    >
      <button
        type="button"
        aria-label={`Current theme: ${activeOption.label}. Click to switch.`}
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        title={`Theme: ${activeOption.label} (Click to change)`}
        onClick={() => setDropdownOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '6px 10px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.18s ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-purple)'
          e.currentTarget.style.boxShadow = 'var(--shadow)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>{currentIcon}</span>
        {variant === 'compact' && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {activeOption.label}
          </span>
        )}
        <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>▾</span>
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: 100,
              minWidth: '150px',
              padding: '6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                padding: '4px 8px 2px',
              }}
            >
              Select Theme
            </div>
            {OPTIONS.map(({ id, label, icon }) => {

              const isSelected = themePreference === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setThemePreference(id)
                    setDropdownOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSelected
                      ? 'var(--bg-hover)'
                      : 'transparent',
                    color: isSelected
                      ? 'var(--purple-light)'
                      : 'var(--text-primary)',
                    fontWeight: isSelected ? 650 : 500,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.95rem' }}>{icon}</span>
                    <span>{label}</span>
                  </span>
                  {isSelected && (
                    <span style={{ color: 'var(--purple)', fontSize: '0.85rem' }}>✓</span>
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
