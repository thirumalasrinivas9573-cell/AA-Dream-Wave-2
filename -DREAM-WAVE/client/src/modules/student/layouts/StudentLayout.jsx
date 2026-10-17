import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import StudentSidebar from './StudentSidebar'
import ThemeToggle from '@shared/components/ThemeToggle'
import useScrollReveal from '@shared/hooks/useScrollReveal'
import useNotifications from '@shared/hooks/useNotifications'
import { useAuth } from '@shared/context/AuthContext'
import { usePlatformData } from '@shared/context/PlatformDataContext'
import '../styles/student.css'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

export default function StudentLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const notifications = useNotifications()
  const { connection } = usePlatformData()
  useScrollReveal()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname === '/student/dashboard') return
    notifications.load({}, { force: false }).catch(() => {})
  }, [location.pathname, notifications])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('global-search-input')
        if (searchInput) searchInput.focus()
      }
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const mobileNavItems = [
    { path: '/student/dashboard', icon: 'space_dashboard', label: 'Dashboard' },
    { path: '/student/learn', icon: 'auto_fix_high', label: 'AI Studio' },
    { path: '/student/mentor', icon: 'psychology', label: 'AI Mentor' },
    { path: '/student/tasks', icon: 'checklist', label: 'Tasks' },
  ]

  return (
    <div className="relative min-h-screen bg-canvas text-content-body selection:bg-brand-primary/20 selection:text-brand-primary font-body overflow-x-hidden">
      {/* Ambient Theme Background Orbs */}
      <div className="fixed -right-24 -top-24 w-96 h-96 rounded-full bg-brand-primary/10 blur-3xl pointer-events-none z-0" />
      <div className="fixed left-1/3 -bottom-24 w-80 h-80 rounded-full bg-brand-secondary/10 blur-3xl pointer-events-none z-0" />

      {/* Desktop Collapsible Left Icon Rail */}
      <div className="hidden md:block">
        <StudentSidebar />
      </div>

      {/* Mobile Backdrop & Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 md:hidden"
              aria-hidden="true"
            />
            <StudentSidebar mobile onClose={() => setMobileOpen(false)} />
          </>
        )}
      </AnimatePresence>

      {/* Fixed Top Workspace Header (64px) */}
      <header className="fixed top-0 left-0 md:left-[72px] right-0 h-16 bg-surface/85 backdrop-blur-xl border-b border-divider z-40 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl text-content-body hover:bg-surface-elevated hover:text-content-heading transition-colors"
            aria-label="Open navigation drawer"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <span className="material-symbols-outlined text-[18px] text-content-muted absolute left-3.5 pointer-events-none">
              search
            </span>
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspace..."
              className="w-full h-10 pl-10 pr-12 rounded-xl bg-surface border border-divider text-content-heading placeholder:text-content-muted focus:outline-none focus:border-brand-primary transition-all font-medium text-xs md:text-sm shadow-xs"
            />
            <kbd className="hidden sm:inline-flex absolute right-3 px-1.5 py-0.5 rounded bg-surface-elevated border border-divider text-[10px] font-semibold text-content-muted uppercase">
              ⌘K
            </kbd>
          </form>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 md:gap-4 ml-4 shrink-0">
          {/* XP & Level Status Pill */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              <span>Lv {user.level || 1} · {user.credits || 0} XP</span>
            </div>
          )}

          {/* Notifications Bell */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-xl border border-divider text-content-body hover:bg-surface-elevated hover:text-content-heading transition-all"
            aria-label={`Notifications${notifications.unread ? `, ${notifications.unread} unread` : ''}`}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {notifications.unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-surface" />
            )}
          </Link>

          {/* Stitch Multi-Theme Switcher */}
          <ThemeToggle variant="dropdown" />

          {/* Profile Avatar & Menu */}
          <Link
            to="/student/profile"
            className="relative flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-brand-primary/40 transition-all"
            aria-label="Student profile"
          >
            <div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="pl-0 md:pl-[72px] pt-16 pb-20 md:pb-8 min-h-screen flex flex-col transition-all duration-300">
        {connection === 'offline' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-4 py-2 text-center font-medium" role="status">
            You are offline. Saved information remains available; updates will retry after reconnection.
          </div>
        )}

        <motion.main
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6"
        >
          {children}
        </motion.main>
      </div>

      {/* Mobile Floating Bottom Bar (<768px) */}
      <nav
        className="md:hidden fixed bottom-3 left-3 right-3 h-14 bg-surface/95 backdrop-blur-xl border border-divider rounded-2xl z-40 flex items-center justify-around px-2 shadow-xl pb-safe"
        aria-label="Mobile bottom navigation"
      >
        {mobileNavItems.map(({ path, icon, label }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-brand-primary font-bold' : 'text-content-muted hover:text-content-heading'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{icon}</span>
              <span className="text-[10px] tracking-tight">{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-content-muted hover:text-content-heading transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </nav>
    </div>
  )
}
