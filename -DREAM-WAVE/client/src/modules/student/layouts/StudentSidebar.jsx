import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@shared/context/AuthContext'
import { XPRing, StreakFlame } from '@shared/components/Gamification'
import { STUDENT_THEME, studentPath } from '../theme'

const NAV = [
  { path: 'dashboard',    icon: '⚡', label: 'Dashboard',     group: 'main'    },
  { path: 'daily-life',   icon: '☀️', label: 'Daily Life',    group: 'main'    },
  { path: 'personal-ai',  icon: '🧭', label: 'My Intelligence', group: 'main' },
  { path: 'command-center', icon: '⌘', label: 'AI Command', group: 'main' },
  { path: 'goals',        icon: '🎯', label: 'Goals',         group: 'learn'   },
  { path: 'roadmap',      icon: '🗺️', label: 'Roadmap',      group: 'learn'   },
  { path: 'learn',        icon: '🎓', label: 'AI Studio',     group: 'learn'   },
  { path: 'tasks',        icon: '✓',  label: 'Tasks',         group: 'learn'   },
  { path: 'planner',      icon: '📅', label: 'Study Planner', group: 'learn'   },
  { path: 'academics',    icon: '📘', label: 'Academics',     group: 'learn'   },
  { path: 'focus',        icon: '◎',  label: 'Focus Mode',    group: 'learn'   },
  { path: 'mentor',       icon: '🤖', label: 'AI Mentor',     group: 'ai'      },
  { path: 'agent',        icon: '🕹️', label: 'AI Agent',      group: 'ai'      },
  { path: 'workflows',    icon: '⚙️', label: 'Workflows',     group: 'ai'      },
  { path: 'memory',       icon: '🧠', label: 'AI Memory',     group: 'ai'      },
  { path: 'knowledge',    icon: '🕸️', label: 'My Knowledge',  group: 'ai'      },
  { path: 'intelligence', icon: '✨', label: 'AI Home',       group: 'ai'      },
  { path: 'reports',      icon: '📊', label: 'R&D Reports',   group: 'ai'      },
  { path: 'research',     icon: '🔬', label: 'Research',      group: 'ai'      },
  { path: 'analytics',    icon: '📈', label: 'Analytics',     group: 'ai'      },
  { path: 'career',       icon: '💼', label: 'Career Hub',    group: 'career'  },
  { path: 'career/resume', icon: '📄', label: 'Resume Builder', group: 'career' },
  { path: 'career/jobs',  icon: '◈',  label: 'Jobs',          group: 'career'  },
  { path: 'career/internships', icon: '◎', label: 'Internships', group: 'career' },
  { path: 'career/applications', icon: '◫', label: 'Applications', group: 'career' },
  { path: 'certificates', icon: '🏅', label: 'Certificates',  group: 'career'  },
  { path: 'books',        icon: '📚', label: 'Books',         group: 'career'  },
  { path: 'community',    icon: '💬', label: 'Community',     group: 'social'  },
  { path: 'profile',      icon: '👤', label: 'Profile',       group: 'account' },
  { path: 'settings',     icon: '⚙️', label: 'Settings',      group: 'account' },
]

const GROUPS = {
  main:    null,
  learn:   'LEARNING',
  ai:      'AI TOOLS',
  career:  'CAREER',
  social:  'SOCIAL',
  account: 'ACCOUNT',
}

export default function StudentSidebar({ mobile, onClose }) {
  const { user, logout } = useAuth()
  const t = STUDENT_THEME

  const grouped = Object.keys(GROUPS).map(g => ({
    group: g,
    label: GROUPS[g],
    items: NAV.filter(n => n.group === g),
  }))

  return (
    <motion.aside
      initial={mobile ? { x: -260 } : false}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        width: 236, minHeight: '100vh', background: t.sidebarBg,
        borderRight: `1px solid ${t.sidebarBorder}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto', flexShrink: 0,
      }}
      aria-label="Student portal navigation"
    >
      <div style={{ padding: '22px 18px 16px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: t.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', flexShrink: 0, boxShadow: `0 4px 12px ${t.glow}`,
          }}>🌊</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#3A3153', letterSpacing: '-0.01em' }}>Dream Wave</div>
            <div style={{ fontSize: '0.68rem', color: t.accentLight, fontWeight: 600 }}>Student Portal</div>
          </div>
          {mobile && (
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close navigation menu">
              ×
            </button>
          )}
        </div>
      </div>

      {user && (
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <XPRing xp={user.credits || 0} level={user.level || 1} size={44} color={t.accent} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3A3153', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '0.68rem', color: t.accentLight, marginBottom: 3, fontWeight: 600 }}>Lv {user.level || 1} · {user.credits || 0} XP</div>
              <div style={{ height: 3, background: 'rgba(140,122,230,0.15)', borderRadius: 999, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((user.credits || 0) % 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{ height: '100%', background: `linear-gradient(90deg,${t.accent},${t.accentLight})`, borderRadius: 999 }}
                />
              </div>
            </div>
            {(user.streak || 0) >= 3 && <StreakFlame streak={user.streak || 0} size={28} />}
          </div>
        </div>
      )}

      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {grouped.map(({ group, label, items }) => items.length === 0 ? null : (
          <div key={group} style={{ marginBottom: 4 }}>
            {label && (
              <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#8C7AE6', letterSpacing: '0.1em', padding: '8px 10px 4px', textTransform: 'uppercase' }}>
                {label}
              </div>
            )}
            {items.map(({ path, icon, label: itemLabel }) => (
              <NavLink
                key={path}
                to={studentPath(path)}
                onClick={onClose}
                aria-label={itemLabel}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 9, marginBottom: 1,
                  fontSize: '0.845rem', fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#3A3153' : '#5D5477',
                  background: isActive ? 'rgba(140, 122, 230, 0.15)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${t.accent}` : '3px solid transparent',
                  transition: 'all 0.15s ease', textDecoration: 'none',
                })}
              >
                <span style={{ fontSize: '0.95rem', flexShrink: 0, width: 20, textAlign: 'center' }}>{icon}</span>
                {itemLabel}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '10px 8px', borderTop: `1px solid ${t.sidebarBorder}` }}>
        <button
          onClick={logout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', color: '#5D5477', fontSize: '0.845rem', fontFamily: 'inherit', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5D5477'; e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '0.95rem', width: 20, textAlign: 'center' }}>🚪</span>
          Sign Out
        </button>
      </div>
    </motion.aside>
  )
}
