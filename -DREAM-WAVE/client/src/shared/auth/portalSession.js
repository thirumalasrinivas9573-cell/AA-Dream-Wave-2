/**
 * Shared portal auth constants + session persistence.
 * One auth backend; three isolated portals.
 */
export const PORTALS = ['student', 'institution', 'company', 'admin']

export const PORTAL_DASHBOARD = {
  student: '/student/dashboard',
  institution: '/institution/dashboard',
  company: '/company/dashboard',
  admin: '/admin',
}

export const PORTAL_LOGIN = {
  student: '/student/login',
  institution: '/institution/login',
  company: '/company/login',
  admin: '/admin/login',
}

export const PORTAL_LABEL = {
  student: 'Student',
  institution: 'Institution',
  company: 'Company',
  admin: 'Admin',
}

const SELECTED_KEY = 'dw_selected_portal'
const OTP_CHALLENGE_KEY = 'dw_otp_challenge'

export function isPortal(value) {
  return PORTALS.includes(value)
}

/** Persist portal chosen on landing / login (survives OTP step + refresh). */
export function setSelectedPortal(portal) {
  if (!isPortal(portal)) return
  try {
    sessionStorage.setItem(SELECTED_KEY, portal)
    localStorage.setItem(SELECTED_KEY, portal)
  } catch { /* ignore */ }
}

export function getSelectedPortal(fallback = null) {
  try {
    const fromSession = sessionStorage.getItem(SELECTED_KEY)
    if (isPortal(fromSession)) return fromSession
    const fromLocal = localStorage.getItem(SELECTED_KEY)
    if (isPortal(fromLocal)) return fromLocal
  } catch { /* ignore */ }
  return isPortal(fallback) ? fallback : null
}

export function clearSelectedPortal() {
  try {
    sessionStorage.removeItem(SELECTED_KEY)
    localStorage.removeItem(SELECTED_KEY)
    sessionStorage.removeItem(OTP_CHALLENGE_KEY)
  } catch { /* ignore */ }
}

/** Persist OTP challenge so refresh mid-OTP does not lose portal context. */
export function saveOtpChallenge(payload) {
  try {
    sessionStorage.setItem(OTP_CHALLENGE_KEY, JSON.stringify({
      ...payload,
      savedAt: Date.now(),
    }))
  } catch { /* ignore */ }
}

export function loadOtpChallenge() {
  try {
    const raw = sessionStorage.getItem(OTP_CHALLENGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Challenges expire server-side ~5m; drop stale client copy after 10m
    if (Date.now() - (data.savedAt || 0) > 10 * 60 * 1000) {
      sessionStorage.removeItem(OTP_CHALLENGE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearOtpChallenge() {
  try {
    sessionStorage.removeItem(OTP_CHALLENGE_KEY)
  } catch { /* ignore */ }
}

export function portalDashboard(portal) {
  return PORTAL_DASHBOARD[portal] || null
}

export const PORTAL_SIGNUP = {
  student: '/student/signup',
  institution: '/institution/signup',
  company: '/company/signup',
}

export function portalSignupPath(portal) {
  return PORTAL_SIGNUP[portal] || null
}

/**
 * Cross-portal login copy.
 * e.g. "This email is registered as a Student account, not an Institution account."
 */
export function wrongPortalMessage(portal, existingRoles = []) {
  const label = PORTAL_LABEL[portal] || String(portal || 'portal')
  const article = label === 'Institution' ? 'an' : 'a'
  const roles = (Array.isArray(existingRoles) ? existingRoles : [existingRoles])
    .filter((r) => PORTAL_LABEL[r] && r !== portal)

  if (!roles.length) {
    return `This email is not registered as ${article} ${label} account.`
  }
  if (roles.length === 1) {
    const r = roles[0]
    const rLabel = PORTAL_LABEL[r]
    const rArticle = rLabel === 'Institution' ? 'an' : 'a'
    return `This email is registered as ${rArticle} ${rLabel} account, not ${article} ${label} account.`
  }
  const listed = roles.map((r) => PORTAL_LABEL[r]).join(' and ')
  return `This email is registered as ${listed} accounts, not ${article} ${label} account.`
}
