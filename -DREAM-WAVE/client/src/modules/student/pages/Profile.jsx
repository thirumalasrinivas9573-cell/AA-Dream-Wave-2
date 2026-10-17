import { useEffect, useState } from 'react'
import { useAuth } from '@shared/context/AuthContext'
import { profileApi } from '@shared/services/api'
import { Button, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import useStudentProfile from '../hooks/useStudentProfile'
import {
  AcademicProfile,
  AchievementTimeline,
  CareerDirectionPanel,
  CredentialGallery,
  KnowledgeGraph,
  LearningStats,
  PortfolioReadiness,
  PROFILE_TABS,
  ProfileHero,
  ProjectPortfolio,
  SkillsProfile,
} from '../components/profile/ProfileWorkspace'
import AcademicJourneyPanel from '../components/profile/AcademicJourneyPanel'
import ExperiencePanel from '../components/profile/ExperiencePanel'
import ProfileAssistantPanel from '../components/profile/ProfileAssistantPanel'
import PortfolioCustomizer from '../components/profile/PortfolioCustomizer'
import PublicPreviewPanel from '../components/profile/PublicPreviewPanel'
import { EntityDialog, ProfileEditDialog } from '../components/profile/ProfileDialogs'
import '../styles/profile.css'

export default function Profile() {
  const { updateUser } = useAuth()
  const { user, profile, summary, loading, error, setError, load, update, addItem, updateItem, deleteItem, setProfile } = useStudentProfile()
  const [tab, setTab] = useState('overview')
  const [editingProfile, setEditingProfile] = useState(false)
  const [entityEditor, setEntityEditor] = useState(null)
  const [uploading, setUploading] = useState('')
  const [graph, setGraph] = useState(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [completeness, setCompleteness] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [shareMessage, setShareMessage] = useState('')

  useEffect(() => {
    profileApi.completeness().then((response) => setCompleteness(response.data.completeness)).catch(() => {})
  }, [profile?.revision])

  useEffect(() => {
    if (tab !== 'graph' || graph) return
    setGraphLoading(true)
    profileApi
      .graph()
      .then((response) => setGraph(response.data.graph))
      .catch((requestError) => setError(requestError.userMessage || 'Unable to load knowledge graph.'))
      .finally(() => setGraphLoading(false))
  }, [graph, setError, tab])

  const saveProfile = async (payload) => {
    const next = await update(payload)
    updateUser({ name: next.displayName, profileImage: next.profilePhoto })
  }

  const upload = async (file, purpose) => {
    if (!file) return ''
    setUploading(purpose)
    setError('')
    try {
      const { data } = await profileApi.upload(file, purpose)
      if (purpose === 'profile-photo') {
        setProfile((current) => ({ ...current, profilePhoto: data.asset.url }))
        updateUser({ profileImage: data.asset.url })
      }
      if (purpose === 'cover-banner') setProfile((current) => ({ ...current, coverBanner: data.asset.url }))
      return data.asset.url
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || 'Upload failed.')
      return ''
    } finally {
      setUploading('')
    }
  }

  const openEntity = (section, item = null) => setEntityEditor({ section, item })
  const saveEntity = async (payload) => {
    if (entityEditor.item) await updateItem(entityEditor.section, entityEditor.item._id, payload)
    else await addItem(entityEditor.section, payload)
    setGraph(null)
  }
  const removeEntity = async (section, item) => {
    if (!window.confirm(`Delete “${item.title || item.name || item.institution}” from your profile?`)) return
    try {
      await deleteItem(section, item._id)
      setGraph(null)
    } catch (requestError) {
      setError(requestError.userMessage || `Unable to delete ${section}.`)
    }
  }

  const shareProfile = async () => {
    try {
      const { data } = await profileApi.share()
      await navigator.clipboard?.writeText(data.share.url)
      setShareMessage('Portfolio link copied.')
    } catch (requestError) {
      setShareMessage(requestError.userMessage || 'Unable to copy portfolio link.')
    }
  }

  if (loading)
    return (
      <StudentLayout>
        <LoadingState label="Loading your digital identity…" rows={7} />
      </StudentLayout>
    )

  if (error && (!profile || !user))
    return (
      <StudentLayout>
        <ErrorState title="Profile unavailable" message={error} onRetry={load} />
      </StudentLayout>
    )

  return (
    <StudentLayout>
      <div className="flex flex-col gap-6 w-full">
        {error && <ErrorState title="Profile action failed" message={error} onRetry={() => setError('')} />}
        {shareMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold" role="status">
            {shareMessage}
          </div>
        )}

        <ProfileHero
          user={user}
          profile={profile}
          onEdit={() => setEditingProfile(true)}
          onUpload={upload}
          uploading={uploading}
          onPreview={() => setPreviewOpen(true)}
          onShare={shareProfile}
        />

        {/* Responsive Tab Bar */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-divider" role="tablist" aria-label="Profile sections">
          {PROFILE_TABS.map(([id, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                tab === id
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-content-muted hover:text-content-heading'
              }`}
              onClick={() => setTab(id)}
              key={id}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <>
            <LearningStats summary={summary} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2 p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
                <header className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">ABOUT</span>
                    <h2 className="font-heading font-bold text-lg text-content-heading">Digital Identity</h2>
                  </div>
                  <Button variant="ghost" onClick={() => setEditingProfile(true)}>
                    Edit
                  </Button>
                </header>
                <p className="text-xs text-content-body leading-relaxed">
                  {profile.bio || 'Tell the Dream Wave community about your learning journey.'}
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                  <div className="p-3 rounded-xl bg-canvas border border-divider">
                    <dt className="text-content-muted font-medium">Email</dt>
                    <dd className="font-semibold text-content-heading mt-0.5">{user.email}</dd>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-divider">
                    <dt className="text-content-muted font-medium">Phone</dt>
                    <dd className="font-semibold text-content-heading mt-0.5">{user.phone || 'Not added'}</dd>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-divider">
                    <dt className="text-content-muted font-medium">Languages</dt>
                    <dd className="font-semibold text-content-heading mt-0.5">{profile.languages?.join(', ') || 'Not added'}</dd>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-divider">
                    <dt className="text-content-muted font-medium">Dream Wave ID</dt>
                    <dd className="font-semibold text-brand-primary mt-0.5">{user.aaid}</dd>
                  </div>
                </dl>
              </section>
              <PortfolioReadiness profile={profile} completeness={completeness} />
            </div>
            <ProfileAssistantPanel profile={profile} onApply={saveProfile} />
            <CareerDirectionPanel careerDirection={profile.careerDirection} onEdit={() => setEditingProfile(true)} />
            <SkillsProfile
              skills={profile.skills.slice(0, 8)}
              onAdd={() => openEntity('skills')}
              onEdit={(item) => openEntity('skills', item)}
              onDelete={(item) => removeEntity('skills', item)}
            />
            <ProjectPortfolio
              projects={
                profile.projects.filter((item) => item.featured).slice(0, 4).length
                  ? profile.projects.filter((item) => item.featured).slice(0, 4)
                  : profile.projects.slice(0, 4)
              }
              onAdd={() => openEntity('projects')}
              onEdit={(item) => openEntity('projects', item)}
              onDelete={(item) => removeEntity('projects', item)}
            />
          </>
        )}

        {tab === 'academic' && (
          <>
            <AcademicJourneyPanel
              entries={profile.academicJourney || []}
              onAdd={() => openEntity('academicJourney')}
              onEdit={(item) => openEntity('academicJourney', item)}
              onDelete={(item) => removeEntity('academicJourney', item)}
            />
            <AcademicProfile academic={profile.academic} />
          </>
        )}

        {tab === 'experience' && (
          <ExperiencePanel
            entries={profile.experience || []}
            onAdd={() => openEntity('experience')}
            onEdit={(item) => openEntity('experience', item)}
            onDelete={(item) => removeEntity('experience', item)}
          />
        )}

        {tab === 'learning' && (
          <>
            <LearningStats summary={summary} />
            <section className="p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
              <header>
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">PROGRESS SUMMARY</span>
                <h2 className="font-heading font-bold text-lg text-content-heading">Learning Profile</h2>
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['Goal Completion', summary?.goals?.total ? (summary.goals.completed / summary.goals.total) * 100 : 0],
                  ['Task Completion', summary?.tasks?.total ? (summary.tasks.completed / summary.tasks.total) * 100 : 0],
                  ['Books Completed', summary?.books?.started ? (summary.books.read / summary.books.started) * 100 : 0],
                  ['Roadmap Completion', summary?.roadmaps?.total ? (summary.roadmaps.completed / summary.roadmaps.total) * 100 : 0],
                ].map(([label, value]) => (
                  <div key={label} className="p-4 rounded-xl bg-canvas border border-divider space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-content-muted">{label}</span>
                      <strong className="font-bold text-brand-primary">{Math.round(value)}%</strong>
                    </div>
                    <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                      <div className="bg-brand-primary h-full rounded-full transition-all duration-300" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'skills' && (
          <SkillsProfile
            skills={profile.skills}
            onAdd={() => openEntity('skills')}
            onEdit={(item) => openEntity('skills', item)}
            onDelete={(item) => removeEntity('skills', item)}
          />
        )}

        {tab === 'projects' && (
          <ProjectPortfolio
            projects={profile.projects}
            onAdd={() => openEntity('projects')}
            onEdit={(item) => openEntity('projects', item)}
            onDelete={(item) => removeEntity('projects', item)}
          />
        )}

        {tab === 'credentials' && (
          <CredentialGallery
            credentials={profile.credentials}
            onAdd={() => openEntity('credentials')}
            onEdit={(item) => openEntity('credentials', item)}
            onDelete={(item) => removeEntity('credentials', item)}
          />
        )}

        {tab === 'achievements' && (
          <AchievementTimeline
            achievements={profile.achievements}
            onAdd={() => openEntity('achievements')}
            onEdit={(item) => openEntity('achievements', item)}
            onDelete={(item) => removeEntity('achievements', item)}
          />
        )}

        {tab === 'graph' && <KnowledgeGraph graph={graph} loading={graphLoading} />}

        {tab === 'portfolio' && (
          <>
            <PortfolioCustomizer profile={profile} onUpdated={setProfile} />
            <PortfolioReadiness profile={profile} completeness={completeness} />
          </>
        )}
      </div>

      {editingProfile && <ProfileEditDialog open profile={profile} onClose={() => setEditingProfile(false)} onSave={saveProfile} />}
      {entityEditor && (
        <EntityDialog
          key={`${entityEditor.section}-${entityEditor.item?._id || 'new'}`}
          open
          section={entityEditor.section}
          item={entityEditor.item}
          onClose={() => setEntityEditor(null)}
          onSave={saveEntity}
          onUpload={(file) => upload(file, 'credential')}
        />
      )}
      {previewOpen && <PublicPreviewPanel onClose={() => setPreviewOpen(false)} />}
    </StudentLayout>
  )
}
