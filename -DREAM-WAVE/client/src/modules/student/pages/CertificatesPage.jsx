import { useState } from 'react'
import { ErrorState, LoadingState } from '@shared/components/ui'
import { profileApi } from '@shared/services/api'
import StudentLayout from '../layouts/StudentLayout'
import useStudentProfile from '../hooks/useStudentProfile'
import { CredentialGallery } from '../components/profile/ProfileWorkspace'
import { EntityDialog } from '../components/profile/ProfileDialogs'
import '../styles/profile.css'

export default function CertificatesPage() {
  const { profile, loading, error, setError, load, addItem, updateItem, deleteItem } = useStudentProfile()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [editor, setEditor] = useState(null)

  const save = async (payload) => {
    if (editor) await updateItem('credentials', editor._id, payload)
    else await addItem('credentials', payload)
  }
  const upload = async (file) => {
    const { data } = await profileApi.upload(file, 'credential')
    return data.asset.url
  }
  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return
    try {
      await deleteItem('credentials', item._id)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to delete certificate.')
    }
  }

  if (loading) return <StudentLayout><LoadingState label="Loading certificates…" rows={6} /></StudentLayout>
  if (error || !profile) return <StudentLayout><ErrorState title="Certificates unavailable" message={error || 'Your profile could not be loaded.'} onRetry={load} /></StudentLayout>

  return (
    <StudentLayout>
      <div className="identity-workspace">
        <header className="identity-page-header"><div><span>Evidence portfolio</span><h1>Certificates</h1><p>Import, categorize, search, preview and share learning credentials.</p></div></header>
        <div className="credential-toolbar">
          <label><span aria-hidden>⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search certificate, issuer or ID" aria-label="Search certificates" /></label>
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter certificate category"><option value="">All categories</option>{['academic','course','skill','competition','professional','other'].map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <CredentialGallery credentials={profile.credentials || []} query={query} category={category} onAdd={() => setEditor(false)} onEdit={setEditor} onDelete={remove} />
      </div>
      {editor !== null && <EntityDialog key={editor?._id || 'new-credential'} open section="credentials" item={editor || null} onClose={() => setEditor(null)} onSave={save} onUpload={upload} />}
    </StudentLayout>
  )
}
