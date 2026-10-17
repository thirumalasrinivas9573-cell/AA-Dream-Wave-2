import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, STITCH_THEMES } from '../context/ThemeContext'

export function ThemeSelector({ variant = 'segmented', className = '', style = {} }) {
  const { stitchTheme, setStitchTheme, themes = STITCH_THEMES } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

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

  const activeThemeObj = themes.find((t) => t.id === stitchTheme) || themes[0]

  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label="Select Stitch UI Theme"
        className={`flex items-center bg-surface border border-divider rounded-xl p-1 gap-1 relative select-none shadow-sm overflow-x-auto ${className}`}
        style={style}
      >
        {themes.map(({ id, name, icon, mode }) => {
          const isActive = stitchTheme === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isActive}
              title={`${name} (${mode})`}
              onClick={() => setStitchTheme(id)}
              className={`flex-1 min-w-[110px] relative flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border-0 text-xs font-semibold cursor-pointer transition-all duration-150 ${
                isActive
                  ? 'text-brand-primary bg-surface-elevated shadow-xs border border-focus'
                  : 'text-content-muted hover:text-content-heading hover:bg-surface-elevated/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeStitchTheme"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-lg bg-brand-primary/10 border border-brand-primary/30 z-0"
                />
              )}
              <span className="material-symbols-outlined text-[15px] z-10">{icon}</span>
              <span className="truncate z-10">{name}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className={`relative inline-flex ${className}`} style={style}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        title={`Theme: ${activeThemeObj.name}`}
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-divider bg-surface text-content-heading text-xs font-semibold shadow-xs hover:border-brand-primary transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px] text-brand-primary">{activeThemeObj.icon}</span>
        <span className="truncate">{activeThemeObj.name}</span>
        <span className="text-[10px] opacity-60">▾</span>
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[200px] p-2 bg-surface border border-divider rounded-2xl shadow-xl backdrop-blur-xl flex flex-col gap-1"
          >
            <div className="text-[10px] font-bold tracking-wider uppercase text-content-muted px-2 py-1">
              Select Stitch Theme (4)
            </div>
            {themes.map(({ id, name, icon, desc, mode }) => {
              const isSelected = stitchTheme === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setStitchTheme(id)
                    setDropdownOpen(false)
                  }}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-primary/15 text-brand-primary font-bold'
                      : 'text-content-body hover:bg-surface-elevated hover:text-content-heading'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{name}</span>
                      <span className="text-[10px] text-content-muted capitalize">{desc || mode}</span>
                    </div>
                  </div>
                  {isSelected && <span className="material-symbols-outlined text-[16px] text-brand-primary">check</span>}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ThemeToggle(props) {
  return <ThemeSelector {...props} />
}
