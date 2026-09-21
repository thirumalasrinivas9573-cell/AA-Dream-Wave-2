import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { libraryApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import { BookRow } from '../components/BookCard'
import CollectionCard from '../components/CollectionCard'
import LibrarySeo from '../components/LibrarySeo'
import { LibraryInsights, LibrarySkeleton, LibraryState, VirtualBookGrid } from '../components/LibraryWorkspace'
import { MyLibrarySections } from '../components/LibraryIntelligence'
import '../styles/library.css'

export default function LibraryHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [home, setHome] = useState(null)
  const [q, setQ] = useState(params.get('q') || '')
  const [category, setCategory] = useState(params.get('category') || '')
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [enriched, setEnriched] = useState(null)
  const [myLibrary, setMyLibrary] = useState(null)
  const [error, setError] = useState('')
  const userId = user?._id

  useEffect(() => {
    setLoading(true)
    setError('')
    libraryApi.home()
      .then((r) => setHome(r.data.home))
      .catch((requestError) => {
        setHome(null)
        setError(requestError.userMessage || 'The library is temporarily unavailable.')
      })
      .finally(() => setLoading(false))
    if (userId) {
      libraryApi.dashboard().then((response) => setDashboard(response.data.dashboard)).catch(() => {})
      libraryApi.enrichedHome().then((r) => setEnriched(r.data)).catch(() => {})
      libraryApi.myLibrary().then((r) => setMyLibrary(r.data.library)).catch(() => {})
    }
  }, [userId])

  useEffect(() => {
    const cat = params.get('category') || ''
    const query = params.get('q') || ''
    setCategory(cat)
    setQ(query)
    if (cat || query) {
      libraryApi.list({ category: cat || undefined, q: query || undefined, limit: 48, sort: 'popular' })
        .then((r) => setCatalog(r.data.items || []))
        .catch(() => setCatalog([]))
    } else {
      setCatalog([])
    }
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    setParams(next)
  }

  const pickCategory = (name) => {
    const next = new URLSearchParams(params)
    if (!name || name === category) next.delete('category')
    else next.set('category', name)
    setParams(next)
  }

  const cols = home?.collections || {}
  const showBrowse = Boolean(category || params.get('q'))

  return (
    <div className="library-module">
      <LibrarySeo
        title="Dream Wave Knowledge Center | Digital Library"
        description="Licensed and legally available learning resources with AI reading tools, collections, and progress tracking."
        canonical="/library"
      />
      <div className="library-shell">
        <div className="library-hero">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            <div>
              <Link to="/" style={{ color: 'var(--lib-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>← Home</Link>
              {user?.role === 'student' && (
                <Link to="/student/books" style={{ marginLeft: 12, color: 'var(--lib-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>Student bookshelf</Link>
              )}
              <h1>Knowledge Center</h1>
              <p>Dream Wave Digital Library — licensed titles, reading tools, and AI study aids. No placeholder catalogs.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Link to="/discover" className="library-btn library-btn-secondary">Discovery</Link>
              <Link to="/search" className="library-btn library-btn-secondary">Global search</Link>
              {(user?.role === 'institution' || user?.role === 'company' || user?.role === 'admin') && (
                <Link to="/library/org" className="library-btn library-btn-primary">Publish desk</Link>
              )}
            </div>
          </div>
        </div>

        <form className="library-search" onSubmit={submitSearch} role="search">
          <input
            aria-label="Search books, authors, ISBN, publishers"
            placeholder="Search books, authors, ISBN, publishers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="library-btn library-btn-primary">Search</button>
          <button type="button" className="library-btn library-btn-secondary" onClick={() => navigate('/library/search')}>Advanced</button>
        </form>

        <div className="library-chips" role="navigation" aria-label="Categories">
          {(home?.categories || []).slice(0, 16).map((c) => (
            <button key={c} type="button" className={`library-chip ${category === c ? 'active' : ''}`} onClick={() => pickCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        {dashboard && <LibraryInsights dashboard={dashboard} />}
        {loading && <LibrarySkeleton count={6} />}
        {!loading && error && <LibraryState title="Knowledge Center unavailable" message={error} action={<button className="library-btn library-btn-secondary" type="button" onClick={() => window.location.reload()}>Try again</button>} />}

        {showBrowse ? (
          <section className="library-section">
            <h2>{category || 'Search results'}</h2>
            {catalog.length === 0 ? (
              <div className="library-empty">No licensed titles match this filter yet.</div>
            ) : (
              <VirtualBookGrid books={catalog} />
            )}
          </section>
        ) : home && (
          <>
            <BookRow title="Continue reading" books={home.continueReading} />
            {user && myLibrary && (
              <section className="library-section library-panel">
                <h2>My Library</h2>
                <MyLibrarySections library={myLibrary} />
              </section>
            )}
            {user && enriched?.goalResources?.length > 0 && enriched.goalResources.map(({ goal, items }) => (
              <section key={goal._id} className="library-section">
                <h2>For your goal: {goal.title}</h2>
                <div className="library-grid">
                  {(items || []).map(({ book, explanation }) => (
                    <article key={book._id} className="library-goal-resource-card">
                      <Link to={`/library/books/${book._id}`}><strong>{book.title}</strong></Link>
                      <small>{book.author}</small>
                      <p>{explanation}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {user && enriched?.roadmapResources?.length > 0 && enriched.roadmapResources.map(({ roadmap, items }) => (
              <section key={roadmap._id} className="library-section">
                <h2>Roadmap resources: {roadmap.goalId?.title || 'Learning path'}</h2>
                <div className="library-grid">
                  {(items || []).map(({ book, explanation }) => (
                    <article key={book._id} className="library-goal-resource-card">
                      <Link to={`/library/books/${book._id}`}><strong>{book.title}</strong></Link>
                      <p>{explanation}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            <BookRow title="Recommended for you" books={home.recommended} />
            <BookRow title="AI picks" books={home.aiPicks} />
            <BookRow title="Recently added" books={home.recentlyAdded} />
            <BookRow title="Trending" books={home.trending} />
            <BookRow title="Most popular" books={home.popular} />
            <BookRow title="Featured" books={home.featured} />
            <BookRow title="Editor's picks" books={home.editorsPicks} />
            <BookRow title="Saved books" books={home.saved} />
            <BookRow title="Bookmarks" books={home.bookmarks} />
            <BookRow title="Reading history" books={home.history} />

            {['career', 'course', 'research'].map((key) => (
              (cols[key] || []).length > 0 && (
                <section key={key} className="library-section">
                  <h2>{key === 'career' ? 'Career collections' : key === 'course' ? 'Course collections' : 'Research collections'}</h2>
                  <div className="library-row">
                    {cols[key].map((c) => <CollectionCard key={c._id} item={c} />)}
                  </div>
                </section>
              )
            ))}

            {(cols.institution || []).length > 0 && (
              <section className="library-section">
                <h2>Institution reading lists</h2>
                <div className="library-row">
                  {cols.institution.map((c) => <CollectionCard key={c._id} item={c} />)}
                </div>
              </section>
            )}

            {(cols.company || []).length > 0 && (
              <section className="library-section">
                <h2>Company learning guides</h2>
                <div className="library-row">
                  {cols.company.map((c) => <CollectionCard key={c._id} item={c} />)}
                </div>
              </section>
            )}

            {!home.recentlyAdded?.length && !home.continueReading?.length && (
              <div className="library-empty">
                The Knowledge Center is ready. Licensed books appear here when admins, institutions, or companies publish them.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
