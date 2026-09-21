import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { COMPANY_THEME, companyPath } from '../theme'

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
    label: 'Hiring',
    items: [
      { to: 'jobs', label: 'Jobs' },
      { to: 'internships', label: 'Internships' },
      { to: 'applications', label: 'Applications' },
      { to: 'candidates', label: 'Candidates' },
      { to: 'interviews', label: 'Interviews' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: 'departments', label: 'Departments' },
      { to: 'employees', label: 'Employees' },
      { to: 'projects', label: 'Projects' },
      { to: 'training', label: 'Training' },
    ],
  },
  {
    label: 'Brand',
    items: [
      { to: 'announcements', label: 'Announcements' },
      { to: 'events', label: 'Events' },
      { to: 'gallery', label: 'Gallery' },
      { to: 'videos', label: 'Videos' },
      { to: 'followers', label: 'Followers' },
      { to: 'profile', label: 'Company Profile' },
      { to: 'settings', label: 'Settings' },
    ],
  },
]

export default function CompanySidebar({ mobile, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const t = COMPANY_THEME

  return (
    <aside
      style={{
        width: 248, flexShrink: 0, background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}`,
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        ...(mobile ? { height: '100vh' } : {}),
      }}
      aria-label="Company navigation"
    >
      <div style={{ padding: '18px 16px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
        <div style={{ fontWeight: 800, color: '#F8FAFC' }}>Dream Wave</div>
        <div style={{ fontSize: '0.72rem', color: t.accentLight, marginTop: 2 }}>Company Portal</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: 8 }}>{user?.organizationName || user?.name}</div>
      </div>
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.85)', padding: '12px 12px 4px' }}>{g.label}</div>
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={companyPath(item.to)}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'block', padding: '9px 12px', borderRadius: 10, marginBottom: 2, textDecoration: 'none',
                  fontSize: '0.84rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'rgba(226,232,240,0.72)',
                  background: isActive ? 'rgba(37,99,235,0.28)' : 'transparent',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ padding: 14, borderTop: `1px solid ${t.sidebarBorder}` }}>
        <button type="button" className="company-btn company-btn-secondary" style={{ width: '100%' }} onClick={async () => { await logout(); navigate('/company/login') }}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
