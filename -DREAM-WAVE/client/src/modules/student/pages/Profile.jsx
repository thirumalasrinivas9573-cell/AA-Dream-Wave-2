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
    profileApi.graph().then((response) => setGraph(response.data.graph)).catch((requestError) => setError(requestError.userMessage || 'Unable to load knowledge graph.')).finally(() => setGraphLoading(false))
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

  if (loading) return <StudentLayout><div className="identity-workspace"><LoadingState label="Loading your digital identity…" rows={7} /></div></StudentLayout>
  if (error && (!profile || !user)) return <StudentLayout><ErrorState title="Profile unavailable" message={error} onRetry={load} /></StudentLayout>

  return (
    <StudentLayout>
      <div className="identity-workspace">
        {error && <ErrorState title="Profile action failed" message={error} onRetry={() => setError('')} />}
        {shareMessage && <p className="identity-settings__message" role="status">{shareMessage}</p>}
        <ProfileHero user={user} profile={profile} onEdit={() => setEditingProfile(true)} onUpload={upload} uploading={uploading} onPreview={() => setPreviewOpen(true)} onShare={shareProfile} />
        <nav className="identity-tabs" role="tablist" aria-label="Profile sections">
          {PROFILE_TABS.map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)} key={id}>{label}</button>)}
        </nav>

        {tab === 'overview' && <>
          <LearningStats summary={summary} />
          <div className="identity-section-grid">
            <section className="identity-panel identity-about"><header><div><span>About</span><h2>Digital identity</h2></div><Button variant="ghost" onClick={() => setEditingProfile(true)}>Edit</Button></header><p>{profile.bio || 'Tell the Dream Wave community about your learning journey.'}</p><dl><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Phone</dt><dd>{user.phone || 'Not added'}</dd></div><div><dt>Languages</dt><dd>{profile.languages?.join(', ') || 'Not added'}</dd></div><div><dt>Dream Wave ID</dt><dd>{user.aaid}</dd></div></dl></section>
            <PortfolioReadiness profile={profile} completeness={completeness} />
          </div>
          <ProfileAssistantPanel profile={profile} onApply={saveProfile} />
          <CareerDirectionPanel careerDirection={profile.careerDirection} onEdit={() => setEditingProfile(true)} />
          <SkillsProfile skills={profile.skills.slice(0, 8)} onAdd={() => openEntity('skills')} onEdit={(item) => openEntity('skills', item)} onDelete={(item) => removeEntity('skills', item)} />
          <ProjectPortfolio projects={profile.projects.filter((item) => item.featured).slice(0, 4).length ? profile.projects.filter((item) => item.featured).slice(0, 4) : profile.projects.slice(0, 4)} onAdd={() => openEntity('projects')} onEdit={(item) => openEntity('projects', item)} onDelete={(item) => removeEntity('projects', item)} />
        </>}
        {tab === 'academic' && <>
          <AcademicJourneyPanel entries={profile.academicJourney || []} onAdd={() => openEntity('academicJourney')} onEdit={(item) => openEntity('academicJourney', item)} onDelete={(item) => removeEntity('academicJourney', item)} />
          <AcademicProfile academic={profile.academic} />
        </>}
        {tab === 'experience' && <ExperiencePanel entries={profile.experience || []} onAdd={() => openEntity('experience')} onEdit={(item) => openEntity('experience', item)} onDelete={(item) => removeEntity('experience', item)} />}
        {tab === 'learning' && <><LearningStats summary={summary} /><section className="identity-panel"><header><div><span>Growing with every activity</span><h2>Learning profile</h2></div></header><div className="learning-profile-bars">{[
          ['Goal completion', summary?.goals?.total ? summary.goals.completed / summary.goals.total * 100 : 0],
          ['Task completion', summary?.tasks?.total ? summary.tasks.completed / summary.tasks.total * 100 : 0],
          ['Books completed', summary?.books?.started ? summary.books.read / summary.books.started * 100 : 0],
          ['Roadmap completion', summary?.roadmaps?.total ? summary.roadmaps.completed / summary.roadmaps.total * 100 : 0],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{Math.round(value)}%</strong><i><b style={{ width: `${value}%` }} /></i></div>)}</div></section></>}
        {tab === 'skills' && <SkillsProfile skills={profile.skills} onAdd={() => openEntity('skills')} onEdit={(item) => openEntity('skills', item)} onDelete={(item) => removeEntity('skills', item)} />}
        {tab === 'projects' && <ProjectPortfolio projects={profile.projects} onAdd={() => openEntity('projects')} onEdit={(item) => openEntity('projects', item)} onDelete={(item) => removeEntity('projects', item)} />}
        {tab === 'credentials' && <CredentialGallery credentials={profile.credentials} onAdd={() => openEntity('credentials')} onEdit={(item) => openEntity('credentials', item)} onDelete={(item) => removeEntity('credentials', item)} />}
        {tab === 'achievements' && <AchievementTimeline achievements={profile.achievements} onAdd={() => openEntity('achievements')} onEdit={(item) => openEntity('achievements', item)} onDelete={(item) => removeEntity('achievements', item)} />}
        {tab === 'graph' && <KnowledgeGraph graph={graph} loading={graphLoading} />}
        {tab === 'portfolio' && <>
          <PortfolioCustomizer profile={profile} onUpdated={setProfile} />
          <PortfolioReadiness profile={profile} completeness={completeness} />
        </>}
      </div>

      {editingProfile && <ProfileEditDialog open profile={profile} onClose={() => setEditingProfile(false)} onSave={saveProfile} />}
      {entityEditor && <EntityDialog key={`${entityEditor.section}-${entityEditor.item?._id || 'new'}`} open section={entityEditor.section} item={entityEditor.item} onClose={() => setEntityEditor(null)} onSave={saveEntity} onUpload={(file) => upload(file, 'credential')} />}
      {previewOpen && <PublicPreviewPanel onClose={() => setPreviewOpen(false)} />}
    </StudentLayout>
  )
}
