import { useEffect, useMemo, useState } from 'react'
import InstCrudPage from '../components/InstCrudPage'
import InstStatCard from '../components/InstStatCard'
import { institutionService } from '../services/api'

const F = [
  { key: 'company', label: 'Recruiter / Company' },
  { key: 'role', label: 'Role' },
  { key: 'package', label: 'Package (₹)', type: 'number', default: 0 },
  { key: 'studentsPlaced', label: 'Students placed', type: 'number', default: 0 },
  { key: 'year', label: 'Year' },
  { key: 'recruiterLogo', label: 'Recruiter logo URL', required: false },
  { key: 'galleryUrl', label: 'Placement gallery URL', required: false },
  { key: 'status', label: 'Status', type: 'select', options: ['upcoming', 'ongoing', 'completed'], default: 'completed' },
]
const C = [
  { key: 'company', label: 'Partner' },
  { key: 'role', label: 'Role' },
  { key: 'package', label: 'Package' },
  { key: 'studentsPlaced', label: 'Placed' },
  { key: 'year', label: 'Year' },
  { key: 'status', label: 'Status' },
]

export default function Placements() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    institutionService.placements.list({ limit: 200 })
      .then((r) => setRows(r.data.items || []))
      .catch(() => setRows([]))
  }, [])

  const stats = useMemo(() => {
    const highest = rows.reduce((m, p) => Math.max(m, Number(p.package) || 0), 0)
    const avg = rows.length ? Math.round(rows.reduce((s, p) => s + (Number(p.package) || 0), 0) / rows.length) : 0
    const partners = new Set(rows.map((p) => p.company).filter(Boolean)).size
    return { highest, avg, partners, total: rows.length }
  }, [rows])

  return (
    <div>
      <div className="inst-grid-stats" style={{ marginBottom: 8 }}>
        <InstStatCard label="Placement records" value={stats.total} />
        <InstStatCard label="Recruiters" value={stats.partners} />
        <InstStatCard label="Highest package" value={`₹${stats.highest.toLocaleString()}`} accent="#059669" />
        <InstStatCard label="Average package" value={`₹${stats.avg.toLocaleString()}`} />
      </div>
      <InstCrudPage
        title="Placements"
        subtitle="Placement partners, packages, recruiters, and gallery links — real records only."
        api={institutionService.placements}
        fields={F}
        columns={C}
        emptyHint="No placement data yet."
      />
    </div>
  )
}
