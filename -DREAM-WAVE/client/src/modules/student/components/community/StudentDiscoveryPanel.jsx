import { Link } from 'react-router-dom'

export default function StudentDiscoveryPanel({ students, onFollow }) {
  if (!students.length) {
    return (
      <section className="community-panel">
        <header><div><span>Discovery</span><h2>Discover students</h2></div></header>
        <div className="community-empty-inline">
          <strong>No discoverable students yet</strong>
          <span>Enable discoverability in profile privacy settings.</span>
        </div>
      </section>
    )
  }

  return (
    <section className="community-panel">
      <header><div><span>Discovery</span><h2>Discover students</h2></div></header>
      <div className="community-student-grid">
        {students.map((student) => (
          <article key={student.userId} className="community-student-card">
            <div className="community-author">
              {student.profilePhoto ? (
                <img src={student.profilePhoto} alt="" className="community-avatar" />
              ) : (
                <span className="community-avatar community-avatar--fallback">{student.displayName?.[0] || 'S'}</span>
              )}
              <div>
                <strong>{student.displayName}</strong>
                <small>{student.headline || `@${student.username}`}</small>
              </div>
            </div>
            <div className="community-tags">
              {(student.publicSkills || []).slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}
            </div>
            <footer>
              <span>{student.followerCount || 0} followers</span>
              <Link to={`/students/${student.username}`} className="btn btn-ghost btn-sm">Portfolio</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onFollow?.(student.userId)}>
                {student.isFollowing ? 'Following' : 'Follow'}
              </button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}
