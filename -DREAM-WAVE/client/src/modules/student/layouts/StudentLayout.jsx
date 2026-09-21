import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import StudentSidebar from './StudentSidebar'
import useScrollReveal from '@shared/hooks/useScrollReveal'
import useNotifications from '@shared/hooks/useNotifications'
import { usePlatformData } from '@shared/context/PlatformDataContext'
import '../styles/student.css'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

export default function StudentLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const notifications = useNotifications()
  const { connection } = usePlatformData()
  useScrollReveal()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname === '/student/dashboard') return
    notifications.load({}, { force: false }).catch(() => {})
    // Shared cache prevents duplicate requests when student pages remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('student-nav-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('student-nav-open')
    }
  }, [mobileOpen])

  return (
    <div className="student-module page-layout">
      <div className="sidebar-wrapper">
        <StudentSidebar />
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="student-nav-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <div className={`student-mobile-nav ${mobileOpen ? 'is-open' : ''}`} aria-hidden={!mobileOpen}>
        <StudentSidebar mobile onClose={() => setMobileOpen(false)} />
      </div>

      <div className="student-shell">
        {connection === 'offline' && <div className="student-offline" role="status">You are offline. Saved information remains available; updates will retry after reconnection.</div>}
        <div className="mobile-topbar">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >☰</button>
          <Link className="mobile-topbar__brand" to="/student/dashboard">🌊 Dream Wave</Link>
          <div className="mobile-topbar__actions">
            <Link to="/notifications" aria-label={`Notifications${notifications.unread ? `, ${notifications.unread} unread` : ''}`}>
              <span aria-hidden="true">🔔</span>{notifications.unread > 0 && <sup>{notifications.unread > 99 ? '99+' : notifications.unread}</sup>}
            </Link>
            <Link to="/student/profile" aria-label="Student profile">👤</Link>
          </div>
        </div>

        <motion.main
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="page-content"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}
