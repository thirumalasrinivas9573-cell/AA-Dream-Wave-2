import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { institutionPath } from '../theme'

const GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: 'dashboard', label: 'Dashboard' },
      { to: 'analytics', label: 'Analytics' },
      { to: 'reports', label: 'Reports' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { to: 'students', label: 'Students' },
      { to: 'faculty', label: 'Faculty' },
      { to: 'departments', label: 'Departments' },
      { to: 'courses', label: 'Courses' },
    ],
  },
  {
    label: 'Campus',
    items: [
      { to: 'admissions', label: 'Admissions' },
      { to: 'placements', label: 'Placements' },
      { to: 'scholarships', label: 'Scholarships' },
      { to: 'research', label: 'Research' },
    ],
  },
  {
    label: 'Publish',
    items: [
      { to: 'events', label: 'Events' },
      { to: 'news', label: 'News' },
      { to: 'announcements', label: 'Announcements' },
      { to: 'promotions', label: 'Promotions' },
      { to: 'gallery', label: 'Gallery' },
      { to: 'videos', label: 'Videos' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: 'profile', label: 'Profile' },
      { to: 'settings', label: 'Settings' },
    ],
  },
]

export default function InstitutionSidebar({ mobile, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/institution/login')
  }

  return (
    <aside
      className="inst-sidebar"
      style={mobile ? { height: '100vh', overflowY: 'auto' } : { position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}
      aria-label="Institution navigation"
    >
      <div style={{ padding: '6px 10px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Dream Wave</div>
        <div style={{ fontSize: '0.72rem', color: '#93C5FD', marginTop: 2 }}>Institution Portal</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 8, lineHeight: 1.35 }}>
          {user?.organizationName || user?.name || 'Campus admin'}
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div className="inst-nav-group">{g.label}</div>
            {g.items.map((n) => (
              <NavLink
                key={n.to}
                to={institutionPath(n.to)}
                className={({ isActive }) => `inst-nav-link${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button type="button" className="inst-btn" onClick={handleLogout} style={{ marginTop: 12, width: '100%', color: '#E2E8F0', borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}>
        Sign Out
      </button>
    </aside>
  )
}
