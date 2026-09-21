import { INSTITUTION_THEME } from '../theme'

export default function InstPageHeader({ title, subtitle, actions }) {
  const t = INSTITUTION_THEME
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 22 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.45rem', color: t.accent }}>{title}</h1>
        {subtitle && <p style={{ margin: '6px 0 0', color: t.muted, fontSize: '0.9rem', maxWidth: 560 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}
