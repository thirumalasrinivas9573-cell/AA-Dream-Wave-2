import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { libraryApi } from '@shared/services/api'
import { LibrarySkeleton, LibraryState, VirtualBookGrid } from '../components/LibraryWorkspace'
import LibrarySeo from '../components/LibrarySeo'
import '../styles/library.css'

export default function LibrarySearch() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [options, setOptions] = useState({})
  const [results, setResults] = useState({ books: [], authors: [], publishers: [], tags: [], categories: [] })
  const [filters, setFilters] = useState({
    category: params.get('category') || '',
    author: params.get('author') || '',
    publisher: params.get('publisher') || '',
    tag: params.get('tag') || '',
    language: params.get('language') || '',
    difficulty: params.get('difficulty') || '',
    maxMinutes: params.get('maxMinutes') || '',
  })
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    libraryApi.filters().then((r) => setOptions(r.data.options || {})).catch(() => {})
  }, [])

  useEffect(() => {
    const query = params.get('q') || ''
    setQ(query)
    setLoading(true)
    setError('')
    if (query) {
      libraryApi.search(query).then((r) => setResults(r.data)).catch(() => {})
    }
    libraryApi.list({
      q: query || undefined,
      category: filters.category || undefined,
      author: filters.author || undefined,
      publisher: filters.publisher || undefined,
      tag: filters.tag || undefined,
      language: filters.language || undefined,
      difficulty: filters.difficulty || undefined,
      maxMinutes: filters.maxMinutes || undefined,
      limit: 48,
      sort: 'popular',
    }).then((r) => setBooks(r.data.items || [])).catch((requestError) => {
      setBooks([])
      setError(requestError.userMessage || 'Search is temporarily unavailable.')
    }).finally(() => setLoading(false))
  }, [params, filters])

  const submit = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    setParams(next)
  }

  const setFilter = (key, value) => {
    const nextFilters = { ...filters, [key]: value }
    setFilters(nextFilters)
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="library-module">
      <LibrarySeo title="Search Library | Dream Wave" description="Search licensed books by title, author, category, tags, ISBN, and publisher." canonical="/library/search" />
      <div className="library-shell">
        <Link to="/library" style={{ color: 'var(--lib-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>← Knowledge Center</Link>
        <h1 style={{ margin: '10px 0' }}>Library search</h1>
        <form className="library-search" onSubmit={submit}>
          <input aria-label="Search query" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Books, authors, ISBN, subjects…" />
          <button type="submit" className="library-btn library-btn-primary">Search</button>
        </form>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginBottom: 20 }}>
          <select className="library-input" aria-label="Category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">Category</option>
            {(options.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="library-input" aria-label="Author" value={filters.author} onChange={(e) => setFilter('author', e.target.value)}>
            <option value="">Author</option>
            {(options.authors || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="library-input" aria-label="Publisher" value={filters.publisher} onChange={(e) => setFilter('publisher', e.target.value)}>
            <option value="">Publisher</option>
            {(options.publishers || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="library-input" aria-label="Tag" value={filters.tag} onChange={(e) => setFilter('tag', e.target.value)}>
            <option value="">Tag</option>
            {(options.tags || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="library-input" aria-label="Language" value={filters.language} onChange={(e) => setFilter('language', e.target.value)}>
            <option value="">Language</option>
            {(options.languages || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="library-input" aria-label="Difficulty" value={filters.difficulty} onChange={(e) => setFilter('difficulty', e.target.value)}>
            <option value="">Difficulty</option>
            {(options.difficulties || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="library-input" aria-label="Reading time" value={filters.maxMinutes} onChange={(e) => setFilter('maxMinutes', e.target.value)}>
            <option value="">Reading time</option><option value="60">Under 1 hour</option><option value="180">Under 3 hours</option><option value="360">Under 6 hours</option><option value="720">Under 12 hours</option>
          </select>
        </div>

        {results.categories?.length > 0 && (
          <div className="library-chips">
            {results.categories.map((c) => (
              <button key={c} type="button" className="library-chip" onClick={() => setFilter('category', c)}>{c}</button>
            ))}
          </div>
        )}

        <section className="library-section">
          <h2>Books ({books.length})</h2>
          {querySuggestions(results, setFilter)}
          {loading ? <LibrarySkeleton count={8} /> : error ? <LibraryState title="Search unavailable" message={error} /> : books.length === 0 ? <div className="library-empty">No matching legal titles.</div> : <VirtualBookGrid books={books} />}
        </section>
      </div>
    </div>
  )
}

function querySuggestions(results, setFilter) {
  const groups = [
    ['Authors', results.authors, 'author'],
    ['Publishers', results.publishers, 'publisher'],
    ['Tags', results.tags, 'tag'],
  ]
  if (!groups.some(([, items]) => items?.length)) return null
  return <div className="library-search-suggestions">{groups.map(([label, items, key]) => items?.length ? <section key={label}><strong>{label}</strong>{items.slice(0, 6).map((item) => <button type="button" key={item._id || item.name} onClick={() => setFilter(key, item.name)}>{item.name}</button>)}</section> : null)}</div>
}
