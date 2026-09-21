import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Futuristic3DBg from '@shared/components/animations/Futuristic3DBg'
import OtpInput from '@shared/components/auth/OtpInput'
import usePortalAuth from '@shared/auth/usePortalAuth'
import { setSelectedPortal, getSelectedPortal } from '@shared/auth/portalSession'

const PORTAL_OPTIONS = [
  {
    id: 'student',
    label: 'Student',
    fullLabel: 'Student Portal',
    badge: 'Learner & Talent',
    icon: '🎓',
    tagline: 'Adaptive AI Learning, Career Roadmaps & Mentorship',
    accent: '#8B5CF6',
    accentLight: '#C084FC',
    signup: '/student/signup',
  },
  {
    id: 'institution',
    label: 'College',
    fullLabel: 'College / Institution',
    badge: 'Campus & Faculty',
    icon: '🏛️',
    tagline: 'Campus Administration, Placements & Student Analytics',
    accent: '#38BDF8',
    accentLight: '#7DD3FC',
    signup: '/institution/signup',
  },
  {
    id: 'company',
    label: 'Company',
    fullLabel: 'Company & Recruiter',
    badge: 'Employer & Hiring',
    icon: '🏢',
    tagline: 'Verified Talent Sourcing, Jobs & Automated Screening',
    accent: '#F97316',
    accentLight: '#FB923C',
    signup: '/company/signup',
  },
]

