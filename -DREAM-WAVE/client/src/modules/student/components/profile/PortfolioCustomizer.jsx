import { useState } from 'react'
import { profileApi } from '@shared/services/api'

const SECTION_OPTIONS = [
  ['about', 'About'],
  ['academic', 'Academic journey'],
  ['skills', 'Skills'],
  ['projects', 'Projects'],
  ['credentials', 'Certificates'],
  ['achievements', 'Achievements'],
  ['experience', 'Experience'],
  ['career', 'Career direction'],
]

export default function PortfolioCustomizer({ profile, onUpdated }) {
  const portfolio = profile.portfolio || { sections: {}, intro: '' }
  const [intro, setIntro] = useState(portfolio.intro || '')
  const [sections, setSections] = useState({ ...portfolio.sections })
  const [featuredProjects, setFeaturedProjects] = useState(new Set((portfolio.featuredProjectIds || []).map(String)))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const toggleFeatured = (id) => {
    setFeaturedProjects((current) => {
      const next = new Set(current)
      if (next.has(String(id))) next.delete(String(id))
      else next.add(String(id))
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const { data } = await profileApi.portfolio({
        revision: profile.revision,
        intro,
        sections,
        featuredProjectIds: [...featuredProjects],
        projectOrder: profile.projects.map((item) => item._id),
      })
      onUpdated?.(data.profile)
      setMessage('Portfolio settings saved.')
    } catch (err) {
      setMessage(err.userMessage || 'Unable to save portfolio settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="identity-panel portfolio-customizer">
      <header><div><span>Curated presentation</span><h2>Portfolio engine</h2></div><strong>{profile.viewCount || 0} views</strong></header>
      <label className="portfolio-customizer__field">
        <span>Portfolio introduction</span>
        <textarea className="textarea" rows={4} value={intro} onChange={(event) => setIntro(event.target.value)} placeholder="Optional introduction for your public portfolio" />
      </label>
      <div className="portfolio-customizer__sections">
        {SECTION_OPTIONS.map(([key, label]) => (
          <label key={key}><input type="checkbox" checked={sections[key] !== false} onChange={(event) => setSections((current) => ({ ...current, [key]: event.target.checked }))} /> {label}</label>
        ))}
      </div>
      {profile.projects?.length > 0 && (
        <div className="portfolio-customizer__featured">
          <strong>Featured projects</strong>
          {profile.projects.map((project) => (
            <label key={project._id}><input type="checkbox" checked={featuredProjects.has(String(project._id))} onChange={() => toggleFeatured(project._id)} /> {project.title}</label>
          ))}
        </div>
      )}
      {message && <p className="identity-settings__message" role="status">{message}</p>}
      <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save portfolio'}</button>
    </section>
  )
}
