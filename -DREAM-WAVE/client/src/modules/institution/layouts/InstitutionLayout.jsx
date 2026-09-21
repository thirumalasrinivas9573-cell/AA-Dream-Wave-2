import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import InstitutionSidebar from './InstitutionSidebar'
import '../styles/institution.css'

export default function InstitutionLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="institution-module" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="inst-sidebar-desktop" style={{ display: 'flex' }}>
        <InstitutionSidebar />
      </div>

      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 40 }}
        />
      )}

      <div
        style={{
          position: 'fixed', left: 0, top: 0, zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          height: '100%',
        }}
      >
        <InstitutionSidebar mobile onClose={() => setOpen(false)} />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          className="inst-topbar"
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--inst-border)',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <button
            type="button"
            className="inst-menu-btn"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            style={{ background: 'none', border: 'none', color: 'var(--inst-navy)', fontSize: '1.3rem', cursor: 'pointer' }}
          >
            ☰
          </button>
          <span className="inst-topbar-title" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--inst-navy)' }}>
            Institution Portal
          </span>
          <div style={{ width: 28 }} />
        </header>

        <main style={{ padding: '24px 22px 48px', maxWidth: 1240, margin: '0 auto', width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
