import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { contentReportApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import useUnifiedSearch from '@shared/hooks/useUnifiedSearch'
import UnifiedSearchResults, { SearchSuggestions } from '@shared/components/platform/UnifiedSearchResults'
import '@shared/components/platform/platform.css'

const TYPES = [
  ['all','All'],['goals','Goals'],['tasks','Tasks'],['books','Books'],['certificates','Certificates'],
  ['courses','Courses'],['roadmaps','Roadmaps'],['jobs','Jobs'],['internships','Internships'],
  ['companies','Companies'],['reports','Reports'],['notifications','Notifications'],['profile','Profile'],
  ['resumes','Resumes'],['career','Career'],['conversations','AI Conversations'],['support','Support'],
]

export default function SearchPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [options, setOptions] = useState({})
  const [message, setMessage] = useState('')
  const search = useUnifiedSearch({
    initialQuery: params.get('q') || '',
    initialTypes: params.get('type') || 'all',
    initialFilters: {
      state: params.get('state') || '',
      city: params.get('city') || '',
      industry: params.get('industry') || '',
      category: params.get('category') || '',
      workMode: params.get('workMode') || '',
      jobType: params.get('jobType') || '',
      minSalary: params.get('minSalary') || '',
      skill: params.get('skill') || '',
      technology: params.get('technology') || '',
    },
    scope: user?.role === 'student' ? 'all' : 'public',
    debounceMs: 250,
  })

  useEffect(() => {
    import('@shared/services/searchService').then(({ default: service }) => service.filters().then(setOptions)).catch(() => {})
  }, [])

  useEffect(() => {
    const next = new URLSearchParams()
    if (search.query) next.set('q', search.query)
    if (search.types !== 'all') next.set('type', search.types)
    Object.entries(search.filters).forEach(([key, value]) => { if (value) next.set(key, value) })
    setParams(next, { replace: true })
  }, [search.filters, search.query, search.types, setParams])

  const report = async (targetType, targetId) => {
    if (!user) {
      window.location.href = '/student/login'
      return
    }
    const reason = window.prompt('Why are you reporting this result?')
    if (!reason) return
    try {
      await contentReportApi.create({ targetType, targetId, reason })
      setMessage('Report submitted for moderation.')
    } catch (error) {
      setMessage(error.userMessage || 'Could not submit report.')
    }
  }

  const clearHistory = async () => {
    try {
      await search.clearHistory()
      await search.run({ force: true })
    } catch {
      setMessage('Could not clear search history.')
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0B0F1A', color: '#E2E8F0', padding: '28px 20px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <Link to={user?.role === 'student' ? '/student/dashboard' : '/discover'} style={{ color: '#94A3B8' }}>← Back</Link>
        <h1 style={{ margin: '16px 0 8px' }}>Unified Search</h1>
        <p style={{ color: '#94A3B8', marginTop: 0 }}>Search your Dream Wave workspace, learning content, career opportunities, reports, notifications and support.</p>

        <form onSubmit={(event) => { event.preventDefault(); search.run({ force: true }).catch(() => {}) }} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input value={search.query} onChange={(event) => search.setQuery(event.target.value)} placeholder="Search Dream Wave…" aria-label="Search query" autoFocus style={{ flex: 1, minWidth: 200, padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1E293B', color: '#fff' }} />
          <button type="submit" style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: '#38BDF8', fontWeight: 700, color: '#0F172A' }}>Search</button>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginBottom: 18 }}>
          <select aria-label="Category" value={search.types} onChange={(event) => search.setTypes(event.target.value)} style={fieldStyle}>{TYPES.filter(([id]) => user?.role === 'student' || !['goals','tasks','certificates','roadmaps','reports','notifications','profile','resumes'].includes(id)).map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select>
          <select aria-label="State" value={search.filters.state} onChange={(event) => search.setFilter('state', event.target.value)} style={fieldStyle}><option value="">All states</option>{options.states?.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="City" value={search.filters.city} onChange={(event) => search.setFilter('city', event.target.value)} style={fieldStyle}><option value="">All cities</option>{options.cities?.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Industry" value={search.filters.industry} onChange={(event) => search.setFilter('industry', event.target.value)} style={fieldStyle}><option value="">All industries</option>{options.industries?.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Book category" value={search.filters.category} onChange={(event) => search.setFilter('category', event.target.value)} style={fieldStyle}><option value="">All book categories</option>{options.bookCategories?.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Work mode" value={search.filters.workMode} onChange={(event) => search.setFilter('workMode', event.target.value)} style={fieldStyle}><option value="">All work modes</option>{options.workModes?.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="Job type" value={search.filters.jobType} onChange={(event) => search.setFilter('jobType', event.target.value)} style={fieldStyle}><option value="">All job types</option>{options.jobTypes?.map((item) => <option key={item}>{item}</option>)}</select>
          <input aria-label="Minimum salary" type="number" min="0" placeholder="Minimum salary" value={search.filters.minSalary} onChange={(event) => search.setFilter('minSalary', event.target.value)} style={fieldStyle} />
          <input aria-label="Skill" placeholder="Skill" value={search.filters.skill} onChange={(event) => search.setFilter('skill', event.target.value)} style={fieldStyle} />
        </div>

        {!search.query && <SearchSuggestions recent={search.recent} suggestions={search.suggestions} onSelect={search.setQuery} onClear={clearHistory} />}
        {message && <p role="status" style={{ color: '#38BDF8' }}>{message}</p>}
        {search.error && <p role="alert" style={{ color: '#F87171' }}>{search.error}</p>}
        <UnifiedSearchResults items={search.results} loading={search.loading} query={search.query} sourceErrors={search.sourceErrors} onReport={report} />
      </div>
    </main>
  )
}

const fieldStyle = { padding: '10px 12px', borderRadius: 10, border: '1px solid #334155', background: '#1E293B', color: '#E2E8F0', font: 'inherit', width: '100%' }
