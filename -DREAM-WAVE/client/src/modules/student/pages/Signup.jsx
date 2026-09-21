import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import NeuralBg from '@shared/components/animations/NeuralBg'

/** Student signup — Orange box theme on deep blue background. */
export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup, applySession, goToPortal } = useAuth()
  const navigate = useNavigate()

  const fieldStyle = {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '12px',
    border: '1.5px solid rgba(249, 115, 22, 0.35)',
    background: 'rgba(2, 6, 23, 0.65)',
    color: '#FFFFFF',
    fontSize: '0.95rem',
    outline: 'none',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password needs 8+ characters with at least one letter and one number.')
      return
    }
    setError(''); setLoading(true)
    try {
      const data = await signup(name, email, password)
      const token = data.token || data.accessToken
      if (token && data.user) {
        applySession(token, data.user, email)
        goToPortal(data.user, '/student/dashboard')
        return
      }
      navigate('/student/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
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
      {/* Animated Neural Background */}
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

      <div
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
            🎓
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>
            Student Registration
          </h1>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.875rem' }}>
            Join Dream Wave AI to unlock personalized learning & career intelligence.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#CBD5E1' }}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              autoComplete="name"
              style={fieldStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#CBD5E1' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={fieldStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#CBD5E1' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Letter + number, 8+ chars"
                required
                minLength={8}
                autoComplete="new-password"
                style={{ ...fieldStyle, paddingRight: '44px' }}
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
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
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
            {loading ? 'Creating Account…' : 'Create Student Account →'}
          </button>
        </form>

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
          <Link to="/student/login" style={{ color: '#FB923C', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
          <span style={{ margin: '0 8px' }}>•</span>
          <Link to="/" style={{ color: '#CBD5E1', textDecoration: 'none' }}>
            Portal Selection
          </Link>
        </div>
      </div>
    </div>
  )
}
