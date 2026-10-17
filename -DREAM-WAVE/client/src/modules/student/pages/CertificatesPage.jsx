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

  if (loading)
    return (
      <StudentLayout>
        <LoadingState label="Loading certificates…" rows={6} />
      </StudentLayout>
    )

  if (error || !profile)
    return (
      <StudentLayout>
        <ErrorState title="Certificates unavailable" message={error || 'Your profile could not be loaded.'} onRetry={load} />
      </StudentLayout>
    )

  return (
    <StudentLayout>
      <div className="flex flex-col gap-6 w-full">
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-brand-primary uppercase">
              EVIDENCE & PORTFOLIO
            </span>
            <h1 className="text-3xl font-heading font-bold text-content-heading tracking-tight mt-1">
              Certificates & Credentials
            </h1>
            <p className="text-sm text-content-muted">
              Import, categorize, search, preview, and share your verified learning credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditor(false)}
            className="h-10 px-5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all flex items-center gap-2 self-start md:self-auto shadow-md shadow-brand-primary/25"
          >
            <span className="material-symbols-outlined text-[18px]">add_verified_user</span>
            <span>Add Certificate</span>
          </button>
        </header>

        {/* Toolbar: Search & Filter */}
        <div className="p-4 rounded-stitch bg-surface border border-divider shadow-xs flex flex-wrap md:flex-nowrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[18px] text-content-muted">
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search certificate title, issuer, or ID..."
              aria-label="Search certificates"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-canvas border border-divider text-xs font-medium text-content-heading placeholder:text-content-muted focus:outline-none focus:border-brand-primary transition-all"
            />
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter certificate category"
            className="h-10 px-4 rounded-xl bg-canvas border border-divider text-xs font-semibold text-content-heading focus:outline-none focus:border-brand-primary transition-all shrink-0 cursor-pointer"
          >
            <option value="">All Categories</option>
            {['academic', 'course', 'skill', 'competition', 'professional', 'other'].map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Credential Gallery */}
        <div className="rounded-stitch bg-surface border border-divider p-6 shadow-xs">
          <CredentialGallery
            credentials={profile.credentials || []}
            query={query}
            category={category}
            onAdd={() => setEditor(false)}
            onEdit={setEditor}
            onDelete={remove}
          />
        </div>
      </div>

      {editor !== null && (
        <EntityDialog
          key={editor?._id || 'new-credential'}
          open
          section="credentials"
          item={editor || null}
          onClose={() => setEditor(null)}
          onSave={save}
          onUpload={upload}
        />
      )}
    </StudentLayout>
  )
}
