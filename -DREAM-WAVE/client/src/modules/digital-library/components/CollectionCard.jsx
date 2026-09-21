import { Link } from 'react-router-dom'

export default function CollectionCard({ item }) {
  if (!item) return null
  const count = item.bookIds?.length || 0
  return (
    <Link to={`/library/collections/${item._id}`} className="library-card" style={{ minWidth: 200 }}>
      <div className="library-cover library-cover-fallback" style={{ aspectRatio: '16/9', fontSize: '0.9rem', padding: 12, textAlign: 'center' }}>
        {item.type || 'Collection'}
      </div>
      <div className="library-card-title">{item.title}</div>
      <div className="library-card-meta">{count} titles · {item.ownerType || 'platform'}</div>
    </Link>
  )
}
