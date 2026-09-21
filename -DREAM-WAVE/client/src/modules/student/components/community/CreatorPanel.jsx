export default function CreatorPanel({ stats }) {
  if (!stats) return null
  return (
    <section className="community-panel community-creator">
      <header><div><span>Creator</span><h2>Your learning content</h2></div></header>
      <dl className="community-creator-stats">
        <div><dt>Published</dt><dd>{stats.publishedPosts || 0}</dd></div>
        <div><dt>Reactions</dt><dd>{stats.reactions || 0}</dd></div>
        <div><dt>Comments</dt><dd>{stats.comments || 0}</dd></div>
        <div><dt>Saves</dt><dd>{stats.saves || 0}</dd></div>
        <div><dt>Views</dt><dd>{stats.views || 0}</dd></div>
      </dl>
    </section>
  )
}
