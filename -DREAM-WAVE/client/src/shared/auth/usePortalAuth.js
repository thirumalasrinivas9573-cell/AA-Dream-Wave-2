/**
 * Shared portal authentication hook — Student / Institution / Company.
 * Password login only (email/OTP verification disabled). Reset-password still uses email code.
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import {
  clearOtpChallenge,
  getSelectedPortal,
  portalDashboard,
  portalSignupPath,
  setSelectedPortal,
  wrongPortalMessage,
} from './portalSession'

export default function usePortalAuth(portalProp) {
  const portal = getSelectedPortal(portalProp) || portalProp
  const {
    login,
    goToPortal,
    logout,
    rememberedEmail,
  } = useAuth()

  const [identifier, setIdentifier] = useState(rememberedEmail())
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(rememberedEmail()))
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('credentials')
  const [forgot, setForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetOtp, setResetOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [signupCta, setSignupCta] = useState(null)

  useEffect(() => {
    if (portalProp) setSelectedPortal(portalProp)
  }, [portalProp])

  const dashboardPath = portalDashboard(portal)

  const finishLogin = useCallback(async (data) => {
    const token = data?.token || data?.accessToken
    if (!token) {
      setError('Login succeeded but no session token was returned. Try again.')
      setLoading(false)
      return
    }
    const role = data.user?.role || data.role
    if (portal && role && role !== portal) {
      await logout()
      clearOtpChallenge()
      setSignupCta(portalSignupPath(portal))
      setError(wrongPortalMessage(portal, [role]))
      setLoading(false)
      setStep('credentials')
      return
    }
    if (portal && !role) {
      await logout()
      clearOtpChallenge()
      setSignupCta(portalSignupPath(portal))
      setError(wrongPortalMessage(portal, []))
      setLoading(false)
      return
    }
    clearOtpChallenge()
    setSignupCta(null)
    setSelectedPortal(portal)
    goToPortal(data.user, dashboardPath)
  }, [portal, dashboardPath, goToPortal, logout])

  const handleCredentials = async (e) => {
    e?.preventDefault?.()
    setError(''); setInfo(''); setSignupCta(null); setLoading(true)
    try {
      const data = await login(identifier, password, portal, { remember })
      await finishLogin(data)
    } catch (err) {
      const payload = err.response?.data || {}
      const msg = payload.message
      const code = payload.code
      if (code === 'WRONG_PORTAL') {
        setError(msg || wrongPortalMessage(portal, payload.existingRoles || [payload.role]))
        setSignupCta(payload.signupPath || portalSignupPath(portal))
      } else {
        setError(msg || 'Invalid email/mobile or password.')
        setSignupCta(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e?.preventDefault?.()
    setError(''); setLoading(true)
    try {
      await authApi.forgotPassword({
        email: resetEmail || (String(identifier).includes('@') ? identifier : ''),
        portal,
      })
      setInfo('If an account exists, a reset code was sent to your email.')
      setForgot('otp')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset code.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e?.preventDefault?.()
    setError(''); setLoading(true)
    try {
      await authApi.resetPassword({
        email: resetEmail || identifier,
        otp: resetOtp,
        password: newPassword,
        portal,
      })
      setInfo('Password updated. Sign in with your new password.')
      setForgot(false)
      setStep('credentials')
      clearOtpChallenge()
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed.')
    } finally {
      setLoading(false)
    }
  }

  const backToCredentials = () => {
    setStep('credentials')
    setError('')
    clearOtpChallenge()
  }

  return {
    portal,
    dashboardPath,
    identifier, setIdentifier,
    password, setPassword,
    remember, setRemember,
    otpChannel: 'email', setOtpChannel: () => {},
    error, setError,
    info, setInfo,
    loading,
    step,
    challenge: null,
    otp: '', setOtp: () => {},
    forgot, setForgot,
    resetEmail, setResetEmail,
    resetOtp, setResetOtp,
    newPassword, setNewPassword,
    handleCredentials,
    handleOtp: () => {},
    handleEmailVerify: () => {},
    handleResendEmailVerify: () => {},
    handleForgot,
    handleReset,
    backToCredentials,
    signupCta,
  }
}
