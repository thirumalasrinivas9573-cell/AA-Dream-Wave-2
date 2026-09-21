export default function ExperiencePanel({ entries = [], onAdd, onEdit, onDelete, publicView = false }) {
  if (!entries.length && publicView) return null
  return (
    <section className="identity-panel">
      <header>
        <div><span>Professional experience</span><h2>Experience</h2></div>
        {!publicView && <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>+ Add experience</button>}
      </header>
      {!entries.length ? (
        <div className="identity-empty-inline"><strong>No experience added</strong><span>Include internships, research, volunteer work or leadership roles.</span></div>
      ) : (
        <ol className="achievement-timeline">
          {entries.map((entry) => (
            <li key={entry._id}>
              <span>💼</span>
              <div>
                <time>{entry.startDate ? new Date(entry.startDate).toLocaleDateString() : 'Experience'}{entry.current ? ' – Present' : entry.endDate ? ` – ${new Date(entry.endDate).toLocaleDateString()}` : ''}</time>
                <h3>{entry.title}</h3>
                <small>{entry.type}{entry.organization ? ` · ${entry.organization}` : ''}</small>
                <p>{entry.description}</p>
                {!publicView && (
                  <footer>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(entry)}>Edit</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDelete(entry)}>Delete</button>
                  </footer>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
