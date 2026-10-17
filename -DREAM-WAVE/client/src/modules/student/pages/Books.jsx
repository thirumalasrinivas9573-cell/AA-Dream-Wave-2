import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StudentLayout from '../layouts/StudentLayout'
import { libraryApi } from '@shared/services/api'

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
      libraryApi
        .categories()
        .then((r) => {
          const cats = r.data.categories || []
          setCategories(['All', ...cats])
        })
        .catch(() => {}),
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
    } catch {
      /* ignore */
    }
  }

  return (
    <StudentLayout>
      <div className="flex flex-col gap-6 w-full">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-brand-primary uppercase">
              DIGITAL LIBRARY & PAPERS
            </span>
            <h1 className="text-3xl font-heading font-bold text-content-heading tracking-tight mt-1">
              Books & Knowledge Base
            </h1>
            <p className="text-sm text-content-muted">
              Licensed digital library — search, continue reading, notes, and AI summaries
            </p>
          </div>
          <Link
            to="/library"
            className="h-10 px-4 rounded-xl inline-flex items-center gap-2 text-xs font-semibold text-content-heading bg-surface border border-divider hover:border-brand-primary transition-all self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[18px] text-brand-primary">local_library</span>
            <span>Open Library Hub</span>
          </Link>
        </header>

        {/* Knowledge Discovery Card */}
        <div className="p-5 rounded-stitch bg-surface border border-divider shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-brand-primary">auto_awesome</span>
            <h3 className="font-heading font-bold text-sm text-content-heading">AI Knowledge Discovery</h3>
          </div>
          <p className="text-xs text-content-muted">
            Find legal resources by skill or topic. AI recommendations are grounded in verified library content.
          </p>
          <form onSubmit={recommend} className="flex flex-wrap md:flex-nowrap items-center gap-3 pt-1">
            <div className="relative flex-1 min-w-[240px]">
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[18px] text-content-muted">
                search
              </span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. distributed systems, machine learning, quantum computing..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-canvas border border-divider text-xs font-medium text-content-heading placeholder:text-content-muted focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all flex items-center gap-2 shrink-0 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">explore</span>
              <span>Discover</span>
            </button>
          </form>
        </div>

        {/* Main Search & Category Filters */}
        <div className="flex flex-col gap-3">
          <form onSubmit={search} className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[18px] text-content-muted">
                menu_book
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search library titles, authors, or ISBN..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-divider text-xs font-medium text-content-heading placeholder:text-content-muted focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-4 rounded-xl bg-surface-elevated border border-divider text-content-heading text-xs font-semibold hover:bg-surface transition-all shrink-0"
            >
              Search
            </button>
          </form>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onFilter(c)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === c
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-surface border border-divider text-content-muted hover:text-content-heading hover:bg-surface-elevated'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Continue Reading Section */}
        {continueItems.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-heading font-bold text-base text-content-heading">Continue Reading</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {continueItems.map((p) => {
                const b = p.bookId
                if (!b?._id) return null
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => openBook(b._id)}
                    className="p-4 rounded-stitch bg-surface border border-divider hover:border-brand-primary text-left transition-all flex flex-col justify-between shadow-xs group cursor-pointer"
                  >
                    <div>
                      <div className="font-heading font-bold text-sm text-content-heading group-hover:text-brand-primary transition-colors line-clamp-1">
                        {b.title}
                      </div>
                      <div className="text-xs text-content-muted mt-1">{Math.round(p.percent || 0)}% completed</div>
                    </div>
                    <div className="w-full bg-canvas h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-brand-primary h-full rounded-full transition-all"
                        style={{ width: `${Math.round(p.percent || 0)}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Recommended Books Section */}
        {recommendations.length > 0 && filter === 'All' && !query && (
          <section className="space-y-3">
            <h3 className="font-heading font-bold text-base text-content-heading">Recommended for You</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendations.slice(0, 4).map((b) => (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => openBook(b._id)}
                  className="p-5 rounded-stitch bg-surface border border-divider hover:border-brand-primary text-left transition-all shadow-xs flex flex-col items-center text-center cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">book_5</span>
                  </div>
                  <h4 className="font-heading font-bold text-sm text-content-heading line-clamp-1 group-hover:text-brand-primary transition-colors">
                    {b.title}
                  </h4>
                  <p className="text-xs text-content-muted mt-0.5 line-clamp-1">{b.author}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Book Catalog Grid */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="spinner spinner-lg" />
          </div>
        ) : books.length === 0 ? (
          <div className="p-8 rounded-stitch bg-surface border border-divider text-center space-y-3">
            <span className="material-symbols-outlined text-[40px] text-content-muted">folder_open</span>
            <p className="text-sm font-semibold text-content-heading">No licensed books match this search yet.</p>
            <p className="text-xs text-content-muted">Only institution-licensed or legally available PDFs appear here.</p>
            <Link
              to="/library"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated border border-divider text-xs font-semibold text-content-heading hover:bg-surface transition-all"
            >
              Open Digital Library
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {books.map((b) => (
              <div
                key={b._id}
                className="p-5 rounded-stitch bg-surface border border-divider hover:border-brand-primary transition-all flex flex-col justify-between shadow-xs group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[24px]">menu_book</span>
                  </div>
                  <h3 className="font-heading font-bold text-sm text-content-heading line-clamp-1 group-hover:text-brand-primary transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-xs font-semibold text-brand-primary mt-0.5">{b.author}</p>
                  {b.description && (
                    <p className="text-xs text-content-muted mt-2 line-clamp-2 leading-relaxed">
                      {b.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 space-y-3 border-t border-divider mt-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold">
                      {b.category || 'General'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(b._id, e)}
                      className="p-1 rounded-lg text-content-muted hover:text-amber-500 transition-colors"
                      title="Bookmark"
                    >
                      <span className="material-symbols-outlined text-[18px]">star</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => openBook(b._id)}
                    className="w-full h-9 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Read PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
