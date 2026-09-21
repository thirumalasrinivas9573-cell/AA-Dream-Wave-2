import { Link } from 'react-router-dom'

export function DiscoverySection({ title, children, empty, action }) {
  if (!children && empty) {
    return (
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{title}</h2>
          {action}
        </div>
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>{empty}</p>
      </section>
    )
  }
  if (!children) return null
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#F8FAFC' }}>{title}</h2>
        {action}
      </div>
      <div style={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: 'minmax(180px, 220px)',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 6,
      }}>
        {children}
      </div>
    </section>
  )
}

export function DiscoveryCard({ to, title, meta, badge }) {
  const inner = (
    <article style={{
      padding: 14, borderRadius: 14, minHeight: 96,
      background: 'rgba(15,23,42,0.85)', border: '1px solid #1E293B',
      color: 'inherit', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {badge && <span style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 700 }}>{badge}</span>}
      <strong style={{ fontSize: '0.95rem', lineHeight: 1.3 }}>{title}</strong>
      {meta && <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{meta}</span>}
    </article>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link> : inner
}
