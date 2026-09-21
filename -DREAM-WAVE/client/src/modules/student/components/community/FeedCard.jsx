const POST_TYPE_LABELS = {
  GENERAL: 'General',
  LEARNING_UPDATE: 'Learning',
  PROJECT: 'Project',
  QUESTION: 'Question',
  RESOURCE: 'Resource',
  ACHIEVEMENT: 'Achievement',
  COLLABORATION: 'Collaboration',
  CAREER_UPDATE: 'Career',
}

export function timeAgo(date) {
  const seconds = Date.now() - new Date(date).getTime()
  if (seconds < 60000) return 'just now'
  if (seconds < 3600000) return `${Math.floor(seconds / 60000)}m ago`
  if (seconds < 86400000) return `${Math.floor(seconds / 3600000)}h ago`
  return `${Math.floor(seconds / 86400000)}d ago`
}

export default function FeedCard({
  post,
  onLike,
  onBookmark,
  onDelete,
  onOpenComments,
  onReport,
  onCreateTask,
  currentUserId,
}) {
  const author = post.author || {}
  const isMine = String(post.userId) === String(currentUserId)
  const typeLabel = POST_TYPE_LABELS[post.postType] || post.tag || 'Post'

  return (
    <article className="community-feed-card">
      <header>
        <div className="community-author">
          {author.photo ? (
            <img src={author.photo} alt="" className="community-avatar" />
          ) : (
            <span className="community-avatar community-avatar--fallback">{author.initials || '?'}</span>
          )}
          <div>
            <strong>{author.name || 'Student'}</strong>
            {author.headline && <small>{author.headline}</small>}
          </div>
        </div>
        <div className="community-feed-meta">
          <span className="community-badge">{typeLabel}</span>
          <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
        </div>
      </header>

      {post.feedReason && <p className="community-feed-reason">{post.feedReason}</p>}
      <p className="community-feed-content">{post.content}</p>

      {(post.topics?.length > 0 || post.skills?.length > 0) && (
        <div className="community-tags">
          {[...(post.topics || []), ...(post.skills || [])].slice(0, 8).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      {post.media?.length > 0 && (
        <div className="community-media-grid">
          {post.media.map((item) => (
            item.type === 'video' ? (
              <video key={item.url} controls preload="metadata" poster="" className="community-media-item">
                <source src={item.url} type={item.mimeType || 'video/mp4'} />
              </video>
            ) : (
              <img key={item.url} src={item.url} alt="" loading="lazy" className="community-media-item" />
            )
          ))}
        </div>
      )}

      <footer>
        <button type="button" className={post.likedByMe ? 'is-active' : ''} onClick={() => onLike(post._id)} aria-pressed={post.likedByMe}>
          {post.likedByMe ? 'Liked' : 'Like'} · {post.likeCount || 0}
        </button>
        <button type="button" onClick={() => onOpenComments(post)}>Comments · {post.commentCount || 0}</button>
        <button type="button" className={post.savedByMe ? 'is-active' : ''} onClick={() => onBookmark(post._id)} aria-pressed={post.savedByMe}>
          {post.savedByMe ? 'Saved' : 'Save'}
        </button>
        <button type="button" onClick={() => onCreateTask(post)}>Add task</button>
        {isMine ? (
          <button type="button" className="danger" onClick={() => onDelete(post._id)}>Delete</button>
        ) : (
          <button type="button" onClick={() => onReport(post)}>Report</button>
        )}
      </footer>
    </article>
  )
}
