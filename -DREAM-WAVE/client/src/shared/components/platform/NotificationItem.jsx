import { Link } from 'react-router-dom'

const CATEGORY_LABELS = {
  goal: 'Academic', milestone: 'Academic', roadmap: 'Academic', task: 'Task',
  reminder: 'Reminder', library: 'Library', book: 'Library', job: 'Career', internship: 'Career',
  career: 'Career', certificate: 'Certificate', ai: 'AI', academic: 'Academic',
  report: 'Report', system: 'System', approval: 'System', 'in-app': 'System',
}

export default function NotificationItem({ item, archivedView, onRead, onArchive, onRestore, onPin, onDelete, onPriority }) {
  const category = CATEGORY_LABELS[item.type] || item.type
  return <article className={`platform-notification ${!item.read ? 'is-unread' : ''} ${item.pinnedAt ? 'is-pinned' : ''} platform-notification--${item.priority || 'normal'}`}>
    <span className="platform-notification__dot" aria-hidden />
    <div className="platform-notification__body">
      <header><strong>{item.title}</strong><span>{category}</span></header>
      {item.body && <p>{item.body}</p>}
      <footer><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>{item.link && <Link to={item.link}>Open</Link>}{!item.read && <button type="button" onClick={() => onRead(item._id)}>Mark read</button>}</footer>
    </div>
    <div className="platform-notification__actions">
      <button type="button" onClick={() => onPin(item._id, !item.pinnedAt)} aria-label={`${item.pinnedAt ? 'Unpin' : 'Pin'} ${item.title}`}>{item.pinnedAt ? '★' : '☆'}</button>
      <select value={item.priority || 'normal'} onChange={(event) => onPriority(item._id, event.target.value)} aria-label={`Priority for ${item.title}`}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
      {archivedView ? <button type="button" onClick={() => onRestore(item._id)}>Restore</button> : <button type="button" onClick={() => onArchive(item._id)}>Archive</button>}
      <button type="button" onClick={() => onDelete(item._id)} aria-label={`Delete ${item.title}`}>Delete</button>
    </div>
  </article>
}
