import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StudentLayout from '../layouts/StudentLayout'
import { libraryApi } from '@shared/services/api'

/**
 * Student Books — wired to Digital Library (licensed/active PDFs only).
 * Preserves student layout UX: search, categories, continue reading, AI recommend.
 */
export default function Books() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [continueItems, setContinueItems] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState('')
  const [error, setError] = useState('')

  const loadCatalog = useCallback(async (params = {}) => {
    setError('')
    try {
      const { data } = await libraryApi.list({ limit: 48, ...params })
      setBooks(data.items || [])
    } catch {
      setError('Could not load the digital library. Try again.')
      setBooks([])
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadCatalog(),
      libraryApi.categories().then((r) => {
        const cats = r.data.categories || []
        setCategories(['All', ...cats])
      }).catch(() => {}),
      libraryApi.continueReading().then((r) => setContinueItems(r.data.items || [])).catch(() => setContinueItems([])),
      libraryApi.recommendations().then((r) => setRecommendations(r.data.items || [])).catch(() => setRecommendations([])),
    ]).finally(() => setLoading(false))
  }, [loadCatalog])

  const search = async (e) => {
    e.preventDefault()
    setLoading(true)
    await loadCatalog({
      q: query.trim() || undefined,
      category: filter !== 'All' ? filter : undefined,
    })
    setLoading(false)
  }

  const onFilter = async (cat) => {
    setFilter(cat)
    setLoading(true)
    await loadCatalog({
      q: query.trim() || undefined,
      category: cat !== 'All' ? cat : undefined,
    })
    setLoading(false)
  }

  const recommend = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await libraryApi.list({ q: topic, limit: 24, sort: 'popular' })
      setBooks(data.items || [])
      if (!data.items?.length) setError('No legal library resources match this topic yet.')
    } catch {
      setError('Topic discovery failed. Search the library instead.')
    }
    setLoading(false)
  }

  const openBook = (id) => navigate(`/library/read/${id}?from=student`)

  const toggleFavorite = async (bookId, e) => {
    e.stopPropagation()
    try {
      await libraryApi.favorite(bookId)
    } catch { /* ignore */ }
  }

  return (
    <StudentLayout>
      <div className="page-header">
        <h1>📚 <span className="gradient-text">Books</span></h1>
        <p>Licensed digital library — search, continue reading, notes, and AI summaries</p>
      </div>

      <div className="card card-purple" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10, fontSize: '0.9375rem' }}>✦ Knowledge discovery</h3>
        <p style={{ fontSize: '0.8rem', marginBottom: 10 }}>Find legal resources by skill or topic. AI recommendations are architecture-ready and will be grounded in approved content.</p>
        <form onSubmit={recommend} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. machine learning, entrepreneurship…"
            style={{ flex: 1, minWidth: 200 }}
            aria-label="Topic for book recommendations"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" style={{ borderTopColor: 'white' }} /> Finding…</> : '🔍 Discover'}
          </button>
        </form>
      </div>

      <form onSubmit={search} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search library titles, authors…"
          style={{ flex: 1, minWidth: 200 }}
          aria-label="Search books"
        />
        <button type="submit" className="btn btn-secondary" disabled={loading}>Search</button>
      </form>

      {error && <div className="alert alert-error" style={{ marginBottom: 14 }} role="alert">{error}</div>}

      {continueItems.length > 0 && (
        <section style={{ marginBottom: 22 }} aria-label="Continue reading">
          <h3 style={{ marginBottom: 10, fontSize: '0.95rem' }}>Continue Reading</h3>
          <div className="grid-4 student-books-grid">
            {continueItems.map((p) => {
              const b = p.bookId
              if (!b?._id) return null
              return (
                <button
                  key={p._id}
                  type="button"
                  className="card card-lift"
                  onClick={() => openBook(b._id)}
                  style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'inherit', fontFamily: 'inherit' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{b.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{Math.round(p.percent || 0)}% complete</div>
                  <div className="progress-bar" style={{ marginTop: 8, height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(p.percent || 0)}%`, height: '100%', background: 'linear-gradient(90deg,#8B5CF6,#3B82F6)' }} />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {recommendations.length > 0 && filter === 'All' && !query && (
        <section style={{ marginBottom: 22 }} aria-label="Recommended">
          <h3 style={{ marginBottom: 10, fontSize: '0.95rem' }}>Recommended for you</h3>
          <div className="grid-4 student-books-grid">
            {recommendations.slice(0, 4).map((b) => (
              <button
                key={b._id}
                type="button"
                className="card card-lift"
                onClick={() => openBook(b._id)}
                style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'inherit', fontFamily: 'inherit' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📖</div>
                <h3 style={{ fontSize: '0.9rem', marginBottom: 4 }}>{b.title}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--purple-light)' }}>{b.author}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div style={{ overflowX: 'auto', marginBottom: 18 }} role="tablist" aria-label="Book categories">
        <div className="tab-nav" style={{ width: 'max-content' }}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={filter === c}
              className={`tab-item ${filter === c ? 'active' : ''}`}
              onClick={() => onFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
      ) : books.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36 }}>
          <p style={{ marginBottom: 8 }}>No licensed books match this search yet.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Only institution-licensed or legally available PDFs appear here.
          </p>
          <Link to="/library" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>Open Digital Library</Link>
        </div>
      ) : (
        <div className="grid-4 student-books-grid">
          {books.map((b) => (
            <div key={b._id} className="card card-lift" style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 10 }} aria-hidden>📖</div>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 4, lineHeight: 1.35 }}>{b.title}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--purple-light)', marginBottom: 8 }}>{b.author}</p>
              {b.description && (
                <p style={{ fontSize: '0.77rem', marginBottom: 10, lineHeight: 1.55, flex: 1 }}>
                  {b.description.slice(0, 120)}{b.description.length > 120 ? '…' : ''}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>{b.category || 'General'}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => toggleFavorite(b._id, e)} aria-label={`Favorite ${b.title}`}>★</button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => openBook(b._id)}>
                  Read PDF
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled title="Grounded knowledge tools coming soon" aria-label={`Knowledge tools for ${b.title} coming soon`}>
                  ✦
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentLayout>
  )
}
