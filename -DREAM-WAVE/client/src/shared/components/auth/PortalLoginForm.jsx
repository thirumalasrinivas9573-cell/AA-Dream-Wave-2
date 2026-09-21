import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import OtpInput from './OtpInput'
import usePortalAuth from '../../auth/usePortalAuth'
import Futuristic3DBg from '../animations/Futuristic3DBg'
import { setSelectedPortal } from '../../auth/portalSession'

const PORTAL_TABS = [
  { id: 'student', label: 'Student', icon: '🎓', path: '/student/login', accent: '#8B5CF6' },
  { id: 'institution', label: 'College / Institution', icon: '🏛️', path: '/institution/login', accent: '#38BDF8' },
  { id: 'company', label: 'Company', icon: '🏢', path: '/company/login', accent: '#F97316' },
]

export default function PortalLoginForm({
  portal,
  portalLabel,
  icon,
  accent = '#8B5CF6',
  accentLight = '#C084FC',
  signupPath,
  cssClass = '',
}) {
  const auth = usePortalAuth(portal)
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isHoveredBtn, setIsHoveredBtn] = useState(false)

  const fieldStyle = {
    width: '100%',
    padding: '13px 14px 13px 40px',
    borderRadius: '12px',
    background: 'rgba(2, 6, 23, 0.7)',
    border: '1.5px solid rgba(255, 255, 255, 0.12)',
    color: '#FFFFFF',
    fontSize: '0.94rem',
    outline: 'none',
    transition: 'all 0.2s ease',
  }

  return (
    <div
      className={cssClass}
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: '#030712',
        color: '#F8FAFC',
        fontFamily: "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* 3D Interactive Background */}
      <Futuristic3DBg
        particleCount={70}
        accentColor={accent}
        cyanColor="#38BDF8"
        speed={0.65}
      />

      {/* Cyber Grid Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(139, 92, 246, 0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(139, 92, 246, 0.04) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Split Screen Container */}
      <main
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '1240px',
          minHeight: '82vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          alignItems: 'center',
          gap: '40px',
          padding: '16px 8px',
        }}
      >
        {/* Left Side: Branding & 3D Holographic environment */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '20px 12px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              backdropFilter: 'blur(10px)',
              width: 'fit-content',
              marginBottom: '20px',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.25)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#38BDF8',
                boxShadow: '0 0 10px #38BDF8',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: accentLight,
              }}
            >
              Dream Wave AI • {portalLabel}
            </span>
          </div>

          <h1
            style={{
              margin: '0 0 16px',
              fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 40%, #A855F7 75%, #38BDF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Shape Your Future.
          </h1>

          <p
            style={{
              margin: '0 0 28px',
              fontSize: 'clamp(1rem, 1.6vw, 1.18rem)',
              color: 'rgba(203, 213, 225, 0.85)',
              lineHeight: 1.65,
              maxWidth: '520px',
            }}
          >
            Access your dedicated {portalLabel.toLowerCase()} dashboard with predictive intelligence, real-time analytics, and verified network collaboration.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {[
              { icon: '⚡', title: 'Real-Time Neural Intelligence', desc: 'Predictive analytics & workflows built for performance' },
              { icon: '🛡️', title: 'Enterprise-Grade Security', desc: 'JWT & OAuth-secured credential isolation' },
              { icon: '🌐', title: 'Integrated Ecosystem', desc: 'Unified interface connecting academia and top recruiters' },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 * idx + 0.3 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  maxWidth: '480px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    display: 'grid',
                    placeItems: 'center',
                    background: `${accent}22`,
                    border: `1px solid ${accent}44`,
                    fontSize: '1.2rem',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#F8FAFC' }}>{item.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: Ultra-Premium Glass Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '470px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '-1px',
              borderRadius: '26px',
              background: `linear-gradient(135deg, ${accent}88, rgba(255,255,255,0.1), ${accent}44)`,
              filter: 'blur(1px)',
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '36px 30px',
              borderRadius: '25px',
              background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.85) 0%, rgba(3, 7, 18, 0.94) 100%)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: `0 24px 60px rgba(0, 0, 0, 0.75), 0 0 35px ${accent}22`,
            }}
          >
            {/* Portal Switcher Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(2, 6, 23, 0.7)',
                padding: '4px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '26px',
                gap: '4px',
              }}
            >
              {PORTAL_TABS.map((tab) => {
                const isCurrent = tab.id === portal
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedPortal(tab.id)
                      navigate(tab.path)
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isCurrent
                        ? `linear-gradient(135deg, ${tab.accent} 0%, ${tab.accent}CC 100%)`
                        : 'transparent',
                      color: isCurrent ? '#FFFFFF' : '#94A3B8',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isCurrent ? `0 4px 14px ${tab.accent}44` : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Card Header */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {auth.forgot ? 'Reset Password' : 'Sign In'}
                </h2>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '1.3rem',
                    background: `${accent}22`,
                    border: `1px solid ${accent}44`,
                  }}
                >
                  {icon}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#94A3B8' }}>
                {auth.forgot ? 'Enter your registered email for reset code' : `Sign in to access ${portalLabel}`}
              </p>
            </div>

            {/* Forgot Password OTP flow */}
            {auth.forgot === 'otp' ? (
              <form onSubmit={auth.handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {auth.info && (
                  <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#BAE6FD', fontSize: '0.84rem' }}>
                    {auth.info}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Verification Code</label>
                  <OtpInput value={auth.resetOtp} onChange={auth.setResetOtp} accent={accent} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>New Password</label>
                  <input
                    type="password"
                    placeholder="New password (8+ chars)"
                    value={auth.newPassword}
                    onChange={(e) => auth.setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{ ...fieldStyle, paddingLeft: '14px' }}
                  />
                </div>
                {auth.error && (
                  <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#FCA5A5', fontSize: '0.84rem' }}>
                    {auth.error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={auth.loading}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${accent} 0%, #6D28D9 100%)`,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    cursor: auth.loading ? 'not-allowed' : 'pointer',
                    boxShadow: `0 4px 18px ${accent}55`,
                  }}
                >
                  {auth.loading ? 'Updating…' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => auth.setForgot(false)}
                  style={{ background: 'none', border: 'none', color: accentLight, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ← Back to login
                </button>
              </form>
            ) : auth.forgot ? (
              <form onSubmit={auth.handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Account Email</label>
                  <input
                    type="email"
                    placeholder="name@organization.com"
                    value={auth.resetEmail || (String(auth.identifier).includes('@') ? auth.identifier : '')}
                    onChange={(e) => auth.setResetEmail(e.target.value)}
                    required
                    style={{ ...fieldStyle, paddingLeft: '14px' }}
                  />
                </div>
                {auth.error && (
                  <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#FCA5A5', fontSize: '0.84rem' }}>
                    {auth.error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={auth.loading}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${accent} 0%, #6D28D9 100%)`,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    cursor: auth.loading ? 'not-allowed' : 'pointer',
                    boxShadow: `0 4px 18px ${accent}55`,
                  }}
                >
                  {auth.loading ? 'Sending…' : 'Send Reset Code'}
                </button>
                <button
                  type="button"
                  onClick={() => auth.setForgot(false)}
                  style={{ background: 'none', border: 'none', color: accentLight, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ← Back to login
                </button>
              </form>
            ) : (
              /* Standard Credentials Form */
              <form onSubmit={auth.handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Email, Mobile or AA ID</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '1rem', pointerEvents: 'none' }}>
                      👤
                    </span>
                    <input
                      type="text"
                      placeholder="name@domain.com, +91… or AA ID"
                      value={auth.identifier}
                      onChange={(e) => auth.setIdentifier(e.target.value)}
                      required
                      autoComplete="username"
                      style={fieldStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = accent
                        e.target.style.boxShadow = `0 0 16px ${accent}44`
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Password</label>
                    <button
                      type="button"
                      onClick={() => auth.setForgot(true)}
                      style={{ background: 'none', border: 'none', color: accentLight, cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontSize: '1rem', pointerEvents: 'none' }}>
                      🔒
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={auth.password}
                      onChange={(e) => auth.setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{ ...fieldStyle, paddingRight: '44px' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = accent
                        e.target.style.boxShadow = `0 0 16px ${accent}44`
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#94A3B8', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={auth.remember}
                      onChange={(e) => auth.setRemember(e.target.checked)}
                      style={{ accentColor: accent, width: '15px', height: '15px', cursor: 'pointer' }}
                    />
                    Remember this session
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>Encrypted 256-bit</span>
                </div>

                {auth.error && (
                  <div
                    style={{
                      padding: '11px 13px',
                      borderRadius: '11px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#FCA5A5',
                      fontSize: '0.84rem',
                      lineHeight: 1.4,
                    }}
                  >
                    <div>{auth.error}</div>
                    {auth.signupCta && (
                      <div style={{ marginTop: '6px' }}>
                        <Link to={auth.signupCta} style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.78rem' }}>
                          Register for {portalLabel} →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={auth.loading}
                  onHoverStart={() => setIsHoveredBtn(true)}
                  onHoverEnd={() => setIsHoveredBtn(false)}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '14px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${accent} 0%, #4338CA 100%)`,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: auth.loading ? 'not-allowed' : 'pointer',
                    boxShadow: isHoveredBtn
                      ? `0 8px 30px ${accent}77, 0 0 15px ${accent}44`
                      : `0 4px 20px ${accent}44`,
                    transition: 'box-shadow 0.25s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '6px',
                  }}
                >
                  {auth.loading ? 'Signing In…' : `Sign In to ${portalLabel} →`}
                </motion.button>
              </form>
            )}

            <div
              style={{
                marginTop: '22px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'center',
                fontSize: '0.84rem',
                color: '#94A3B8',
              }}
            >
              {signupPath && (
                <div style={{ marginBottom: '8px' }}>
                  <span>Need an account? </span>
                  <Link to={signupPath} style={{ color: accentLight, fontWeight: 700, textDecoration: 'none' }}>
                    Sign up
                  </Link>
                </div>
              )}
              <Link to="/" style={{ color: '#CBD5E1', textDecoration: 'none' }}>
                ← View All Portals
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
