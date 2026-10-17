import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@shared/context/AuthContext'
import { XPRing } from '@shared/components/Gamification'
import ThemeToggle from '@shared/components/ThemeToggle'
import { studentPath } from '../theme'

const NAV_GROUPS = [
  {
    group: 'main',
    label: null,
    items: [
      { path: 'dashboard', icon: 'space_dashboard', label: 'Dashboard' },
      { path: 'daily-life', icon: 'wb_sunny', label: 'Daily Life' },
      { path: 'personal-ai', icon: 'neurology', label: 'My Intelligence' },
      { path: 'command-center', icon: 'terminal', label: 'AI Command' },
    ],
  },
  {
    group: 'learn',
    label: 'LEARNING',
    items: [
      { path: 'goals', icon: 'flag', label: 'Goals' },
      { path: 'roadmap', icon: 'route', label: 'Roadmap' },
      { path: 'learn', icon: 'auto_fix_high', label: 'AI Studio' },
      { path: 'tasks', icon: 'checklist', label: 'Tasks' },
      { path: 'planner', icon: 'calendar_month', label: 'Study Planner' },
      { path: 'academics', icon: 'school', label: 'Academics' },
      { path: 'focus', icon: 'center_focus_strong', label: 'Focus Mode' },
    ],
  },
  {
    group: 'ai',
    label: 'AI TOOLS',
    items: [
      { path: 'mentor', icon: 'psychology', label: 'AI Mentor' },
      { path: 'agent', icon: 'smart_toy', label: 'AI Agent' },
      { path: 'workflows', icon: 'schema', label: 'Workflows' },
      { path: 'memory', icon: 'memory', label: 'AI Memory' },
      { path: 'knowledge', icon: 'hub', label: 'My Knowledge' },
      { path: 'intelligence', icon: 'home_app_logo', label: 'AI Home' },
      { path: 'reports', icon: 'analytics', label: 'R&D Reports' },
      { path: 'research', icon: 'science', label: 'Research' },
      { path: 'analytics', icon: 'query_stats', label: 'Analytics' },
    ],
  },
  {
    group: 'career',
    label: 'CAREER',
    items: [
      { path: 'career', icon: 'work', label: 'Career Hub' },
      { path: 'career/resume', icon: 'description', label: 'Resume Builder' },
      { path: 'career/jobs', icon: 'work_outline', label: 'Jobs' },
      { path: 'career/internships', icon: 'badge', label: 'Internships' },
      { path: 'career/applications', icon: 'assignment', label: 'Applications' },
      { path: 'certificates', icon: 'verified', label: 'Certificates' },
      { path: 'books', icon: 'menu_book', label: 'Books' },
    ],
  },
  {
    group: 'general',
    label: 'GENERAL',
    items: [
      { path: 'community', icon: 'groups', label: 'Community' },
      { path: 'profile', icon: 'badge', label: 'Profile' },
      { path: 'settings', icon: 'settings', label: 'Settings' },
    ],
  },
]

export default function StudentSidebar({ mobile, onClose }) {
  const { user, logout } = useAuth()

  if (mobile) {
    return (
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        exit={{ x: -300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 w-72 bg-surface border-r border-divider z-50 flex flex-col justify-between shadow-2xl overflow-y-auto"
        aria-label="Mobile navigation drawer"
      >
        <div className="flex flex-col flex-1 p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-divider">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-hover flex items-center justify-center text-white shadow-md">
                <span className="material-symbols-outlined text-[20px]">waves</span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-base text-content-heading">Dream Wave</span>
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Student Portal</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-content-muted hover:bg-surface-elevated hover:text-content-heading"
              aria-label="Close drawer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {user && (
            <div className="p-3 rounded-2xl bg-surface-elevated border border-divider flex items-center gap-3">
              <XPRing xp={user.credits || 0} level={user.level || 1} size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-content-heading truncate">{user.name}</div>
                <div className="text-[11px] font-semibold text-brand-primary">
                  Lv {user.level || 1} · {user.credits || 0} XP
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
            {NAV_GROUPS.map(({ group, label, items }) => (
              <div key={group} className="space-y-1">
                {label && (
                  <div className="text-[10px] font-bold text-content-muted uppercase tracking-wider px-2 py-1">
                    {label}
                  </div>
                )}
                {items.map(({ path, icon, label: itemLabel }) => (
                  <NavLink
                    key={path}
                    to={studentPath(path)}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center h-10 px-3 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-brand-primary text-white font-semibold shadow-md shadow-brand-primary/25'
                          : 'text-content-body hover:bg-surface-elevated hover:text-content-heading'
                      }`
                    }
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0 mr-3">{icon}</span>
                    <span className="truncate">{itemLabel}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-divider space-y-3 bg-surface">
          <ThemeToggle variant="segmented" />
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </motion.aside>
    )
  }

  return (
    <aside
      className="group/sidebar fixed left-0 top-0 h-full w-[72px] hover:w-[260px] bg-surface/90 backdrop-blur-xl border-r border-divider z-50 flex flex-col justify-between shadow-oceanic transition-all duration-300 ease-in-out overflow-hidden"
      aria-label="Student portal collapsible rail"
    >
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-hover flex items-center justify-center shrink-0 shadow-md shadow-brand-primary/25 text-white">
            <span className="material-symbols-outlined text-[22px]">waves</span>
          </div>
          <div className="flex flex-col opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
            <span className="font-heading font-bold text-base text-content-heading tracking-tight leading-none">
              Dream Wave
            </span>
            <span className="text-[10px] font-bold text-brand-primary tracking-wider mt-1 uppercase">
              Student Portal
            </span>
          </div>
        </div>

        {/* User Snapshot */}
        {user && (
          <div className="px-3 py-2 shrink-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            <div className="p-2.5 rounded-xl bg-surface-elevated border border-divider flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.name?.charAt(0) || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-content-heading truncate">{user.name}</span>
                  <span className="text-[10px] font-bold text-brand-primary">Lv {user.level || 1}</span>
                </div>
                <div className="w-full bg-canvas h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-brand-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((user.credits || 0) % 1000) / 10)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="flex-1 px-2.5 py-2 space-y-4">
          {NAV_GROUPS.map(({ group, label, items }) => (
            <div key={group} className="space-y-1">
              {label && (
                <div className="px-2.5 py-1">
                  <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider block opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">
                    {label}
                  </span>
                </div>
              )}
              {items.map(({ path, icon, label: itemLabel }) => (
                <NavLink
                  key={path}
                  to={studentPath(path)}
                  className={({ isActive }) =>
                    `flex items-center h-10 px-2.5 rounded-xl transition-all group/item ${
                      isActive
                        ? 'bg-brand-primary text-white font-semibold shadow-md shadow-brand-primary/25'
                        : 'text-content-body hover:bg-surface-elevated hover:text-content-heading'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0">{icon}</span>
                  <span className="ml-3 font-medium text-[13px] opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">
                    {itemLabel}
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Rail Footer */}
      <div className="p-2.5 bg-surface border-t border-divider shrink-0 space-y-2">
        <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
          <ThemeToggle variant="segmented" />
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center h-10 px-2.5 rounded-xl text-content-muted hover:bg-rose-500/10 hover:text-rose-500 transition-all"
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
          <span className="ml-3 font-medium text-[13px] opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  )
}
