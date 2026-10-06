import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { profileApi } from '../services/api'

const THEME_STORAGE_KEY = 'themePreference'
const ThemeContext = createContext({
  themePreference: 'system',
  resolvedTheme: 'light',
  isDark: false,
  setThemePreference: () => {},
  toggleTheme: () => {},
})

function getSystemDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(preference) {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  return getSystemDark() ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreferenceState] = useState(() => {
    if (typeof window === 'undefined') return 'system'
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored
      }
    } catch {
      // Ignore storage access errors
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(themePreference))

  // Apply resolved theme to document root and meta theme-color
  const applyThemeToDOM = useCallback((theme, withTransition = false) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (withTransition && !prefersReducedMotion) {
      root.classList.add('theme-transition')
      window.clearTimeout(window.__themeTransitionTimeout)
      window.__themeTransitionTimeout = window.setTimeout(() => {
        root.classList.remove('theme-transition')
      }, 300)
    }

    if (theme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', '#0A0D14')
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', '#FBF9FC')
    }
  }, [])

  // Change preference handler
  const setThemePreference = useCallback((nextPreference) => {
    if (!['light', 'dark', 'system'].includes(nextPreference)) return

    setThemePreferenceState(nextPreference)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextPreference)
    } catch {
      // Storage unavailable
    }

    const nextResolved = resolveTheme(nextPreference)
    setResolvedTheme(nextResolved)
    applyThemeToDOM(nextResolved, true)

    // Optional background sync with backend profile if user is logged in
    try {
      const token = localStorage.getItem('token')
      if (token && profileApi?.preferences) {
        profileApi.preferences({ theme: nextPreference }).catch(() => {
          // Silent catch: network or permission issue will not disrupt user UI
        })
      }
    } catch {
      // Ignore sync error
    }
  }, [applyThemeToDOM])

  // Quick toggle between light and dark
  const toggleTheme = useCallback(() => {
    setThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setThemePreference])

  // React to system theme changes when preference is 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (e) => {
      if (themePreference === 'system') {
        const nextResolved = e.matches ? 'dark' : 'light'
        setResolvedTheme(nextResolved)
        applyThemeToDOM(nextResolved, true)
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange)
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleSystemChange)
      }
    }
  }, [themePreference, applyThemeToDOM])

  // Initial sync on mount
  useEffect(() => {
    const nextResolved = resolveTheme(themePreference)
    setResolvedTheme(nextResolved)
    applyThemeToDOM(nextResolved, false)
  }, [themePreference, applyThemeToDOM])

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        setThemePreference,
        toggleTheme,
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
