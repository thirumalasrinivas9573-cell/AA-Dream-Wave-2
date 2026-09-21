import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { authApi } from '../services/api'
import { clearSelectedPortal, PORTAL_DASHBOARD } from '../auth/portalSession'

const AuthContext = createContext()
const REMEMBER_KEY = 'dw_remember_email'
const PORTAL_KEY = 'dw_active_portal'
const SESSION_HINT_KEY = 'dw_has_session'

/** Keep role exactly as returned by the API — never invent "student". */
function normalizeUser(raw) {
  if (!raw) return null
  return { ...raw, role: raw.role || null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const persistSession = useCallback((token, nextUser, rememberEmail) => {
    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem(SESSION_HINT_KEY, '1')
    }
    if (nextUser) {
      const normalized = normalizeUser(nextUser)
      setUser(normalized)
      if (normalized?.role) localStorage.setItem(PORTAL_KEY, normalized.role)
    }
    if (rememberEmail) localStorage.setItem(REMEMBER_KEY, rememberEmail)
    else if (rememberEmail === null) localStorage.removeItem(REMEMBER_KEY)
  }, [])

  const clearLocalSession = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem(SESSION_HINT_KEY)
    localStorage.removeItem(PORTAL_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      const token = localStorage.getItem('token')
      const hasSession = localStorage.getItem(SESSION_HINT_KEY) === '1'
      try {
        if (token) {
          const res = await api.get('/auth/me')
          if (!cancelled) {
            const next = normalizeUser(res.data.user)
            setUser(next)
            if (next?.role) localStorage.setItem(PORTAL_KEY, next.role)
          }
        } else if (hasSession) {
          const { data } = await api.post('/auth/refresh', {}, { timeout: 8000 })
          if (!cancelled) persistSession(data.token, data.user)
        } else {
          if (!cancelled) clearLocalSession()
        }
      } catch {
        if (!cancelled) clearLocalSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    boot()
    return () => { cancelled = true }
  }, [persistSession, clearLocalSession])

  useEffect(() => {
    const handleExpired = () => clearLocalSession()
    window.addEventListener('dw:session-expired', handleExpired)
    return () => window.removeEventListener('dw:session-expired', handleExpired)
  }, [clearLocalSession])

  const login = async (emailOrPhone, password, portal, options = {}) => {
    const body = {
      identifier: emailOrPhone,
      email: String(emailOrPhone || '').includes('@') ? emailOrPhone : undefined,
      phone: String(emailOrPhone || '').includes('@') ? undefined : emailOrPhone,
      password,
      remember: options.remember !== false,
      portal,
    }
    if (options.otpChannel) body.otpChannel = options.otpChannel
    const { data } = await api.post('/auth/login', body)
    if (data.requiresOtp) return data
    if (data.token) {
      persistSession(
        data.token,
        data.user,
        options.remember && String(emailOrPhone).includes('@') ? emailOrPhone : null,
      )
    }
    return data
  }

  const verifyLoginEmailOtp = async (challengeToken, otp, rememberEmail, remember = true, portal = null) => {
    const body = { challengeToken, otp, remember }
    if (portal) body.portal = portal
    const { data } = await authApi.verifyLoginEmailOtp(body)
    persistSession(data.token || data.accessToken, data.user, rememberEmail)
    return data
  }

  const verifyPhoneOtp = async (payload, rememberEmail, remember = true, portal = null) => {
    const body = { ...payload, remember }
    if (portal) body.portal = portal
    const { data } = await authApi.verifyPhoneOtp(body)
    if (data.token || data.accessToken) {
      persistSession(data.token || data.accessToken, data.user, rememberEmail)
    }
    return data
  }

  /**
   * Enter a portal dashboard by explicit path or authenticated role.
   * Never falls back to student when role/path is institution or company.
   */
  const goToPortal = (userOrRole, portalDashboardPath) => {
    if (portalDashboardPath) {
      window.location.assign(portalDashboardPath)
      return
    }
    const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role
    const dest = PORTAL_DASHBOARD[role]
    if (!dest) {
      window.location.assign('/')
      return
    }
    window.location.assign(dest)
  }

  const signup = async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password })
    return data
  }

  const logout = async (allSessions = false) => {
    try {
      if (allSessions) await authApi.logoutAll()
      else await authApi.logout()
    } catch { /* ignore */ }
    clearLocalSession()
    clearSelectedPortal()
  }

  const updateUser = (updates) => setUser(prev => normalizeUser({ ...prev, ...updates }))
  const rememberedEmail = () => localStorage.getItem(REMEMBER_KEY) || ''

  const listSessions = () => authApi.listSessions()
  const revokeSession = (id) => authApi.revokeSession(id)
  const revokeAllSessions = () => authApi.revokeAllSessions()

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: Boolean(user && localStorage.getItem('token')),
      login,
      signup,
      logout,
      updateUser,
      applySession: persistSession,
      verifyLoginEmailOtp,
      verifyPhoneOtp,
      goToPortal,
      rememberedEmail,
      listSessions,
      revokeSession,
      revokeAllSessions,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
