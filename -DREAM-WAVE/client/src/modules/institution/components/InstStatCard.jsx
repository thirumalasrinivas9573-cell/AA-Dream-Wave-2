import { Link } from 'react-router-dom'
import { institutionPath } from '../theme'

export default function InstStatCard({ label, value, to, accent }) {
  const inner = (
    <>
      <div className="inst-stat-value" style={accent ? { color: accent } : undefined}>{value ?? 0}</div>
      <div className="inst-stat-label">{label}</div>
    </>
  )
  if (to) {
    return (
      <Link to={institutionPath(to)} className="inst-card inst-stat" aria-label={`${label}: ${value ?? 0}`}>
        {inner}
      </Link>
    )
  }
  return <div className="inst-card inst-stat" aria-label={`${label}: ${value ?? 0}`}>{inner}</div>
}
