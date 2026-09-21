import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { libraryApi } from '@shared/services/api'
import BookCard from '../components/BookCard'
import LibrarySeo from '../components/LibrarySeo'
import '../styles/library.css'

export default function CollectionDetail() {
  const { id } = useParams()
  const [item, setItem] = useState(null)

  useEffect(() => {
    libraryApi.collection(id).then((r) => setItem(r.data.item)).catch(() => setItem(null))
  }, [id])

  if (!item) {
    return <div className="library-module"><div className="library-shell"><p style={{ color: 'var(--lib-muted)' }}>Loading collection…</p></div></div>
  }

  return (
    <div className="library-module">
      <LibrarySeo title={`${item.title} | Dream Wave Library`} description={item.description || item.title} canonical={`/library/collections/${item._id}`} />
      <div className="library-shell">
        <Link to="/library" style={{ color: 'var(--lib-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>← Knowledge Center</Link>
        <h1 style={{ margin: '12px 0 6px' }}>{item.title}</h1>
        <p style={{ color: 'var(--lib-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          {item.type} · {item.ownerType} · {(item.bookIds || []).length} titles
        </p>
        <p style={{ lineHeight: 1.7 }}>{item.description}</p>
        <div className="library-grid" style={{ marginTop: 20 }}>
          {(item.bookIds || []).map((b) => (b?._id ? <BookCard key={b._id} book={b} /> : null))}
        </div>
        {(item.bookIds || []).length === 0 && <div className="library-empty">This collection has no published books yet.</div>}
      </div>
    </div>
  )
}
