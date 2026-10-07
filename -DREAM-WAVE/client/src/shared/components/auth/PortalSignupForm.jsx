import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authApi } from '../../services/api'
import { setSelectedPortal } from '../../auth/portalSession'
import NeuralBg from '../animations/NeuralBg'

export default function PortalSignupForm({
  portal,
  portalLabel,
  icon,
  accent: _accent = '#F97316',
  accentLight: _accentLight = '#FB923C',
  loginPath,
  cssClass = '',
}) {

  const [step, setStep] = useState('account')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [registrationToken, setRegistrationToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fieldStyle = {
    padding: '13px 16px',
    borderRadius: '12px',
    border: '1.5px solid rgba(249, 115, 22, 0.35)',
    background: 'rgba(2, 6, 23, 0.65)',
    color: '#FFFFFF',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '0.95rem',
    outline: 'none',
  }

  const handleAccount = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      setSelectedPortal(portal)
      const { data } = await authApi.portalInit({ name, email, portal })
      setRegistrationToken(data.registrationToken)
      setStep('password')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start registration')
    } finally { setLoading(false) }
  }

  const complete = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError(''); setLoading(true)
    try {
      const { data } = await authApi.portalComplete({
        password, confirmPassword, organizationName, portal, registrationToken,
      })
      if (data.token) localStorage.setItem('token', data.token)
      setSelectedPortal(portal)
      setStep('done')
      window.location.href = portal === 'institution' ? '/institution/dashboard' : '/company/dashboard'
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div
      className={cssClass}
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px 16px',
        position: 'relative',
        background: 'linear-gradient(135deg, #020817 0%, #06132D 35%, #0B1E48 70%, #030B1E 100%)',
        color: '#F8FAFC',
        fontFamily: "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* Animated Neural Network Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <NeuralBg nodeCount={40} color="#38BDF8" opacity={0.35} />
      </div>

      {/* Blue Ambient Glow */}
      <div
        style={{
          position: 'fixed',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '850px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(14, 116, 233, 0.22) 0%, rgba(2, 6, 23, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '34px 28px',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, rgba(13, 25, 54, 0.92) 0%, rgba(6, 15, 36, 0.96) 100%)',
          border: '2px solid rgba(249, 115, 22, 0.55)',
          boxShadow: '0 0 45px rgba(249, 115, 22, 0.25), 0 20px 40px rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(16px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              margin: '0 auto 12px',
              display: 'grid',
              placeItems: 'center',
              fontSize: '2rem',
              background: 'rgba(249, 115, 22, 0.18)',
              border: '1px solid rgba(249, 115, 22, 0.45)',
              boxShadow: '0 0 16px rgba(249, 115, 22, 0.3)',
            }}
          >
            {icon}
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
            {portalLabel} Registration
          </h1>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Create your {portalLabel.toLowerCase()} account to access dedicated admin & collaboration tools.
          </p>
        </div>

        {step === 'account' && (
          <form onSubmit={handleAccount} style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#CBD5E1' }}>Full Name</label>
              <input
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={fieldStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#CBD5E1' }}>Official Email Address</label>
              <input
                type="email"
                placeholder="name@organization.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={fieldStyle}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#FCA5A5',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(234, 88, 12, 0.4)',
                marginTop: '4px',
              }}
            >
              {loading ? 'Continuing…' : 'Continue →'}
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={complete} style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#CBD5E1' }}>Organization / Institution Name</label>
              <input
                placeholder="Organization name"
                value={organizationName}
                onChange={e => setOrganizationName(e.target.value)}
                required
                style={fieldStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#CBD5E1' }}>Create Password</label>
              <input
                type="password"
                placeholder="At least 8 chars"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                style={fieldStyle}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#CBD5E1' }}>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                style={fieldStyle}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#FCA5A5',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(234, 88, 12, 0.4)',
                marginTop: '4px',
              }}
            >
              {loading ? 'Creating Account…' : 'Complete Registration & Enter Dashboard →'}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(249, 115, 22, 0.2)',
            textAlign: 'center',
            fontSize: '0.84rem',
            color: '#94A3B8',
          }}
        >
          <span>Already have an account? </span>
          <Link to={loginPath} style={{ color: '#FB923C', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
          <span style={{ margin: '0 8px' }}>•</span>
          <Link to="/" style={{ color: '#CBD5E1', textDecoration: 'none' }}>
            Portal Selection
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
