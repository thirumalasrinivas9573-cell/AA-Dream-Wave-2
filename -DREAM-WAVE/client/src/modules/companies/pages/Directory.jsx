import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { companyApi } from '@shared/services/api'
import CompanyCard from '../components/CompanyCard'
import SeoHead from '../components/SeoHead'

const COMPARE_KEY = 'dw_company_compare'

export default function CompaniesDirectory() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [options, setOptions] = useState({ industries: [], cities: [], states: [], sizes: [], technologies: [] })
  const [loading, setLoading] = useState(true)
  const [compare, setCompare] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(COMPARE_KEY) || '[]') } catch { return [] }
  })

  const filters = useMemo(() => ({
    q: params.get('q') || '',
    industry: params.get('industry') || '',
    state: params.get('state') || '',
    city: params.get('city') || '',
    size: params.get('size') || '',
    technology: params.get('technology') || '',
    hiring: params.get('hiring') || '',
    internships: params.get('internships') || '',
    workMode: params.get('workMode') || '',
    minSalary: params.get('minSalary') || '',
    minRating: params.get('minRating') || '',
    sort: params.get('sort') || '',
  }), [params])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await companyApi.publicList({
        q: filters.q || undefined,
        industry: filters.industry || undefined,
        state: filters.state || undefined,
        city: filters.city || undefined,
        companySize: filters.size || undefined,
        technology: filters.technology || undefined,
        hiring: filters.hiring || undefined,
        internships: filters.internships || undefined,
        workMode: filters.workMode || undefined,
        minSalary: filters.minSalary || undefined,
        minRating: filters.minRating || undefined,
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
    companyApi.publicFilters().then((r) => setOptions(r.data.options || {})).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const toggleCompare = (item) => {
    setCompare((prev) => {
      const exists = prev.find((p) => p._id === item._id)
      let next
      if (exists) next = prev.filter((p) => p._id !== item._id)
      else if (prev.length >= 3) next = [...prev.slice(1), { _id: item._id, name: item.name, slug: item.slug }]
      else next = [...prev, { _id: item._id, name: item.name, slug: item.slug }]
      sessionStorage.setItem(COMPARE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#F8FAFC,#EFF6FF)', color: '#0F172A' }}>
      <SeoHead
        title="Browse Companies | Dream Wave Discovery"
        description="Search employers by industry, location, hiring, internships, technology, salary, and AI rating."
        canonical="/companies"
      />
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 18px 60px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <Link to="/discover" style={{ color: '#64748B', fontSize: '0.85rem' }}>← Discovery</Link>
            <h1 style={{ margin: '8px 0 4px', fontSize: 'clamp(1.5rem,3vw,2rem)', color: '#1E3A8A' }}>Companies</h1>
            <p style={{ margin: 0, color: '#64748B' }}>{total} approved public employers</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/search" style={navBtn}>Global search</Link>
            {compare.length >= 2 && (
              <Link to={`/companies/compare?ids=${compare.map((c) => c._id).join(',')}`} style={{ ...navBtn, background: '#2563EB', color: '#fff', border: 'none' }}>
                Compare ({compare.length})
              </Link>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[
            { k: 'hiring', v: 'true', label: 'Hiring now' },
            { k: 'internships', v: 'true', label: 'Internships' },
            { k: 'workMode', v: 'remote', label: 'Remote' },
            { k: 'workMode', v: 'hybrid', label: 'Hybrid' },
          ].map((chip) => {
            const active = filters[chip.k] === chip.v
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setFilter(chip.k, active ? '' : chip.v)}
                style={{
                  padding: '8px 14px', borderRadius: 999, border: '1px solid #CBD5E1', cursor: 'pointer',
                  background: active ? '#1E3A8A' : '#fff', color: active ? '#fff' : '#334155', fontWeight: 600, fontSize: '0.82rem',
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); load() }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20, background: '#fff', padding: 14, borderRadius: 14, border: '1px solid #E2E8F0' }}
        >
          <input aria-label="Search" placeholder="Search companies…" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} style={input} />
          <select aria-label="Industry" value={filters.industry} onChange={(e) => setFilter('industry', e.target.value)} style={input}>
            <option value="">Industry</option>
            {(options.industries || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="State" value={filters.state} onChange={(e) => setFilter('state', e.target.value)} style={input}>
            <option value="">State</option>
            {(options.states || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="City" value={filters.city} onChange={(e) => setFilter('city', e.target.value)} style={input}>
            <option value="">City</option>
            {(options.cities || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Company size" value={filters.size} onChange={(e) => setFilter('size', e.target.value)} style={input}>
            <option value="">Company size</option>
            {(options.sizes || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Technology" value={filters.technology} onChange={(e) => setFilter('technology', e.target.value)} style={input}>
            <option value="">Technology</option>
            {(options.technologies || []).slice(0, 80).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input aria-label="Min salary" type="number" placeholder="Min salary" value={filters.minSalary} onChange={(e) => setFilter('minSalary', e.target.value)} style={input} />
          <input aria-label="Min AI score" type="number" placeholder="Min AI score" value={filters.minRating} onChange={(e) => setFilter('minRating', e.target.value)} style={input} />
          <select aria-label="Sort" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} style={input}>
            <option value="">Sort: Popular</option>
            <option value="rating">AI score</option>
            <option value="jobs">Open jobs</option>
            <option value="salary">Salary</option>
            <option value="name">Name</option>
            <option value="newest">Newest</option>
          </select>
          <button type="submit" style={{ ...input, background: '#2563EB', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Apply</button>
        </form>

        {loading ? <p style={{ color: '#64748B' }}>Loading companies…</p> : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', color: '#64748B' }}>
            No companies match these filters yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {items.map((item) => (
              <CompanyCard
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
  padding: '8px 14px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#fff', color: '#1E3A8A',
  textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem',
}
