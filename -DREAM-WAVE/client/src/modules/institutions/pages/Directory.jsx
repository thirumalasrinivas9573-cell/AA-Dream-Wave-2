import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { institutionApi } from '@shared/services/api'
import InstitutionCard, { TYPE_LABEL } from '../components/InstitutionCard'
import SeoHead from '../components/SeoHead'

const TYPES = [
  { id: '', label: 'All' },
  { id: 'university', label: 'Universities' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'medical', label: 'Medical' },
  { id: 'college', label: 'Colleges' },
  { id: 'school', label: 'Schools' },
  { id: 'training', label: 'Training' },
  { id: 'bootcamp', label: 'Bootcamps' },
]

export default function InstitutionsDirectory() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [options, setOptions] = useState({ states: [], cities: [], types: [] })
  const [loading, setLoading] = useState(true)
  const [compare, setCompare] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dw_compare') || '[]') } catch { return [] }
  })

  const filters = useMemo(() => ({
    q: params.get('q') || '',
    institutionType: params.get('type') || '',
    state: params.get('state') || '',
    city: params.get('city') || '',
    course: params.get('course') || '',
    minFees: params.get('minFees') || '',
    maxFees: params.get('maxFees') || '',
    minPlacement: params.get('minPlacement') || '',
    minRating: params.get('minRating') || '',
    rankingMax: params.get('rankingMax') || '',
    hostel: params.get('hostel') || '',
    sort: params.get('sort') || '',
  }), [params])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key === 'institutionType' ? 'type' : key)
    else next.set(key === 'institutionType' ? 'type' : key, value)
    setParams(next)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await institutionApi.publicList({
        q: filters.q || undefined,
        institutionType: filters.institutionType || undefined,
        state: filters.state || undefined,
        city: filters.city || undefined,
        course: filters.course || undefined,
        minFees: filters.minFees || undefined,
        maxFees: filters.maxFees || undefined,
        minPlacement: filters.minPlacement || undefined,
        minRating: filters.minRating || undefined,
        rankingMax: filters.rankingMax || undefined,
        hostel: filters.hostel || undefined,
        sort: filters.sort || undefined,
        limit: 48,
      })
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    institutionApi.publicFilters().then((r) => setOptions(r.data.options || {})).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const toggleCompare = (item) => {
    setCompare((prev) => {
      const exists = prev.find((p) => p._id === item._id)
      let next
      if (exists) next = prev.filter((p) => p._id !== item._id)
      else if (prev.length >= 3) next = [...prev.slice(1), { _id: item._id, name: item.name, slug: item.slug }]
      else next = [...prev, { _id: item._id, name: item.name, slug: item.slug }]
      sessionStorage.setItem('dw_compare', JSON.stringify(next))
      return next
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#F8FAFC,#EEF2FF)', color: '#0F172A' }}>
      <SeoHead
        title="Browse Institutions | Dream Wave Discovery"
        description="Search universities, colleges, schools, and training institutes. Filter by location, courses, fees, placements, and AI rating."
        canonical="/institutions"
      />
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 18px 60px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <Link to="/discover" style={{ color: '#64748B', fontSize: '0.85rem' }}>← Discovery</Link>
            <h1 style={{ margin: '8px 0 4px', fontSize: 'clamp(1.5rem,3vw,2rem)', color: '#1E3A5F' }}>Institutions</h1>
            <p style={{ margin: 0, color: '#64748B' }}>{total} approved public profiles</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/search" style={navBtn}>Global search</Link>
            {compare.length >= 2 && (
              <Link to={`/institutions/compare?ids=${compare.map((c) => c._id).join(',')}`} style={{ ...navBtn, background: '#2563EB', color: '#fff', border: 'none' }}>
                Compare ({compare.length})
              </Link>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TYPES.map((t) => (
            <button
              key={t.id || 'all'}
              type="button"
              onClick={() => setFilter('institutionType', t.id)}
              style={{
                padding: '8px 14px', borderRadius: 999, border: '1px solid #CBD5E1', cursor: 'pointer',
                background: filters.institutionType === t.id ? '#1E3A5F' : '#fff',
                color: filters.institutionType === t.id ? '#fff' : '#334155', fontWeight: 600, fontSize: '0.82rem',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); load() }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20, background: '#fff', padding: 14, borderRadius: 14, border: '1px solid #E2E8F0' }}
        >
          <input aria-label="Search" placeholder="Search name…" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} style={input} />
          <select aria-label="State" value={filters.state} onChange={(e) => setFilter('state', e.target.value)} style={input}>
            <option value="">State</option>
            {(options.states || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="City" value={filters.city} onChange={(e) => setFilter('city', e.target.value)} style={input}>
            <option value="">City</option>
            {(options.cities || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input aria-label="Course" placeholder="Course" value={filters.course} onChange={(e) => setFilter('course', e.target.value)} style={input} />
          <input aria-label="Min fees" type="number" placeholder="Min fees" value={filters.minFees} onChange={(e) => setFilter('minFees', e.target.value)} style={input} />
          <input aria-label="Max fees" type="number" placeholder="Max fees" value={filters.maxFees} onChange={(e) => setFilter('maxFees', e.target.value)} style={input} />
          <input aria-label="Min placement %" type="number" placeholder="Min placement %" value={filters.minPlacement} onChange={(e) => setFilter('minPlacement', e.target.value)} style={input} />
          <input aria-label="Min AI rating" type="number" step="0.1" placeholder="Min AI rating" value={filters.minRating} onChange={(e) => setFilter('minRating', e.target.value)} style={input} />
          <input aria-label="Max ranking" type="number" placeholder="Max rank #" value={filters.rankingMax} onChange={(e) => setFilter('rankingMax', e.target.value)} style={input} />
          <select aria-label="Hostel" value={filters.hostel} onChange={(e) => setFilter('hostel', e.target.value)} style={input}>
            <option value="">Hostel</option>
            <option value="true">Hostel available</option>
          </select>
          <select aria-label="Sort" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} style={input}>
            <option value="">Sort: Popular</option>
            <option value="rating">AI rating</option>
            <option value="placement">Placement %</option>
            <option value="ranking">Ranking</option>
            <option value="name">Name</option>
            <option value="newest">Newest</option>
          </select>
          <button type="submit" style={{ ...input, background: '#2563EB', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Apply</button>
        </form>

        {loading ? <p style={{ color: '#64748B' }}>Loading institutions…</p> : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', color: '#64748B' }}>
            No institutions match these filters yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {items.map((item) => (
              <InstitutionCard
                key={item._id}
                item={item}
                selected={compare.some((c) => c._id === item._id)}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const input = {
  padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#F8FAFC', font: 'inherit', width: '100%',
}
const navBtn = {
  padding: '8px 14px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#fff', color: '#1E3A5F',
  textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem',
}

export { TYPE_LABEL }
