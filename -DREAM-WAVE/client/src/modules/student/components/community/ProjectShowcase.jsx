export default function ProjectShowcase({ projects, onSelect }) {
  if (!projects.length) {
    return (
      <section className="community-panel">
        <header><div><span>Projects</span><h2>Project showcase</h2></div></header>
        <div className="community-empty-inline">
          <strong>No public projects yet</strong>
          <span>Add a project in your profile to showcase your work.</span>
        </div>
      </section>
    )
  }

  return (
    <section className="community-panel">
      <header><div><span>Projects</span><h2>Project showcase</h2></div></header>
      <div className="community-project-grid">
        {projects.map((project) => (
          <article key={project.id} className="community-project-card">
            <header>
              <div>
                <strong>{project.title}</strong>
                <small>{project.ownerName}</small>
              </div>
              <span>{project.status}</span>
            </header>
            <p>{project.description || 'Student project'}</p>
            <div className="community-tags">
              {(project.technologies || []).slice(0, 5).map((tech) => <span key={tech}>{tech}</span>)}
            </div>
            <footer>
              {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer">Demo</a>}
              {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer">Repository</a>}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelect?.(project)}>Details</button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}
