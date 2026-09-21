import { useState } from 'react'
import { profileApi } from '@shared/services/api'

export default function ProfileAssistantPanel({ profile, onApply }) {
  const [loading, setLoading] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  const run = async (type) => {
    setLoading(type)
    setError('')
    setPreview(null)
    try {
      let response
      if (type === 'headline') response = await profileApi.improveHeadline({ headline: profile.headline, bio: profile.bio })
      else if (type === 'about') response = await profileApi.improveAbout({ bio: profile.bio })
      else response = await profileApi.portfolioSuggestions()
      setPreview({ type, data: response.data.suggestion })
    } catch (err) {
      setError(err.userMessage || 'AI assistance unavailable.')
    } finally {
      setLoading('')
    }
  }

  const apply = () => {
    if (!preview) return
    if (preview.type === 'headline') onApply?.({ headline: preview.data.headline })
    else if (preview.type === 'about') onApply?.({ bio: preview.data.bio })
    setPreview(null)
  }

  return (
    <section className="identity-panel profile-assistant">
      <header><div><span>Preview before saving</span><h2>AI profile assistant</h2></div></header>
      <p className="profile-assistant__note">Suggestions use your existing profile facts. Nothing is published automatically.</p>
      <div className="profile-assistant__actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => run('headline')} disabled={Boolean(loading)}>{loading === 'headline' ? 'Thinking…' : 'Improve headline'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => run('about')} disabled={Boolean(loading)}>{loading === 'about' ? 'Thinking…' : 'Improve about'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => run('portfolio')} disabled={Boolean(loading)}>{loading === 'portfolio' ? 'Thinking…' : 'Portfolio suggestions'}</button>
      </div>
      {error && <p className="identity-error">{error}</p>}
      {preview?.type === 'portfolio' && (
        <ul className="profile-assistant__suggestions">
          {(preview.data.suggestions || []).map((item) => <li key={item.title}><strong>{item.title}</strong><span>{item.message}</span></li>)}
        </ul>
      )}
      {preview && preview.type !== 'portfolio' && (
        <div className="profile-assistant__preview">
          <strong>Preview</strong>
          <p>{preview.data.headline || preview.data.bio}</p>
          <div><button type="button" className="btn btn-primary btn-sm" onClick={apply}>Use suggestion</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>Dismiss</button></div>
        </div>
      )}
    </section>
  )
}
