const LEVELS = {
  school: 'School',
  intermediate: 'Intermediate / Higher Secondary',
  diploma: 'Diploma',
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
  other: 'Other',
}

export default function AcademicJourneyPanel({ entries = [], onAdd, onEdit, onDelete, publicView = false }) {
  if (!entries.length && publicView) return null
  return (
    <section className="identity-panel">
      <header>
        <div><span>Education timeline</span><h2>Academic journey</h2></div>
        {!publicView && <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>+ Add education</button>}
      </header>
      {!entries.length ? (
        <div className="identity-empty-inline"><strong>No academic entries yet</strong><span>Add school, diploma, undergraduate or postgraduate milestones.</span></div>
      ) : (
        <ol className="achievement-timeline">
          {entries.map((entry) => (
            <li key={entry._id}>
              <span>🎓</span>
              <div>
                <time>{entry.startYear || '—'}{entry.endYear ? ` – ${entry.endYear}` : ''}</time>
                <h3>{entry.institution}</h3>
                <small>{LEVELS[entry.level] || entry.level}{entry.program ? ` · ${entry.program}` : ''}{entry.specialization ? ` · ${entry.specialization}` : ''}</small>
                <p>{entry.status === 'in-progress' ? 'Currently studying' : entry.status}</p>
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
