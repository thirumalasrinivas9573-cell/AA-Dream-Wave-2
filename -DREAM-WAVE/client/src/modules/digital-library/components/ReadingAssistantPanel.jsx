import { useState } from 'react'
import { libraryApi } from '@shared/services/api'
import { Button } from '@shared/components/ui'

export default function ReadingAssistantPanel({ bookId, currentPage, goalId }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [practice, setPractice] = useState(null)

  const ask = async (preset) => {
    const q = preset || question.trim()
    if (!q) return
    setLoading(true)
    setError('')
    try {
      const { data } = await libraryApi.readingAssistant(bookId, {
        question: q,
        currentPage,
        goalId,
      })
      setAnswer(data)
    } catch (err) {
      setError(err.userMessage || 'Reading assistant unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const loadPractice = async () => {
    setLoading(true)
    try {
      const { data } = await libraryApi.practiceQuestions(bookId, { focus: question || undefined })
      setPractice(data)
    } catch {
      setError('Could not generate practice questions.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="reading-assistant" aria-labelledby="reading-assistant-title">
      <header>
        <h3 id="reading-assistant-title">AI Reading Assistant</h3>
        <p>Answers are grounded in indexed document content when available.</p>
      </header>

      <div className="reading-assistant__quick">
        {[
          'Explain this concept in simpler terms',
          'Summarize this section',
          'What should I remember from this?',
          'Create revision questions',
        ].map((preset) => (
          <button key={preset} type="button" className="library-chip" onClick={() => ask(preset)} disabled={loading}>
            {preset}
          </button>
        ))}
      </div>

      <label className="reading-assistant__input">
        Your question
        <textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about the content you're reading…"
        />
      </label>

      <div className="reading-assistant__actions">
        <Button size="sm" disabled={loading} onClick={() => ask()}>{loading ? 'Thinking…' : 'Ask'}</Button>
        <Button size="sm" variant="ghost" disabled={loading} onClick={loadPractice}>Practice questions</Button>
      </div>

      {error && <p className="reading-assistant__error" role="alert">{error}</p>}

      {answer && (
        <article className="reading-assistant__answer">
          <p>{answer.answer}</p>
          {answer.generalNote && <p className="reading-assistant__general"><em>{answer.generalNote}</em></p>}
          {answer.citations?.length > 0 && (
            <ul>
              {answer.citations.map((c, i) => (
                <li key={i}>Page {c.page || '—'}: {c.excerpt}</li>
              ))}
            </ul>
          )}
          {!answer.sourceGrounded && (
            <small>Answer may use general knowledge — verify against the document.</small>
          )}
        </article>
      )}

      {practice?.questions?.length > 0 && (
        <section className="reading-assistant__practice">
          <h4>Practice questions {practice.aiGenerated && '(AI-generated)'}</h4>
          <ol>
            {practice.questions.map((item, i) => (
              <li key={i}>
                <strong>{item.question}</strong>
                {item.page && <small> · p.{item.page}</small>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  )
}
