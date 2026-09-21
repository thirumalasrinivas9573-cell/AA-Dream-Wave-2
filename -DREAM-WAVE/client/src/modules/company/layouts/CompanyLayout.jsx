import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import CompanySidebar from './CompanySidebar'
import '../styles/company.css'

export default function CompanyLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="company-module" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="company-sidebar-desktop" style={{ display: 'flex' }}>
        <CompanySidebar />
      </div>
      {open && <div role="presentation" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }} />}
      <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 50, transform: open ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s', height: '100%' }}>
        <CompanySidebar mobile onClose={() => setOpen(false)} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <header className="company-topbar" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(96,165,250,0.14)', background: 'rgba(11,18,32,0.92)', position: 'sticky', top: 0, zIndex: 20 }}>
          <button type="button" className="company-menu-btn" aria-label="Open navigation" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: '#93C5FD', fontSize: '1.3rem', cursor: 'pointer' }}>☰</button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Company Portal</span>
          <div style={{ width: 28 }} />
        </header>
        <main style={{ padding: '24px 20px 48px', maxWidth: 1240, margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
