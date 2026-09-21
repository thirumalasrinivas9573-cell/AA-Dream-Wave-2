import { useEffect, useState } from 'react'
import { communityApi } from '@shared/services/api'
import { timeAgo } from './FeedCard'

export default function CommentsPanel({ post, onClose }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!post?._id) return
    setLoading(true)
    communityApi.getComments(post._id)
      .then((response) => setComments(response.data.comments || []))
      .catch(() => setError('Unable to load comments.'))
      .finally(() => setLoading(false))
  }, [post?._id])

  const submit = async (event) => {
    event.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const { data } = await communityApi.addComment(post._id, { content: content.trim() })
      setComments((current) => [...current, data.comment])
      setContent('')
    } catch (err) {
      setError(err.userMessage || 'Unable to add comment.')
    } finally {
      setSubmitting(false)
    }
  }

  const removeComment = async (commentId) => {
    await communityApi.deleteComment(post._id, commentId)
    setComments((current) => current.filter((comment) => comment._id !== commentId))
  }

  return (
    <div className="community-modal" role="dialog" aria-modal="true" aria-label="Comments">
      <div className="community-modal-backdrop" onClick={onClose} />
      <section className="community-modal-panel">
        <header>
          <div>
            <strong>Comments</strong>
            <p>{post?.author?.name || 'Post'} · {timeAgo(post?.createdAt)}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </header>

        <div className="community-comments-list">
          {loading ? (
            [...Array(3)].map((_, index) => <div key={index} className="skeleton" style={{ height: 64 }} />)
          ) : comments.length === 0 ? (
            <p className="community-empty-inline">No comments yet. Start the discussion.</p>
          ) : comments.map((comment) => (
            <article key={comment._id} className="community-comment">
              <div>
                <strong>{comment.authorName || 'Student'}</strong>
                <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
              </div>
              <p>{comment.content}</p>
              {comment.isMine && (
                <button type="button" className="danger-link" onClick={() => removeComment(comment._id)}>Delete</button>
              )}
            </article>
          ))}
        </div>

        <form onSubmit={submit} className="community-comment-form">
          <textarea
            className="textarea"
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Add a helpful response"
            aria-label="Comment"
          />
          {error && <p className="community-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !content.trim()}>
            {submitting ? 'Posting…' : 'Comment'}
          </button>
        </form>
      </section>
    </div>
  )
}
