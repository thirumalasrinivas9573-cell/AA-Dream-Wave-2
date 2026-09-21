import { useEffect, useState } from 'react'
import { profileApi } from '@shared/services/api'

export default function PublicPreviewPanel({ onClose }) {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    profileApi.previewPublic()
      .then((response) => setPortfolio(response.data.portfolio))
      .catch((err) => setError(err.userMessage || 'Unable to load public preview.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="community-modal profile-preview-modal" role="dialog" aria-modal="true" aria-label="View as public">
      <div className="community-modal-backdrop" onClick={onClose} />
      <section className="community-modal-panel profile-preview-panel">
        <header>
          <div><strong>View as public</strong><p>Rendered with the same server-side visibility rules as your portfolio.</p></div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </header>
        {loading ? <p>Loading preview…</p> : error ? <p className="identity-error">{error}</p> : (
          <div className="profile-preview-content">
            <article className="portfolio-hero portfolio-hero--preview">
              <div className="portfolio-person">
                <div className="portfolio-avatar">{portfolio.person.profilePhoto ? <img src={portfolio.person.profilePhoto} alt="" /> : portfolio.person.displayName?.[0]}</div>
                <div><span>@{portfolio.person.username}</span><h1>{portfolio.person.displayName}</h1><h2>{portfolio.person.headline}</h2><p>{portfolio.portfolioIntro || portfolio.person.bio}</p></div>
              </div>
            </article>
            {(portfolio.skills || []).length > 0 && <section><h3>Skills</h3><div className="portfolio-skills">{portfolio.skills.slice(0, 8).map((skill) => <span key={skill._id}>{skill.name}</span>)}</div></section>}
            {(portfolio.projects || []).length > 0 && <section><h3>Projects</h3><ul>{portfolio.projects.slice(0, 4).map((project) => <li key={project._id}>{project.title}</li>)}</ul></section>}
          </div>
        )}
      </section>
    </div>
  )
}
