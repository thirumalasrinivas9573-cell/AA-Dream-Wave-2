import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { libraryApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import LibrarySeo from '../components/LibrarySeo'
import '../styles/library.css'

/**
 * Institution / Company library publishing desk.
 * Lives in the Digital Library module (not portal shells) so portal architectures stay unchanged.
 */
export default function OrgLibraryDesk() {
  const { user } = useAuth()
  const [books, setBooks] = useState([])
  const [collections, setCollections] = useState([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [bookForm, setBookForm] = useState({
    title: '', author: '', category: 'Programming', description: '', pdfUrl: '', coverUrl: '',
    license: { type: 'institution-licensed', attribution: '', sourceUrl: '', licenseUrl: '', rightsHolder: '', allowDownload: false, allowPrint: false },
  })
  const [colForm, setColForm] = useState({ title: '', description: '', type: 'course', bookIds: '' })

  const load = () => {
    libraryApi.orgBooks().then((r) => setBooks(r.data.items || [])).catch(() => setBooks([]))
    libraryApi.orgCollections().then((r) => setCollections(r.data.items || [])).catch(() => setCollections([]))
  }

  useEffect(() => {
    if (user && ['institution', 'company', 'admin'].includes(user.role)) load()
  }, [user])

  if (!user || !['institution', 'company', 'admin'].includes(user.role)) {
    return (
      <div className="library-module">
        <div className="library-shell">
          <p style={{ color: 'var(--lib-muted)' }}>Sign in as an institution or company to publish reading lists and licensed resources.</p>
          <Link to="/institution/login" className="library-btn library-btn-secondary">Institution login</Link>{' '}
          <Link to="/company/login" className="library-btn library-btn-secondary">Company login</Link>
        </div>
      </div>
    )
  }

  const createBook = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await libraryApi.createBook(bookForm)
      setMsg('Resource submitted for legal provenance review. Verified titles appear publicly.')
      setBookForm({ ...bookForm, title: '', author: '', description: '', pdfUrl: '', coverUrl: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create book')
    }
  }

  const createCollection = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await libraryApi.createCollection({
        ...colForm,
        bookIds: colForm.bookIds.split(',').map((s) => s.trim()).filter(Boolean),
      })
      setMsg('Collection published')
      setColForm({ title: '', description: '', type: user.role === 'company' ? 'company' : 'institution', bookIds: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create collection')
    }
  }

  return (
    <div className="library-module">
      <LibrarySeo title="Publish to Knowledge Center | Dream Wave" canonical="/library/org" />
      <div className="library-shell">
        <Link to="/library" style={{ color: 'var(--lib-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>← Knowledge Center</Link>
        <h1 style={{ margin: '10px 0' }}>Library publishing desk</h1>
        <p style={{ color: 'var(--lib-muted)', fontFamily: 'DM Sans, sans-serif' }}>
          {user.role === 'institution' && 'Recommend books, reading lists, and subject collections for students.'}
          {user.role === 'company' && 'Share technical resources, internship prep guides, and employee learning material.'}
          {user.role === 'admin' && 'Platform publishing for licensed / legally available titles only.'}
        </p>
        {msg && <p role="status" style={{ color: '#99F6E4' }}>{msg}</p>}
        {error && <p role="alert" style={{ color: '#F87171' }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 20 }}>
          <form className="library-panel" onSubmit={createBook}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Add licensed book</h2>
            {['title', 'author', 'category', 'pdfUrl', 'coverUrl'].map((k) => (
              <label key={k} style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
                {k}
                <input required={k === 'title' || k === 'pdfUrl'} className="library-input" style={{ width: '100%', marginTop: 4 }} value={bookForm[k]} onChange={(e) => setBookForm({ ...bookForm, [k]: e.target.value })} />
              </label>
            ))}
            <label style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
              description
              <textarea className="library-input" style={{ width: '100%', marginTop: 4 }} rows={3} value={bookForm.description} onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
              rights basis
              <select className="library-input" style={{ width: '100%', marginTop: 4 }} value={bookForm.license.type} onChange={(e) => setBookForm({ ...bookForm, license: { ...bookForm.license, type: e.target.value } })}>
                <option value="institution-licensed">Institution licensed</option>
                <option value="public-domain">Public domain</option>
                <option value="open-educational-resource">Open Educational Resource</option>
                <option value="external-legal-source">External legal source</option>
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
              license attribution
              <input required className="library-input" style={{ width: '100%', marginTop: 4 }} value={bookForm.license.attribution} onChange={(e) => setBookForm({ ...bookForm, license: { ...bookForm.license, attribution: e.target.value } })} />
            </label>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
              legal source URL
              <input required={bookForm.license.type !== 'institution-licensed'} type="url" className="library-input" style={{ width: '100%', marginTop: 4 }} value={bookForm.license.sourceUrl} onChange={(e) => setBookForm({ ...bookForm, license: { ...bookForm.license, sourceUrl: e.target.value } })} />
            </label>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
              rights holder
              <input className="library-input" style={{ width: '100%', marginTop: 4 }} value={bookForm.license.rightsHolder} onChange={(e) => setBookForm({ ...bookForm, license: { ...bookForm.license, rightsHolder: e.target.value } })} />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={bookForm.license.allowDownload} onChange={(e) => setBookForm({ ...bookForm, license: { ...bookForm.license, allowDownload: e.target.checked } })} />
              Allow download
            </label>
            <button type="submit" className="library-btn library-btn-primary" style={{ marginTop: 12 }}>Publish book</button>
          </form>

          <form className="library-panel" onSubmit={createCollection}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Create collection / reading list</h2>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
              title
              <input required className="library-input" style={{ width: '100%', marginTop: 4 }} value={colForm.title} onChange={(e) => setColForm({ ...colForm, title: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
              description
              <textarea className="library-input" style={{ width: '100%', marginTop: 4 }} rows={3} value={colForm.description} onChange={(e) => setColForm({ ...colForm, description: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 8, fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem' }}>
              book IDs (comma-separated)
              <input className="library-input" style={{ width: '100%', marginTop: 4 }} value={colForm.bookIds} onChange={(e) => setColForm({ ...colForm, bookIds: e.target.value })} placeholder="Paste book _id values from your list" />
            </label>
            <button type="submit" className="library-btn library-btn-primary" style={{ marginTop: 12 }}>Publish collection</button>
          </form>
        </div>

        <section className="library-section" style={{ marginTop: 28 }}>
          <h2>Your books ({books.length})</h2>
          {books.length === 0 ? <div className="library-empty">No books published yet.</div> : (
            <ul style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.8 }}>
              {books.map((b) => (
                <li key={b._id}>
                  <Link to={`/library/books/${b._id}`} style={{ color: '#99F6E4' }}>{b.title}</Link>
                  <span style={{ color: 'var(--lib-muted)' }}> — {b._id}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="library-section">
          <h2>Your collections ({collections.length})</h2>
          {collections.length === 0 ? <div className="library-empty">No collections yet.</div> : (
            <ul style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.8 }}>
              {collections.map((c) => (
                <li key={c._id}>
                  <Link to={`/library/collections/${c._id}`} style={{ color: '#99F6E4' }}>{c.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
