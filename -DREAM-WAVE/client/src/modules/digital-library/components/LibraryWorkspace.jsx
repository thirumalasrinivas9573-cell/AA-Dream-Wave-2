import { useEffect, useMemo, useRef, useState } from 'react'
import BookCard from './BookCard'

export function LibrarySkeleton({ count = 6 }) {
  return <div className="library-grid" aria-label="Loading books">{Array.from({ length: count }, (_, index) => <div className="library-book-skeleton" key={index}><span /><i /><i /></div>)}</div>
}

export function LibraryState({ title, message, action }) {
  return <div className="library-state"><span aria-hidden>⌑</span><h2>{title}</h2><p>{message}</p>{action}</div>
}

export function VirtualBookGrid({ books, progressMap, onSave, savedIds }) {
  const [visible, setVisible] = useState(24)
  const sentinel = useRef(null)
  useEffect(() => {
    setVisible(24)
  }, [books])
  useEffect(() => {
    if (!sentinel.current || visible >= books.length) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible((value) => Math.min(books.length, value + 24))
    }, { rootMargin: '300px' })
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [books.length, visible])
  return (
    <>
      <div className="library-grid">
        {books.slice(0, visible).map((book) => <BookCard key={book._id} book={book} progress={progressMap?.[book._id]} onSave={onSave} saved={savedIds?.has(book._id)} />)}
      </div>
      {visible < books.length && <div className="library-grid-sentinel" ref={sentinel} role="status">Loading more books…</div>}
    </>
  )
}

export function KnowledgeTools({ book }) {
  const tools = useMemo(() => [
    ['summary', 'Book summary', 'A concise, source-grounded overview'],
    ['chapter', 'Chapter summary', 'Understand the current chapter'],
    ['concepts', 'Key concepts', 'Extract the central ideas'],
    ['questions', 'Important questions', 'Prepare for assessments'],
    ['flashcards', 'Flashcards', 'Build active-recall practice'],
    ['quiz', 'Practice quiz', 'Test your understanding'],
    ['career', 'Career relevance', 'Connect knowledge to roles'],
    ['suggestions', 'Learning suggestions', 'Plan what to study next'],
  ], [])
  return (
    <section className="library-knowledge-tools" aria-labelledby="knowledge-tools-title">
      <header><div><span>AI-ready workspace</span><h2 id="knowledge-tools-title">Knowledge tools</h2></div><small>Architecture ready · no AI output generated</small></header>
      <div>
        {tools.map(([id, title, description]) => (
          <button type="button" key={id} disabled title="Available when the grounded AI knowledge service is enabled">
            <span aria-hidden>{id === 'flashcards' ? '▤' : id === 'quiz' ? '?' : '✦'}</span>
            <strong>{title}</strong>
            <small>{description}</small>
            <i>Coming soon</i>
          </button>
        ))}
      </div>
      <p>Future tools will use approved content extraction and citations from <strong>{book?.title || 'this book'}</strong>.</p>
    </section>
  )
}

export function LibraryInsights({ dashboard }) {
  const stats = [
    ['Books started', dashboard.booksStarted || 0],
    ['Completed', dashboard.booksCompleted || 0],
    ['Pages this week', dashboard.pagesReadWeek || 0],
    ['Reading streak', `${dashboard.currentStreak || 0} days`],
    ['Reading time', `${dashboard.minutesMonth || 0} min/month`],
    ['Annotations', dashboard.annotationCount || 0],
  ]
  return <section className="library-insights" aria-label="Reading insights">{stats.map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>
}
