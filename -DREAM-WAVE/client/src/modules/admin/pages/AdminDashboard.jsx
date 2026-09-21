import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, libraryApi } from '@shared/services/api'

const TABS = [
  'Overview', 'Analytics', 'Approvals', 'Users', 'Institutions', 'Companies',
  'Books', 'Jobs', 'Internships', 'Courses', 'Events', 'Scholarships',
  'Reviews', 'Reports', 'Security', 'Notifications',
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [data, setData] = useState({})
  const [msg, setMsg] = useState('')
  const [bookForm, setBookForm] = useState({ title: '', author: '', pdfUrl: '', category: 'General' })
  const [broadcast, setBroadcast] = useState({ title: '', body: '', link: '', role: 'student' })
  const [userQ, setUserQ] = useState('')
  const [userRole, setUserRole] = useState('')
  const [userStatus, setUserStatus] = useState('')

  const loadOverview = useCallback(async () => {
    const ov = await adminApi.overview()
    setStats(ov.data.stats)
  }, [])

  const loadTab = useCallback(async (name) => {
    setMsg('')
    try {
      if (name === 'Overview') await loadOverview()
      if (name === 'Analytics') {
        const r = await adminApi.analytics()
        setAnalytics(r.data.analytics)
      }
      if (name === 'Approvals') {
        const [inst, comp, prom, rev] = await Promise.all([
          adminApi.institutions({ status: 'pending' }),
          adminApi.companies({ status: 'pending' }),
          adminApi.promotions({ status: 'pending' }),
          adminApi.reviews({ status: 'pending' }),
        ])
        setData({
          institutions: inst.data.items || [],
          companies: comp.data.items || [],
          promotions: prom.data.items || [],
          reviews: rev.data.items || [],
        })
      }
      if (name === 'Users') {
        const r = await adminApi.users({
          q: userQ || undefined,
          role: userRole || undefined,
          accountStatus: userStatus || undefined,
        })
        setData({ users: r.data.items || [] })
      }
      if (name === 'Institutions') {
        const r = await adminApi.institutions({})
        setData({ institutions: r.data.items || [] })
      }
      if (name === 'Companies') {
        const r = await adminApi.companies({})
        setData({ companies: r.data.items || [] })
      }
      if (name === 'Books') {
        const r = await adminApi.books()
        setData({ books: r.data.items || [] })
      }
      if (name === 'Jobs') {
        const r = await adminApi.jobs()
        setData({ jobs: r.data.items || [] })
      }
      if (name === 'Internships') {
        const r = await adminApi.internships()
        setData({ internships: r.data.items || [] })
      }
      if (name === 'Courses') {
        const r = await adminApi.courses()
        setData({ courses: r.data.items || [] })
      }
      if (name === 'Events') {
        const r = await adminApi.events()
        setData({ events: r.data.items || [] })
      }
      if (name === 'Scholarships') {
        const r = await adminApi.scholarships()
        setData({ scholarships: r.data.items || [] })
      }
      if (name === 'Reviews') {
        const r = await adminApi.reviews({})
        setData({ reviews: r.data.items || [] })
      }
      if (name === 'Reports') {
        const r = await adminApi.reports({ status: 'open' })
        setData({ reports: r.data.items || [] })
      }
      if (name === 'Security') {
        const r = await adminApi.logs()
        setData({ logs: r.data.items || [] })
      }
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to load')
    }
  }, [loadOverview, userQ, userRole, userStatus])

  useEffect(() => { loadTab(tab) }, [tab, loadTab])

  const refresh = () => loadTab(tab)

  const addBook = async (e) => {
    e.preventDefault()
    await libraryApi.createBook({ ...bookForm, license: { type: 'licensed', allowDownload: false } })
    setBookForm({ title: '', author: '', pdfUrl: '', category: 'General' })
    setMsg('Book added')
    refresh()
  }

  const sendBroadcast = async (e) => {
    e.preventDefault()
    const { data: res } = await adminApi.broadcast(broadcast)
    setMsg(`Broadcast sent to ${res.sent} users`)
    setBroadcast({ title: '', body: '', link: '', role: 'student' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1220', color: '#E5E7EB' }}>
      <header style={{ borderBottom: '1px solid #1F2937', padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link to="/" style={{ color: '#9CA3AF' }}>← Home</Link>
        <strong style={{ flex: 1 }}>Admin Console</strong>
        <Link to="/discover" style={{ color: '#38BDF8', fontSize: '0.85rem' }}>Discovery</Link>
        <Link to="/notifications" style={{ color: '#38BDF8', fontSize: '0.85rem' }}>Notifications</Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 56px)' }} className="admin-layout">
        <nav style={{ borderRight: '1px solid #1F2937', padding: 12, background: '#111827' }} aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 4,
                borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 500,
                background: tab === t ? 'rgba(56,189,248,0.15)' : 'transparent',
                color: tab === t ? '#E0F2FE' : '#9CA3AF',
              }}
            >
              {t}
            </button>
          ))}
        </nav>

        <main style={{ padding: 20, maxWidth: 1100 }}>
          {msg && <p role="status" style={{ color: '#38BDF8' }}>{msg}</p>}

          {tab === 'Overview' && stats && (
            <>
              <h1 style={{ marginTop: 0 }}>Platform overview</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
                {Object.entries(stats).map(([k, v]) => (
                  <div key={k} style={card}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{v}</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>{k}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'Analytics' && analytics && (
            <>
              <h1 style={{ marginTop: 0 }}>Analytics</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
                {Object.entries(analytics.growth || {}).map(([k, v]) => (
                  <div key={k} style={card}><div style={{ fontWeight: 800 }}>{v}</div><div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{k}</div></div>
                ))}
              </div>
              <h2 style={{ fontSize: '1rem' }}>14-day traffic</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr><th style={th}>Day</th><th style={th}>Views</th><th style={th}>Searches</th><th style={th}>Logins</th></tr></thead>
                  <tbody>
                    {(analytics.traffic || []).map((d) => (
                      <tr key={d.day}><td style={td}>{d.day}</td><td style={td}>{d.views}</td><td style={td}>{d.searches}</td><td style={td}>{d.logins}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h2 style={{ fontSize: '1rem', marginTop: 20 }}>Top search queries</h2>
              <ul>
                {(analytics.topQueries || []).map((q) => <li key={q._id}>{q._id} — {q.count}</li>)}
              </ul>
            </>
          )}

          {tab === 'Approvals' && (
            <>
              <h1 style={{ marginTop: 0 }}>Approvals</h1>
              <Panel title="Institutions">
                {(data.institutions || []).map((i) => (
                  <Row key={i._id} label={i.name} actions={<>
                    <Btn onClick={() => adminApi.approveInstitution(i._id).then(refresh)}>Approve</Btn>
                    <Btn danger onClick={() => adminApi.suspendInstitution(i._id).then(refresh)}>Suspend</Btn>
                  </>}
                  />
                ))}
              </Panel>
              <Panel title="Companies">
                {(data.companies || []).map((c) => (
                  <Row key={c._id} label={c.name} actions={<>
                    <Btn onClick={() => adminApi.approveCompany(c._id).then(refresh)}>Approve</Btn>
                    <Btn danger onClick={() => adminApi.suspendCompany(c._id).then(refresh)}>Suspend</Btn>
                  </>}
                  />
                ))}
              </Panel>
              <Panel title="Promotions">
                {(data.promotions || []).map((p) => (
                  <Row key={p._id} label={p.title} actions={<>
                    <Btn onClick={() => adminApi.approvePromotion(p._id).then(refresh)}>Publish</Btn>
                    <Btn danger onClick={() => adminApi.rejectPromotion(p._id).then(refresh)}>Reject</Btn>
                  </>}
                  />
                ))}
              </Panel>
              <Panel title="Reviews">
                {(data.reviews || []).map((r) => (
                  <Row key={r._id} label={`★${r.rating} ${r.content?.slice(0, 50) || ''}`} actions={<>
                    <Btn onClick={() => adminApi.moderateReview(r._id, { status: 'approved' }).then(refresh)}>Approve</Btn>
                    <Btn danger onClick={() => adminApi.moderateReview(r._id, { status: 'rejected' }).then(refresh)}>Reject</Btn>
                  </>}
                  />
                ))}
              </Panel>
            </>
          )}

          {tab === 'Users' && (
            <>
              <h1 style={{ marginTop: 0 }}>Manage users</h1>
              <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                Passwords, OTPs, and tokens are never shown. Role changes are admin-only and audited.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); loadTab('Users') }} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Search name, email, institution" style={inp} />
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} style={inp} aria-label="Filter role">
                  <option value="">All roles</option>
                  <option value="student">student</option>
                  <option value="institution">institution</option>
                  <option value="company">company</option>
                  <option value="admin">admin</option>
                </select>
                <select value={userStatus} onChange={(e) => setUserStatus(e.target.value)} style={inp} aria-label="Filter status">
                  <option value="">All statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="DISABLED">DISABLED</option>
                  <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                </select>
                <Btn onClick={() => loadTab('Users')}>Search</Btn>
              </form>
              {(data.users || []).map((u) => (
                <Row
                  key={u._id}
                  label={`${u.name} · ${u.email} · ${u.role} · ${u.accountStatus || (u.suspended ? 'SUSPENDED' : 'ACTIVE')} · verified:${u.emailVerified ? 'yes' : 'no'} · ${u.institutionName || u.organizationName || 'no institution'} · last login:${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'never'}`}
                  actions={
                    <>
                      <select
                        defaultValue={u.role || ''}
                        aria-label={`Change role for ${u.email}`}
                        style={{ ...inp, width: 130 }}
                        onChange={(e) => {
                          const role = e.target.value
                          if (!role || role === u.role) return
                          adminApi.updateUserAccess(u._id, { role }).then(() => { setMsg(`Role updated for ${u.email}`); refresh() }).catch((err) => setMsg(err.response?.data?.message || 'Role update failed'))
                        }}
                      >
                        <option value="student">student</option>
                        <option value="institution">institution</option>
                        <option value="company">company</option>
                        <option value="admin">admin</option>
                      </select>
                      <Btn danger onClick={() => adminApi.suspendUser(u._id, { suspended: !(u.suspended || u.accountStatus === 'SUSPENDED') }).then(refresh)}>
                        {(u.suspended || u.accountStatus === 'SUSPENDED') ? 'Restore' : 'Suspend'}
                      </Btn>
                      <Btn danger onClick={() => adminApi.updateUserAccess(u._id, { accountStatus: u.accountStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED' }).then(refresh)}>
                        {u.accountStatus === 'DISABLED' ? 'Enable' : 'Disable'}
                      </Btn>
                    </>
                  }
                />
              ))}
            </>
          )}

          {tab === 'Institutions' && (
            <>
              <h1 style={{ marginTop: 0 }}>Institutions</h1>
              {(data.institutions || []).map((i) => (
                <Row key={i._id} label={`${i.name} · ${i.status}`} actions={<>
                  {i.status !== 'approved' && <Btn onClick={() => adminApi.approveInstitution(i._id).then(refresh)}>Approve</Btn>}
                  <Btn danger onClick={() => adminApi.suspendInstitution(i._id).then(refresh)}>Suspend</Btn>
                </>}
                />
              ))}
            </>
          )}

          {tab === 'Companies' && (
            <>
              <h1 style={{ marginTop: 0 }}>Companies</h1>
              {(data.companies || []).map((c) => (
                <Row key={c._id} label={`${c.name} · ${c.status}`} actions={<>
                  {c.status !== 'approved' && <Btn onClick={() => adminApi.approveCompany(c._id).then(refresh)}>Approve</Btn>}
                  <Btn danger onClick={() => adminApi.suspendCompany(c._id).then(refresh)}>Suspend</Btn>
                </>}
                />
              ))}
            </>
          )}

          {tab === 'Books' && (
            <>
              <h1 style={{ marginTop: 0 }}>Manage books</h1>
              <form onSubmit={addBook} style={{ display: 'grid', gap: 8, maxWidth: 480, marginBottom: 16 }}>
                <input required placeholder="Title" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} style={inp} />
                <input placeholder="Author" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} style={inp} />
                <input required placeholder="Licensed PDF URL" value={bookForm.pdfUrl} onChange={(e) => setBookForm({ ...bookForm, pdfUrl: e.target.value })} style={inp} />
                <button type="submit" style={btnPrimary}>Add licensed book</button>
              </form>
              {(data.books || []).map((b) => (
                <Row key={b._id} label={`${b.title} — ${b.author} · ${b.status}`} actions={
                  b.status !== 'archived' ? <Btn danger onClick={() => adminApi.archiveBook(b._id).then(refresh)}>Archive</Btn> : null
                }
                />
              ))}
            </>
          )}

          {tab === 'Jobs' && (
            <>
              <h1 style={{ marginTop: 0 }}>Jobs</h1>
              {(data.jobs || []).map((j) => (
                <Row key={j._id} label={`${j.title} · ${j.companyId?.name || ''} · ${j.status}`} actions={
                  j.status === 'open' ? <Btn danger onClick={() => adminApi.closeJob(j._id).then(refresh)}>Close</Btn> : null
                }
                />
              ))}
            </>
          )}

          {tab === 'Internships' && (
            <>
              <h1 style={{ marginTop: 0 }}>Internships</h1>
              {(data.internships || []).map((j) => (
                <Row key={j._id} label={`${j.title} · ${j.companyId?.name || ''} · ${j.status}`} />
              ))}
            </>
          )}

          {tab === 'Courses' && (
            <>
              <h1 style={{ marginTop: 0 }}>Courses</h1>
              {(data.courses || []).map((c) => <Row key={c._id} label={`${c.title} · ${c.status}`} />)}
            </>
          )}

          {tab === 'Events' && (
            <>
              <h1 style={{ marginTop: 0 }}>Events</h1>
              {(data.events || []).map((e) => <Row key={e._id} label={`${e.title} · ${e.type} · ${e.status}`} />)}
            </>
          )}

          {tab === 'Scholarships' && (
            <>
              <h1 style={{ marginTop: 0 }}>Scholarships</h1>
              {(data.scholarships || []).map((s) => <Row key={s._id} label={`${s.title} · ${s.status}`} />)}
            </>
          )}

          {tab === 'Reviews' && (
            <>
              <h1 style={{ marginTop: 0 }}>Moderate reviews</h1>
              {(data.reviews || []).map((r) => (
                <Row key={r._id} label={`★${r.rating} · reports:${r.reportCount || 0} · ${r.status} · ${r.content?.slice(0, 60) || ''}`} actions={<>
                  <Btn onClick={() => adminApi.moderateReview(r._id, { status: 'approved' }).then(refresh)}>Approve</Btn>
                  <Btn danger onClick={() => adminApi.moderateReview(r._id, { status: 'rejected' }).then(refresh)}>Reject</Btn>
                </>}
                />
              ))}
            </>
          )}

          {tab === 'Reports' && (
            <>
              <h1 style={{ marginTop: 0 }}>Content reports</h1>
              {(data.reports || []).map((r) => (
                <Row key={r._id} label={`${r.targetType} · ${r.reason} · by ${r.reporterId?.email || 'user'}`} actions={<>
                  <Btn onClick={() => adminApi.resolveReport(r._id, { status: 'resolved', resolution: 'Action taken' }).then(refresh)}>Resolve</Btn>
                  <Btn danger onClick={() => adminApi.resolveReport(r._id, { status: 'dismissed', resolution: 'No violation' }).then(refresh)}>Dismiss</Btn>
                </>}
                />
              ))}
              {(data.reports || []).length === 0 && <p style={{ color: '#9CA3AF' }}>No open reports.</p>}
            </>
          )}

          {tab === 'Security' && (
            <>
              <h1 style={{ marginTop: 0 }}>Security / audit logs</h1>
              {(data.logs || []).map((l) => (
                <div key={l._id} style={{ ...card, marginBottom: 8, fontSize: '0.85rem' }}>
                  {new Date(l.createdAt).toLocaleString()} — {l.adminId?.email || 'admin'} — <strong>{l.action}</strong> {l.targetType} {l.details}
                </div>
              ))}
            </>
          )}

          {tab === 'Notifications' && (
            <>
              <h1 style={{ marginTop: 0 }}>System notifications</h1>
              <p style={{ color: '#9CA3AF' }}>In-app delivery is live. Email and push channels are prepared (pending status) for workers.</p>
              <form onSubmit={sendBroadcast} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
                <input required placeholder="Title" value={broadcast.title} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })} style={inp} />
                <textarea placeholder="Body" rows={3} value={broadcast.body} onChange={(e) => setBroadcast({ ...broadcast, body: e.target.value })} style={inp} />
                <input placeholder="Link (optional)" value={broadcast.link} onChange={(e) => setBroadcast({ ...broadcast, link: e.target.value })} style={inp} />
                <select value={broadcast.role} onChange={(e) => setBroadcast({ ...broadcast, role: e.target.value })} style={inp}>
                  <option value="student">Students</option>
                  <option value="institution">Institutions</option>
                  <option value="company">Companies</option>
                </select>
                <button type="submit" style={btnPrimary}>Broadcast in-app</button>
              </form>
            </>
          )}
        </main>
      </div>
      <style>{`@media (max-width: 800px) { .admin-layout { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: '1rem', color: '#93C5FD' }}>{title}</h2>
      <div>{children}</div>
      {!children?.length && !Array.isArray(children) && <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>None pending.</p>}
    </section>
  )
}

function Row({ label, actions }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1F2937' }}>
      <span style={{ fontSize: '0.9rem' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>{actions}</div>
    </div>
  )
}

function Btn({ children, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
        background: danger ? '#7F1D1D' : '#1D4ED8', color: '#fff',
      }}
    >
      {children}
    </button>
  )
}

const card = { padding: 14, borderRadius: 12, background: '#111827', border: '1px solid #1F2937' }
const inp = { padding: '10px 12px', borderRadius: 10, border: '1px solid #374151', background: '#111827', color: '#F3F4F6', font: 'inherit', width: '100%' }
const btnPrimary = { ...inp, background: '#0EA5E9', border: 'none', fontWeight: 800, cursor: 'pointer', color: '#0B1220' }
const th = { textAlign: 'left', padding: 8, borderBottom: '1px solid #1F2937' }
const td = { padding: 8, borderBottom: '1px solid #1F2937' }
