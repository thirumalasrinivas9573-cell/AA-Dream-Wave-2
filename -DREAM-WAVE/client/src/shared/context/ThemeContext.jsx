import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { profileApi } from '../services/api'

export const STITCH_THEMES = [
  { id: 'delulu-daylight', name: 'Delulu Daylight', mode: 'light', icon: 'wb_sunny', desc: 'Luminous Sky White' },
  { id: 'barely-working', name: 'Barely Working', mode: 'dark', icon: 'nightlight', desc: 'Restful Dark Slate' },
  { id: 'green-flag-energy', name: 'Green Flag Energy', mode: 'light', icon: 'eco', desc: 'Sunlit Bio-Mint' },
  { id: 'midnight-intelligence', name: 'Midnight Intelligence', mode: 'dark', icon: 'terminal', desc: 'Command Deck Dark' },
]

const THEME_STORAGE_KEY = 'dreamwave_theme'

const ThemeContext = createContext({
  stitchTheme: 'delulu-daylight',
  isDark: false,
  setStitchTheme: () => {},
  toggleTheme: () => {},
  themes: STITCH_THEMES,
})

export function ThemeProvider({ children }) {
  const [stitchTheme, setStitchThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'delulu-daylight'
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (STITCH_THEMES.some((t) => t.id === stored)) {
        return stored
      }
    } catch {
      // Ignore storage access errors
    }
    return 'delulu-daylight'
  })

  const currentThemeObj = STITCH_THEMES.find((t) => t.id === stitchTheme) || STITCH_THEMES[0]
  const isDark = currentThemeObj.mode === 'dark'

  const applyThemeToDOM = useCallback((themeId) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const themeObj = STITCH_THEMES.find((t) => t.id === themeId) || STITCH_THEMES[0]

    root.setAttribute('data-theme', themeObj.id)

    if (themeObj.mode === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', '#0A1325')
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', '#2F8FDD')
    }
  }, [])

  const setStitchTheme = useCallback((nextThemeId) => {
    if (!STITCH_THEMES.some((t) => t.id === nextThemeId)) return

    setStitchThemeState(nextThemeId)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextThemeId)
    } catch {
      // Storage unavailable
    }

    applyThemeToDOM(nextThemeId)

    try {
      const token = localStorage.getItem('token')
      if (token && profileApi?.preferences) {
        profileApi.preferences({ theme: nextThemeId }).catch(() => {})
      }
    } catch {
      // Ignore sync error
    }
  }, [applyThemeToDOM])

  const toggleTheme = useCallback(() => {
    // Quick toggle switches between primary light (delulu-daylight) and primary dark (midnight-intelligence)
    const next = isDark ? 'delulu-daylight' : 'midnight-intelligence'
    setStitchTheme(next)
  }, [isDark, setStitchTheme])

  useEffect(() => {
    applyThemeToDOM(stitchTheme)
  }, [stitchTheme, applyThemeToDOM])

  return (
    <ThemeContext.Provider
      value={{
        stitchTheme,
        themePreference: stitchTheme,
        resolvedTheme: currentThemeObj.mode,
        isDark,
        setStitchTheme,
        setThemePreference: setStitchTheme,
        toggleTheme,
        themes: STITCH_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext

