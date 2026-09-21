import { useCallback, useEffect, useState } from 'react'
import { libraryApi } from '@shared/services/api'

export function KnowledgeTools({ book, onResult }) {
  const [loading, setLoading] = useState('')
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(null)

  const bookId = book?._id

  useEffect(() => {
    if (!bookId) return
    libraryApi.documentStatus(bookId)
      .then((r) => setProcessing(r.data.processing))
      .catch(() => {})
  }, [bookId])

  const runTool = useCallback(async (mode, focus = '') => {
    if (!bookId) return
    setLoading(mode)
    setResult(null)
    try {
      if (mode === 'reading-assistant') {
        onResult?.({ mode: 'assistant' })
        return
      }
      const { data } = await libraryApi.ai(bookId, mode, focus)
      setResult({ mode, data })
      onResult?.({ mode, data })
    } catch {
      setResult({ mode, error: 'Tool unavailable. Try again later.' })
    } finally {
      setLoading('')
    }
  }, [bookId, onResult])

  const tools = [
    ['summary', 'Book summary', 'Concise overview'],
    ['keypoints', 'Key concepts', 'Core ideas to remember'],
    ['questions', 'Practice questions', 'Self-check understanding'],
    ['flashcards', 'Flashcards', 'Active recall cards'],
    ['roadmap', 'Study roadmap', 'Suggested learning sequence'],
    ['explain', 'Explain concept', 'Simpler explanation'],
  ]

  return (
    <section className="library-knowledge-tools" aria-labelledby="knowledge-tools-title">
      <header>
        <div>
          <span>Grounded study tools</span>
          <h2 id="knowledge-tools-title">Knowledge tools</h2>
        </div>
        {processing && (
          <small>
            Document index: {processing.status}
            {processing.chunkCount ? ` · ${processing.chunkCount} chunks` : ''}
          </small>
        )}
      </header>
      <div>
        {tools.map(([id, title, description]) => (
          <button type="button" key={id} disabled={Boolean(loading)} onClick={() => runTool(id)}>
            <span aria-hidden>✦</span>
            <strong>{title}</strong>
            <small>{description}</small>
            {loading === id && <i>Generating…</i>}
          </button>
        ))}
        <button type="button" onClick={() => runTool('reading-assistant')}>
          <span aria-hidden>💬</span>
          <strong>Reading assistant</strong>
          <small>Ask questions about this resource</small>
        </button>
      </div>
      {result?.error && <p role="alert">{result.error}</p>}
      {result?.data?.summary && <article className="library-ai-result"><h3>Summary</h3><p>{result.data.summary}</p></article>}
      {result?.data?.keyPoints && (
        <article className="library-ai-result">
          <h3>Key points</h3>
          <ul>{result.data.keyPoints.map((p) => <li key={p}>{p}</li>)}</ul>
        </article>
      )}
      {result?.data?.questions && (
        <article className="library-ai-result">
          <h3>Questions</h3>
          <ol>{result.data.questions.map((q) => <li key={q.question}><strong>{q.question}</strong></li>)}</ol>
        </article>
      )}
      {result?.data?.flashcards && (
        <article className="library-ai-result">
          <h3>Flashcards</h3>
          {result.data.flashcards.map((c) => <p key={c.question}><strong>{c.question}</strong><br />{c.answer}</p>)}
        </article>
      )}
      {result?.data?.explanation && <article className="library-ai-result"><h3>Explanation</h3><p>{result.data.explanation}</p></article>}
    </section>
  )
}

export function GoalResourcePanel({ goalId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!goalId) return
    setLoading(true)
    libraryApi.goalResources(goalId)
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [goalId])

  if (loading) return <p className="library-muted">Loading recommended resources…</p>
  if (!items.length) return <p className="library-muted">No library matches yet. Add goals with clear topics to get recommendations.</p>

  return (
    <ul className="library-goal-resources">
      {items.map(({ book, explanation, url }) => (
        <li key={book._id}>
          <strong>{book.title}</strong>
          <small>{book.author} · {book.category}</small>
          <p>{explanation}</p>
          <a href={url}>Open resource</a>
        </li>
      ))}
    </ul>
  )
}

export function MyLibrarySections({ library }) {
  if (!library) return null
  const sections = [
    ['Continue reading', library.reading],
    ['Saved', library.saved],
    ['Completed', library.completed],
    ['Your uploads', library.uploaded?.map((b) => ({ bookId: b }))],
    ['Recently viewed', library.recentlyViewed],
  ]
  return (
    <div className="my-library-sections">
      {sections.map(([title, items]) => items?.length > 0 && (
        <section key={title}>
          <h2>{title}</h2>
          <ul>
            {items.slice(0, 6).map((entry) => {
              const book = entry.bookId || entry
              const id = book._id || entry.bookId?._id
              return (
                <li key={id}>
                  <a href={`/library/books/${id}`}>{book.title || 'Resource'}</a>
                  {entry.percent != null && <small>{Math.round(entry.percent)}%</small>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
