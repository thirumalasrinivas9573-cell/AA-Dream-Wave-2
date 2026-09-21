import { Link } from 'react-router-dom'

const RIGHTS_LABELS = {
  'public-domain': 'Public domain',
  'open-educational-resource': 'Open resource',
  'institution-licensed': 'Institution licensed',
  'external-legal-source': 'External legal source',
  licensed: 'Licensed',
}

export function RightsBadge({ license, compact = false }) {
  if (!license?.type) return null
  return <span className={`library-rights ${compact ? 'library-rights--compact' : ''}`}>✓ {RIGHTS_LABELS[license.type] || license.type}</span>
}

export default function BookCard({ book, progress, onSave, saved }) {
  if (!book) return null
  const href = `/library/books/${book._id}`
  const pct = progress?.percent
  return (
    <article className="library-card">
      <Link to={href} className="library-card__link" aria-label={`${book.title} by ${book.author || 'Unknown'}`}>
        <div className="library-cover-wrap">
          {book.coverUrl ? (
            <img className="library-cover" src={book.coverUrl} alt={`Cover of ${book.title}`} loading="lazy" width="300" height="400" />
          ) : (
            <div className="library-cover library-cover-fallback" aria-hidden>{(book.title || '?')[0]}</div>
          )}
          <RightsBadge license={book.license} compact />
          {onSave && <button type="button" className={`library-save ${saved ? 'is-saved' : ''}`} onClick={(event) => { event.preventDefault(); onSave(book) }} aria-label={`${saved ? 'Remove' : 'Save'} ${book.title}`}>{saved ? '★' : '☆'}</button>}
        </div>
        <div className="library-card-title">{book.title}</div>
        <div className="library-card-meta">
          {book.author || 'Unknown author'}
          {book.category ? ` · ${book.category}` : ''}
        </div>
        <div className="library-card-signals">
          {book.difficulty && <span>{book.difficulty}</span>}
          {book.estimatedMinutes > 0 && <span>{book.estimatedMinutes} min</span>}
          {pct != null && <span>{Math.round(pct)}%</span>}
        </div>
        {pct != null && <div className="library-card-progress" aria-label={`${Math.round(pct)} percent read`}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>}
      </Link>
    </article>
  )
}

export function BookRow({ title, books, progressMap }) {
  if (!books?.length) return null
  return (
    <section className="library-section" aria-label={title}>
      <h2>{title}</h2>
      <div className="library-row">
        {books.map((b) => {
          const book = b.bookId || b
          const id = book._id || b.bookId
          return <BookCard key={id} book={book} progress={progressMap?.[id] || (b.percent != null ? b : null)} />
        })}
      </div>
    </section>
  )
}
