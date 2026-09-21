import { Link } from 'react-router-dom'

export default function CompanyCard({ item, selected, onToggleCompare }) {
  const loc = [item.contact?.city, item.contact?.state, item.contact?.country].filter(Boolean).join(', ')
  return (
    <article style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 14,
      background: '#fff', border: selected ? '2px solid #2563EB' : '1px solid #E2E8F0',
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {item.logo ? (
          <img src={item.logo} alt="" width={48} height={48} style={{ borderRadius: 10, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#1E3A8A', fontWeight: 800 }}>
            {(item.name || '?')[0]}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/companies/${item.slug}`} style={{ color: '#0F172A', textDecoration: 'none', fontWeight: 800, fontSize: '1.02rem' }}>
            {item.name}
          </Link>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>
            {item.industry || 'Company'}
            {item.verified !== false && <span style={{ marginLeft: 8, color: '#059669', fontWeight: 700 }}>Verified</span>}
          </div>
          {loc && <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>{loc}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: '0.75rem', color: '#475569' }}>
        <span>AI {item.stats?.aiScore ?? 0}</span>
        <span>{item.stats?.jobOpenings ?? 0} jobs</span>
        <span>{item.stats?.internshipCount ?? 0} internships</span>
        <span>{item.companySize || '—'}</span>
        <span>{item.stats?.followers ?? 0} followers</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <Link to={`/companies/${item.slug}`} style={btn('#1E3A8A')}>View profile</Link>
        {onToggleCompare && (
          <button type="button" onClick={() => onToggleCompare(item)} style={btn(selected ? '#059669' : '#64748B', true)}>
            {selected ? 'In compare' : 'Compare'}
          </button>
        )}
      </div>
    </article>
  )
}

function btn(bg, outline) {
  return {
    padding: '8px 12px', borderRadius: 10, border: outline ? `1px solid ${bg}` : 'none',
    background: outline ? 'transparent' : bg, color: outline ? bg : '#fff',
    fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit',
  }
}
