import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { libraryApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import { openBlob, safeExternalUrl } from '@shared/utils/safeUrl'
import BookCard from '../components/BookCard'
import { RightsBadge } from '../components/BookCard'
import { KnowledgeTools } from '../components/LibraryIntelligence'
import LibrarySeo from '../components/LibrarySeo'
import '../styles/library.css'

export default function BookDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [related, setRelated] = useState([])
  const [progress, setProgress] = useState(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    libraryApi.get(id)
      .then((r) => {
        setBook(r.data.book)
        setRelated(r.data.related || [])
      })
      .catch((requestError) => setError(requestError.userMessage || 'Book not found.'))
      .finally(() => setLoading(false))
    if (user) {
      libraryApi.progress(id).then((r) => setProgress(r.data.progress)).catch(() => {})
    }
  }, [id, user])

  const toggleSave = async () => {
    if (!user) { navigate('/student/login'); return }
    try {
      const { data } = await libraryApi.favorite(id)
      setProgress(data.progress)
      setMsg(data.progress.favorite ? 'Saved to your library' : 'Removed from saved')
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not update save')
    }
  }

  const download = async () => {
    if (!user) { navigate('/student/login'); return }
    try {
      const { data } = await libraryApi.download(id)
      const externalUrl = safeExternalUrl(data.pdfUrl)
      if (externalUrl) window.open(externalUrl, '_blank', 'noopener,noreferrer')
      else {
        const response = await libraryApi.pdf(id)
        openBlob(response.data, `${book?.title || 'book'}.pdf`)
      }
    } catch (err) {
      setMsg(err.response?.data?.message || 'Download not permitted')
    }
  }

  if (loading) return <div className="library-module"><div className="library-shell"><LibrarySkeleton count={4} /></div></div>
  if (error || !book) return <div className="library-module"><div className="library-shell"><LibraryState title="Book unavailable" message={error || 'This title is not available.'} action={<Link to="/library" className="library-btn library-btn-secondary">Back to library</Link>} /></div></div>

  const minutes = book.estimatedMinutes || (book.pages ? Math.round(book.pages * 1.5) : null)
  const license = book.license || {}

  return (
    <div className="library-module">
      <LibrarySeo
        title={`${book.title} | Dream Wave Library`}
        description={(book.description || book.subtitle || book.title).slice(0, 160)}
        canonical={`/library/books/${book._id}`}
      />
      <div className="library-shell">
        <Link to="/library" style={{ color: 'var(--lib-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>← Knowledge Center</Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,220px) 1fr', gap: 24, marginTop: 18 }} className="library-detail-grid">
          <div>
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="library-cover" style={{ width: '100%' }} />
            ) : (
              <div className="library-cover library-cover-fallback">{book.title[0]}</div>
            )}
          </div>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(1.5rem,3vw,2.2rem)' }}>{book.title}</h1>
            {book.subtitle && <p style={{ color: 'var(--lib-muted)', marginTop: 0 }}>{book.subtitle}</p>}
            <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--lib-muted)' }}>
              {[book.author, book.publisher, book.edition, book.publicationYear, book.language].filter(Boolean).join(' · ')}
            </p>
            <div className="library-chips" style={{ marginTop: 10 }}>
              <span className="library-chip active">{book.category}</span>
              {(book.tags || []).slice(0, 6).map((t) => <span key={t} className="library-chip">{t}</span>)}
            </div>
            <RightsBadge license={license} />
            <p style={{ lineHeight: 1.7, fontFamily: 'DM Sans, sans-serif', fontSize: '0.95rem' }}>{book.description || 'No description published.'}</p>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>
              {book.isbn && <div><dt style={{ color: 'var(--lib-muted)' }}>ISBN</dt><dd style={{ margin: 0 }}>{book.isbn}</dd></div>}
              {book.difficulty && <div><dt style={{ color: 'var(--lib-muted)' }}>Difficulty</dt><dd style={{ margin: 0 }}>{book.difficulty}</dd></div>}
              {book.pages ? <div><dt style={{ color: 'var(--lib-muted)' }}>Pages</dt><dd style={{ margin: 0 }}>{book.pages}</dd></div> : null}
              {minutes ? <div><dt style={{ color: 'var(--lib-muted)' }}>Est. reading</dt><dd style={{ margin: 0 }}>{minutes} min</dd></div> : null}
              {progress?.percent != null && <div><dt style={{ color: 'var(--lib-muted)' }}>Your progress</dt><dd style={{ margin: 0 }}>{Math.round(progress.percent)}%</dd></div>}
            </dl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <Link to={`/library/read/${book._id}`} className="library-btn library-btn-primary">
                {progress?.currentPage > 1 ? `Continue p.${progress.currentPage}` : 'Start reading'}
              </Link>
              <button type="button" className="library-btn library-btn-secondary" onClick={toggleSave}>
                {progress?.favorite ? 'Saved' : 'Save book'}
              </button>
              {license.allowDownload && (
                <button type="button" className="library-btn library-btn-secondary" onClick={download}>Download</button>
              )}
            </div>
            {msg && <p role="status" style={{ color: '#99F6E4' }}>{msg}</p>}
            {license.attribution && <div className="library-provenance"><strong>Legal access</strong><p>{license.attribution}</p>{license.sourceUrl && <a href={license.sourceUrl} target="_blank" rel="noreferrer">View source and rights</a>}</div>}
          </div>
        </div>

        {(book.tableOfContents || []).length > 0 && (
          <section className="library-section library-panel" style={{ marginTop: 28 }}>
            <h2>Table of contents</h2>
            <ol style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.8 }}>
              {book.tableOfContents.map((t, i) => (
                <li key={i}>{t.title}{t.page ? ` — p.${t.page}` : ''}</li>
              ))}
            </ol>
          </section>
        )}

        <KnowledgeTools book={book} />

        {related.length > 0 && (
          <section className="library-section">
            <h2>Related books</h2>
            <div className="library-grid">
              {related.map((b) => <BookCard key={b._id} book={b} />)}
            </div>
          </section>
        )}
      </div>
      <style>{`
        @media (max-width: 720px) {
          .library-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
