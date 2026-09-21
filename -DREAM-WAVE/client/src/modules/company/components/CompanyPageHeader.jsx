import { COMPANY_THEME } from '../theme'

export default function CompanyPageHeader({ title, subtitle, actions, badge }) {
  const t = COMPANY_THEME
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, marginBottom: 20 }}>
      <div>
        {badge && <div style={{ fontSize: '0.72rem', fontWeight: 700, color: t.accentLight, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{badge}</div>}
        <h1 style={{ margin: 0, fontSize: '1.45rem', color: '#F8FAFC' }}>{title}</h1>
        {subtitle && <p style={{ margin: '6px 0 0', color: t.muted, fontSize: '0.9rem', maxWidth: 560 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function CompanyMetricGrid({ metrics }) {
  return (
    <div className="company-stat-grid">
      {metrics.map((m) => (
        <div key={m.label} className="company-glass" style={{ padding: 16 }}>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#60A5FA' }}>{m.value}</div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 4 }}>{m.label}</div>
        </div>
      ))}
    </div>
  )
}