export default function Landing() {
  const initialPortal = getSelectedPortal('student') || 'student'
  const [activePortal, setActivePortal] = useState(initialPortal)
  const [showPassword, setShowPassword] = useState(false)
  const [isHoveredBtn, setIsHoveredBtn] = useState(false)

  // Portal auth hook directly wired to existing login & session mechanisms
  const auth = usePortalAuth(activePortal)

  const currentPortal = PORTAL_OPTIONS.find((p) => p.id === activePortal) || PORTAL_OPTIONS[0]

  const handlePortalSwitch = (portalId) => {
    setActivePortal(portalId)
    setSelectedPortal(portalId)
    auth.setError('')
    auth.setInfo('')
  }

  return (
    <div
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
      {/* ══ 3D INTERACTIVE CANVAS BACKGROUND ══════════════════════════════ */}
      <Futuristic3DBg
        particleCount={75}
        accentColor="#8B5CF6"
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

      {/* ══ FULL-SCREEN SPLIT CONTAINER ══════════════════════════════════ */}
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
        {/* ── LEFT SIDE: BRANDING & 3D HOLOGRAPHIC ENVIRONMENT ────────── */}
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
          {/* Cyber Pulse Tag */}
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
                color: '#C084FC',
              }}
            >
              Dream Wave AI • Neural Platform
            </span>
          </div>

          {/* Headline with animated gradient shimmer */}
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
              textShadow: '0 0 40px rgba(139, 92, 246, 0.2)',
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
            An intelligent ecosystem uniting students, academic institutions, and industry recruiters with predictive career intelligence and verified skill graphs.
          </p>

          {/* Interactive Feature Chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {[
              { icon: '⚡', title: 'Adaptive AI Mentor & Roadmaps', desc: 'Personalized intelligence tailored to your career trajectory' },
              { icon: '🛡️', title: 'Verified Skill Credentials', desc: 'Tamper-proof academic & industry proof of competency' },
              { icon: '🌐', title: 'Unified Placement Marketplace', desc: 'Direct corporate sourcing & automated candidate screening' },
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
                    background: 'rgba(139, 92, 246, 0.18)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
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

          {/* Live Platform Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem', color: '#94A3B8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              AI Core Online
            </span>
            <span>•</span>
            <span>256-Bit Encrypted Sessions</span>
            <span>•</span>
            <span>v1.0.0</span>
          </div>
        </motion.div>

        {/* ── RIGHT SIDE: ULTRA-PREMIUM GLASS LOGIN CARD ─────────────── */}
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
          {/* Card Outer Glow Border */}
          <div
            style={{
              position: 'absolute',
              inset: '-1px',
              borderRadius: '26px',
              background: `linear-gradient(135deg, ${currentPortal.accent}88, rgba(255,255,255,0.1), ${currentPortal.accent}44)`,
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
              boxShadow: `0 24px 60px rgba(0, 0, 0, 0.75), 0 0 35px ${currentPortal.accent}22`,
            }}
          >
            {/* ── PORTAL SWITCHER PILL TABS ────────────────────────────── */}
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
              {PORTAL_OPTIONS.map((portal) => {
                const isSelected = activePortal === portal.id
                return (
                  <button
                    key={portal.id}
                    type="button"
                    onClick={() => handlePortalSwitch(portal.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isSelected
                        ? `linear-gradient(135deg, ${portal.accent} 0%, ${portal.accent}CC 100%)`
                        : 'transparent',
                      color: isSelected ? '#FFFFFF' : '#94A3B8',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected ? `0 4px 14px ${portal.accent}44` : 'none',
                    }}
                  >
                    <span>{portal.icon}</span>
                    <span>{portal.label}</span>
                  </button>
                )
              })}
            </div>

            {/* ── CARD HEADER ──────────────────────────────────────────── */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {auth.forgot ? 'Reset Password' : 'Welcome Back'}
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: currentPortal.accentLight,
                    background: `${currentPortal.accent}22`,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${currentPortal.accent}44`,
                  }}
                >
                  {currentPortal.badge}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#94A3B8', lineHeight: 1.45 }}>
                {auth.forgot
                  ? 'Enter your registered email to receive a password reset token.'
                  : `Sign in to access the ${currentPortal.fullLabel}.`}
              </p>
            </div>

            {/* ── FORGOT PASSWORD FLOW ─────────────────────────────────── */}
            {auth.forgot === 'otp' ? (
              <form onSubmit={auth.handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {auth.info && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#BAE6FD',
                      fontSize: '0.84rem',
                    }}
                  >
                    {auth.info}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>6-Digit Verification Code</label>
                  <OtpInput value={auth.resetOtp} onChange={auth.setResetOtp} accent={currentPortal.accent} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>New Password</label>
                  <input
                    type="password"
                    value={auth.newPassword}
                    onChange={(e) => auth.setNewPassword(e.target.value)}
                    placeholder="Min 8 chars (letters & numbers)"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(2, 6, 23, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#FFFFFF',
                      fontSize: '0.94rem',
                      outline: 'none',
                    }}
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
                    background: `linear-gradient(135deg, ${currentPortal.accent} 0%, #6D28D9 100%)`,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    cursor: auth.loading ? 'not-allowed' : 'pointer',
                    boxShadow: `0 4px 18px ${currentPortal.accent}55`,
                  }}
                >
                  {auth.loading ? 'Updating…' : 'Set New Password'}
                </button>
                <button
                  type="button"
                  onClick={() => auth.setForgot(false)}
                  style={{ background: 'none', border: 'none', color: currentPortal.accentLight, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ← Back to Sign In
                </button>
              </form>
            ) : auth.forgot ? (
              <form onSubmit={auth.handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Registered Email</label>
                  <input
                    type="email"
                    value={auth.resetEmail || (String(auth.identifier).includes('@') ? auth.identifier : '')}
                    onChange={(e) => auth.setResetEmail(e.target.value)}
                    placeholder="you@domain.com"
                    required
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(2, 6, 23, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#FFFFFF',
                      fontSize: '0.94rem',
                      outline: 'none',
                    }}
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
                    background: `linear-gradient(135deg, ${currentPortal.accent} 0%, #6D28D9 100%)`,
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    cursor: auth.loading ? 'not-allowed' : 'pointer',
                    boxShadow: `0 4px 18px ${currentPortal.accent}55`,
                  }}
                >
                  {auth.loading ? 'Sending Code…' : 'Send Reset Code'}
                </button>
                <button
                  type="button"
                  onClick={() => auth.setForgot(false)}
                  style={{ background: 'none', border: 'none', color: currentPortal.accentLight, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              /* ── STANDARD AUTHENTICATION FORM ────────────────────────── */
              <form onSubmit={auth.handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email / AA ID / Mobile Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Email, Mobile or AA ID</span>
                    <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Direct Auth</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748B',
                        fontSize: '1rem',
                        pointerEvents: 'none',
                      }}
                    >
                      👤
                    </span>
                    <input
                      type="text"
                      value={auth.identifier}
                      onChange={(e) => auth.setIdentifier(e.target.value)}
                      placeholder="name@domain.com, +91… or AA ID"
                      required
                      autoComplete="username"
                      style={{
                        width: '100%',
                        padding: '13px 14px 13px 40px',
                        borderRadius: '12px',
                        background: 'rgba(2, 6, 23, 0.7)',
                        border: '1.5px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: '0.94rem',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = currentPortal.accent
                        e.target.style.boxShadow = `0 0 16px ${currentPortal.accent}44`
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Password</label>
                    <button
                      type="button"
                      onClick={() => auth.setForgot(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: currentPortal.accentLight,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748B',
                        fontSize: '1rem',
                        pointerEvents: 'none',
                      }}
                    >
                      🔒
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={auth.password}
                      onChange={(e) => auth.setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                      style={{
                        width: '100%',
                        padding: '13px 44px 13px 40px',
                        borderRadius: '12px',
                        background: 'rgba(2, 6, 23, 0.7)',
                        border: '1.5px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: '0.94rem',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = currentPortal.accent
                        e.target.style.boxShadow = `0 0 16px ${currentPortal.accent}44`
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
                        padding: '4px',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.82rem',
                      color: '#94A3B8',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={auth.remember}
                      onChange={(e) => auth.setRemember(e.target.checked)}
                      style={{
                        accentColor: currentPortal.accent,
                        width: '15px',
                        height: '15px',
                        cursor: 'pointer',
                      }}
                    />
                    <span>Remember this session</span>
                  </label>

                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    OAuth & JWT Protected
                  </span>
                </div>

                {/* Error Banner */}
                {auth.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
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
                        <Link
                          to={auth.signupCta}
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                          }}
                        >
                          Register for {currentPortal.label} Portal →
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── CINEMATIC ANIMATED LOGIN BUTTON ─────────────────────── */}
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
                    background: `linear-gradient(135deg, ${currentPortal.accent} 0%, #4338CA 100%)`,
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    cursor: auth.loading ? 'not-allowed' : 'pointer',
                    boxShadow: isHoveredBtn
                      ? `0 8px 30px ${currentPortal.accent}77, 0 0 15px ${currentPortal.accent}44`
                      : `0 4px 20px ${currentPortal.accent}44`,
                    transition: 'box-shadow 0.25s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '6px',
                  }}
                >
                  {/* Subtle moving light reflection */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: isHoveredBtn ? '120%' : '-120%',
                      width: '60px',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                      transform: 'skewX(-20deg)',
                      transition: 'left 0.75s ease',
                    }}
                  />

                  {auth.loading ? (
                    <>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#FFFFFF',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      <span>Authenticating…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to {currentPortal.label}</span>
                      <span style={{ fontSize: '1.15rem' }}>→</span>
                    </>
                  )}
                </motion.button>
              </form>
            )}

            {/* ── CARD FOOTER / SIGNUP LINK ───────────────────────────── */}
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
              <span>Don't have an account? </span>
              <Link
                to={currentPortal.signup}
                style={{
                  color: currentPortal.accentLight,
                  fontWeight: 700,
                  textDecoration: 'none',
                  marginLeft: '4px',
                }}
              >
                Sign up as {currentPortal.label} →
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Spin animation for button */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
