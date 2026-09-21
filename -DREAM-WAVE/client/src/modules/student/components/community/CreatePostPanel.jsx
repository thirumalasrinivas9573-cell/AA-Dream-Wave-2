import { useState } from 'react'
import { communityApi } from '@shared/services/api'

const POST_TYPES = [
  { id: 'GENERAL', label: 'General' },
  { id: 'LEARNING_UPDATE', label: 'Learning update' },
  { id: 'PROJECT', label: 'Project' },
  { id: 'QUESTION', label: 'Question' },
  { id: 'RESOURCE', label: 'Resource' },
  { id: 'ACHIEVEMENT', label: 'Achievement' },
  { id: 'COLLABORATION', label: 'Collaboration' },
  { id: 'CAREER_UPDATE', label: 'Career update' },
]

const VISIBILITY = [
  { id: 'PUBLIC', label: 'Public' },
  { id: 'FOLLOWERS', label: 'Followers' },
  { id: 'PRIVATE', label: 'Private' },
]

export default function CreatePostPanel({ onSubmit, userName }) {
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('GENERAL')
  const [visibility, setVisibility] = useState('PUBLIC')
  const [topics, setTopics] = useState('')
  const [skills, setSkills] = useState('')
  const [media, setMedia] = useState([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [aiPreview, setAiPreview] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  const splitTags = (value) => value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8)

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { data } = await communityApi.uploadMedia(file)
      setMedia((current) => [...current, data.media].slice(0, 6))
    } catch (err) {
      setError(err.userMessage || 'Upload failed.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleAiImprove = async () => {
    if (!content.trim()) return
    setAiLoading(true)
    setError('')
    try {
      const { data } = await communityApi.improvePostDraft({
        content,
        postType,
        topics: splitTags(topics),
        skills: splitTags(skills),
      })
      setAiPreview(data.suggestion)
    } catch (err) {
      setError(err.userMessage || 'AI assistance unavailable.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSuggestTags = async () => {
    if (!content.trim()) return
    setAiLoading(true)
    try {
      const { data } = await communityApi.suggestTags({ content, postType })
      if (data.suggestion?.topics?.length) setTopics(data.suggestion.topics.join(', '))
      if (data.suggestion?.skills?.length) setSkills(data.suggestion.skills.join(', '))
    } catch {
      setError('Tag suggestions unavailable.')
    } finally {
      setAiLoading(false)
    }
  }

  const applyAiPreview = () => {
    if (!aiPreview) return
    setContent(aiPreview.content || content)
    if (aiPreview.topics?.length) setTopics(aiPreview.topics.join(', '))
    if (aiPreview.skills?.length) setSkills(aiPreview.skills.join(', '))
    setAiPreview(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    setError('')
    try {
      await onSubmit({
        content: content.trim(),
        postType,
        visibility,
        topics: splitTags(topics),
        skills: splitTags(skills),
        media,
      })
      setContent('')
      setTopics('')
      setSkills('')
      setMedia([])
      setAiPreview(null)
    } catch (err) {
      setError(err.userMessage || 'Unable to publish post.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <section className="community-create card card-purple">
      <header>
        <span className="community-avatar community-avatar--fallback">{userName?.[0]?.toUpperCase() || 'S'}</span>
        <div>
          <strong>Share learning, projects, or questions</strong>
          <p>Keep posts professional and knowledge-focused.</p>
        </div>
      </header>

      <form onSubmit={submit}>
        <textarea
          className="textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What are you learning, building, or exploring?"
          rows={4}
          aria-label="Post content"
        />

        <div className="community-create-grid">
          <label>
            Post type
            <select value={postType} onChange={(event) => setPostType(event.target.value)}>
              {POST_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Visibility
            <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
              {VISIBILITY.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Topics
            <input value={topics} onChange={(event) => setTopics(event.target.value)} placeholder="Python, React" />
          </label>
          <label>
            Skills
            <input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="API design, UI" />
          </label>
        </div>

        {media.length > 0 && (
          <div className="community-media-grid">
            {media.map((item) => (
              item.type === 'video' ? (
                <video key={item.url} controls preload="metadata" className="community-media-item">
                  <source src={item.url} type={item.mimeType || 'video/mp4'} />
                </video>
              ) : (
                <img key={item.url} src={item.url} alt="" loading="lazy" className="community-media-item" />
              )
            ))}
          </div>
        )}

        {aiPreview && (
          <div className="community-ai-preview" role="region" aria-label="AI suggestion preview">
            <strong>AI suggestion preview</strong>
            <p>{aiPreview.content}</p>
            <div className="community-ai-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={applyAiPreview}>Use suggestion</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAiPreview(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {error && <p className="community-error">{error}</p>}

        <div className="community-create-actions">
          <label className="btn btn-ghost btn-sm">
            {uploading ? 'Uploading…' : 'Add media'}
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" hidden onChange={handleUpload} />
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleSuggestTags} disabled={aiLoading}>Suggest tags</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleAiImprove} disabled={aiLoading}>
            {aiLoading ? 'Thinking…' : 'Improve with AI'}
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={posting || !content.trim()}>
            {posting ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </form>
    </section>
  )
}
